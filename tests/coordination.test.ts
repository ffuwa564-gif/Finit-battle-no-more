import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { coordinationTrial } from '../src/content/trials';
import { createInitialSave } from '../src/application/game';
import { advanceReplay, coordinationPlan, createBattle, resolveRound } from '../src/domain/engine';
import { assertSaveCompatibility } from '../src/platform/save';
import type { Battle, Content } from '../src/domain/types';

function ready(ids = ['seris', 'pale-wolf'], seed = 42): Battle {
  let b = createBattle(content, ids, ids[0], coordinationTrial.id, 0, seed, 'coordination-test');
  while (b.phase === 'playing') b = advanceReplay(b, content);
  for (const u of b.units) {
    u.hp = u.maxHp = u.side === 'party' ? 1000 : 100000;
    u.attack = u.side === 'enemy' ? 0 : u.characterId === ids[0] ? 100 : 10;
    u.defense = 0; u.speed = u.side === 'enemy' ? 0 : u.characterId === ids[0] ? 100 : 20;
    u.cooldowns = Object.fromEntries(content.characters.find(c => c.id === u.characterId)!.skillIds.map(id => [id, 999]));
  }
  b.initialUnits = structuredClone(b.units);
  return b;
}
const pilot = (b: Battle) => b.units.find(u => u.side === 'party' && u.characterId === b.partyIds[0])!;
const action = (b: Battle) => b.events.find(e => e.actionSelection && e.actorId === pilot(b).uid)!;
const recoil = (b: Battle) => b.events.filter(e => e.coordinationAction === 'isolated');
function plainContent(): Content {
  const c = structuredClone(content); delete c.dungeons.find(d => d.id === coordinationTrial.id)!.coordination; return c;
}

describe('declared ally coordination', () => {
  it('reveals deterministic intentions without changing the save or consuming random state', () => {
    const b = ready(['seris', 'pale-wolf', 'elaine']); const before = structuredClone(b);
    const first = coordinationPlan(b, content)!;
    expect(first.partnerId).toBe('party:pale-wolf'); expect(first.mode).toBe('strike');
    expect(first.targetIds.length).toBeGreaterThan(0);
    expect(coordinationPlan(JSON.parse(JSON.stringify(b)), content)).toEqual(first);
    expect(b).toEqual(before);
    b.round = 2; expect(coordinationPlan(b, content)!.partnerId).toBe('party:elaine');
  });
  it('rewards matching the declared target, but punishes a different target with a real HP loss', () => {
    const b = ready(); const plan = coordinationPlan(b, content)!;
    b.partyOrder = { kind: 'attack' }; b.focusTargetId = plan.targetIds[0];
    const linked = resolveRound(b, content).battle;
    const ordinary = resolveRound(b, plainContent()).battle;
    expect(action(linked).coordinationAction).toBe('linked');
    expect(action(linked).amount).toBeGreaterThan(action(ordinary).amount!);
    expect(recoil(linked)).toHaveLength(0);
    const wrong = structuredClone(b); wrong.focusTargetId = b.units.find(u => u.side === 'enemy' && !plan.targetIds.includes(u.uid))!.uid;
    const isolated = resolveRound(wrong, content).battle;
    expect(recoil(isolated).length).toBeGreaterThan(0);
    expect(pilot(isolated).hp).toBeLessThan(pilot(linked).hp - pilot(b).maxHp * .3);
    expect(pilot(isolated).hp).toBeGreaterThan(0);
    expect(recoil(isolated).at(-1)!.targetIds).toContain(pilot(b).uid);
  });
  it('lets barriers, defense and an existing guard mitigate the actual recoil rather than bypassing protection', () => {
    const b = ready(['seris', 'pale-wolf', 'liora']); const plan = coordinationPlan(b, content)!;
    b.partyOrder = { kind: 'attack' }; b.focusTargetId = b.units.find(u => u.side === 'enemy' && !plan.targetIds.includes(u.uid))!.uid;
    const baseline = resolveRound(b, content).battle;
    const shielded = structuredClone(b); pilot(shielded).barrier = 600; pilot(shielded).barrierUntil = 9;
    const barrier = resolveRound(shielded, content).battle;
    expect(pilot(barrier).hp).toBeGreaterThan(pilot(baseline).hp);
    expect(recoil(barrier)).toHaveLength(1); expect(recoil(barrier)[0].amount).toBe(0);
    const armored = structuredClone(b); pilot(armored).defense = 400;
    expect(recoil(resolveRound(armored, content).battle)[0].amount).toBeLessThan(recoil(baseline)[0].amount!);
    const guarded = structuredClone(b); const tank = guarded.units.find(u => u.characterId === 'liora')!;
    tank.guardTarget = pilot(guarded).uid; tank.guardUntil = 9; tank.guardStrength = 14;
    const cover = resolveRound(guarded, content).battle;
    expect(recoil(cover)[0].targetIds).toEqual([tank.uid]); expect(pilot(cover).hp).toBeGreaterThan(pilot(baseline).hp);
  });
  it('treats area attacks containing the declared target as coordination and keeps recovery safe', () => {
    const area = ready(['noelle', 'pale-wolf']); pilot(area).cooldowns['area-14'] = 0;
    area.partyOrder = { kind: 'skill', skillId: 'area-14' };
    const burst = resolveRound(area, content).battle;
    expect(action(burst).coordinationAction).toBe('linked'); expect(action(burst).targetIds).toHaveLength(2);
    expect(recoil(burst)).toHaveLength(0);
    const healing = ready(['elaine', 'pale-wolf']); pilot(healing).hp = 400; pilot(healing).cooldowns['heal-14'] = 0;
    healing.partyOrder = { kind: 'skill', skillId: 'heal-14' };
    const healed = resolveRound(healing, content).battle;
    expect(action(healed).kind).toBe('heal'); expect(pilot(healed).hp).toBeGreaterThan(400);
    expect(recoil(healed)).toHaveLength(0);
  });
  it('warns when the ally is supporting, lets the pilot defend safely, and gives auto a safe default', () => {
    const b = ready(['seris', 'elaine']); pilot(b).hp = 500;
    b.units.find(u => u.characterId === 'elaine')!.cooldowns['heal-14'] = 0;
    expect(coordinationPlan(b, content)!.mode).toBe('shelter');
    const auto = resolveRound(b, content).battle;
    expect(action(auto).kind).toBe('guard'); expect(recoil(auto)).toHaveLength(0);
    const attack = structuredClone(b); attack.partyOrder = { kind: 'attack' };
    const isolated = resolveRound(attack, content).battle; expect(recoil(isolated).length).toBeGreaterThan(0);
    const guard = structuredClone(b); guard.partyOrder = { kind: 'guard' };
    expect(recoil(resolveRound(guard, content).battle)).toHaveLength(0);
    const strike = ready(); const plan = coordinationPlan(strike, content)!;
    expect(action(resolveRound(strike, content).battle).targetIds).toEqual(plan.targetIds);
  });
  it('does not retroactively punish a partner killed before acting or a target defeated before the pilot acts', () => {
    const killed = ready(); const plan = coordinationPlan(killed, content)!;
    const partner = killed.units.find(u => u.uid === plan.partnerId)!; partner.hp = 1;
    const enemy = killed.units.find(u => u.side === 'enemy')!; enemy.speed = 200; enemy.attack = 5000;
    killed.partyOrder = { kind: 'attack' }; killed.focusTargetId = killed.units.find(u => u.side === 'enemy' && !plan.targetIds.includes(u.uid))!.uid;
    const lostPartner = resolveRound(killed, content).battle;
    expect(lostPartner.units.find(u => u.uid === partner.uid)!.hp).toBe(0); expect(recoil(lostPartner)).toHaveLength(0);
    // A faster partner can act and then fall before the pilot; this is still an interrupted link.
    const afterActing = ready(); const latePlan = coordinationPlan(afterActing, content)!;
    const latePartner = afterActing.units.find(u => u.uid === latePlan.partnerId)!; latePartner.hp = 1; latePartner.speed = 200;
    pilot(afterActing).hp = pilot(afterActing).maxHp = 100000; pilot(afterActing).speed = 50;
    const attacker = afterActing.units.find(u => u.side === 'enemy')!; attacker.speed = 100; attacker.attack = 1000;
    afterActing.partyOrder = { kind: 'attack' }; afterActing.focusTargetId = afterActing.units.find(u => u.side === 'enemy' && !latePlan.targetIds.includes(u.uid))!.uid;
    const interruptedAfter = resolveRound(afterActing, content).battle;
    expect(interruptedAfter.events.some(e => e.actionSelection && e.actorId === latePartner.uid)).toBe(true);
    expect(interruptedAfter.units.find(u => u.uid === latePartner.uid)!.hp).toBe(0);
    expect(recoil(interruptedAfter)).toHaveLength(0);
    const defeated = ready(['seris', 'pale-wolf', 'nox']); pilot(defeated).speed = 1;
    const low = defeated.units.find(u => u.side === 'enemy')!; low.hp = 1;
    const finisher = defeated.units.find(u => u.characterId === 'nox')!; finisher.speed = 200; finisher.attack = 200;
    const target = coordinationPlan(defeated, content)!.targetIds[0]; expect(target).toBe(low.uid);
    defeated.partyOrder = { kind: 'attack' }; defeated.focusTargetId = defeated.units.find(u => u.side === 'enemy' && u.uid !== target)!.uid;
    const finished = resolveRound(defeated, content).battle;
    expect(finished.units.find(u => u.uid === target)!.hp).toBe(0); expect(recoil(finished)).toHaveLength(0);
  });
  it('waives isolation when an enemy interrupts the promised partner with sleep', () => {
    const c = structuredClone(content); const caster = c.characters.find(u => u.id === 'athena')!;
    caster.role = 'debuffer'; caster.skillIds = ['sleep-14', 'attack-14'];
    let interrupted: Battle | undefined;
    for (let seed = 1; seed <= 30 && !interrupted; seed++) {
      const b = ready(undefined, seed); const plan = coordinationPlan(b, c)!;
      const partner = b.units.find(u => u.uid === plan.partnerId)!; partner.attack = 500;
      const enemy = b.units.find(u => u.characterId === 'athena')!; enemy.cooldowns = {}; enemy.speed = 200;
      b.partyOrder = { kind: 'attack' }; b.focusTargetId = b.units.find(u => u.side === 'enemy' && !plan.targetIds.includes(u.uid))!.uid;
      const done = resolveRound(b, c).battle;
      if (done.events.some(e => e.actorId === partner.uid && e.statusAction === 'skip' && e.ailment === 'sleep')) interrupted = done;
    }
    expect(interrupted).toBeDefined(); expect(recoil(interrupted!)).toHaveLength(0);
  });
  it('keeps solo and other dungeons unchanged and preserves replay/save compatibility', () => {
    const solo = ready(['seris']); expect(coordinationPlan(solo, content)).toBeUndefined();
    const defeatedPilot = ready(); pilot(defeatedPilot).hp = 0; expect(coordinationPlan(defeatedPilot, content)).toBeUndefined();
    solo.partyOrder = { kind: 'attack' };
    expect(resolveRound(solo, content).battle).toEqual(resolveRound(solo, plainContent()).battle);
    const ordinary = ready(); ordinary.dungeonId = 'silent-cathedral';
    expect(coordinationPlan(ordinary, content)).toBeUndefined();
    expect(resolveRound(ordinary, content).battle.events.every(e => !e.coordinationAction)).toBe(true);
    const b = ready(); b.partyOrder = { kind: 'attack' };
    const resolved = resolveRound(b, content).battle;
    expect(resolveRound(JSON.parse(JSON.stringify(b)), content).battle).toEqual(resolved);
    const save = createInitialSave(content, 42); save.partyIds = b.partyIds; save.leaderId = b.leaderId;
    save.ownedIds = [...new Set([...save.ownedIds, ...b.partyIds])]; save.battle = resolved;
    expect(() => assertSaveCompatibility(save, content)).not.toThrow();
    let replay = resolved; while (replay.phase === 'playing') replay = advanceReplay(replay, content);
    expect(replay.seed).toBe(resolved.seed); expect(replay.pendingMaterials).toEqual({});
  });
  it('validates the new trial bounds without relaxing ordinary trial constraints', () => {
    expect(validateContent(content)).toEqual([]);
    for (const patch of [{ recoilPercent: 61 }, { recoilPercent: 9 }, { bonusPercent: 0 }, { bonusPercent: 101 }]) {
      const c = structuredClone(content); Object.assign(c.dungeons.find(d => d.id === coordinationTrial.id)!.coordination!, patch);
      expect(validateContent(c).some(e => e.includes('coordination trial'))).toBe(true);
    }
    const bad = structuredClone(content); const stage = bad.dungeons.find(d => d.id === coordinationTrial.id)!;
    stage.bossStrike = { every: 3, power: 200, name: '不正な共存' };
    expect(validateContent(bad).some(e => e.includes('coordination trial'))).toBe(true);
    const normal = structuredClone(content); normal.dungeons[0].coordination = { recoilPercent: 40, bonusPercent: 35 };
    expect(validateContent(normal).some(e => e.includes('coordination trial'))).toBe(true);
    const broken = structuredClone(content); delete broken.dungeons.find(d => d.id === coordinationTrial.id)!.coordination;
    expect(validateContent(broken).some(e => e.includes('sequential SSR goddess'))).toBe(true);
  });
});
