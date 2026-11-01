import { describe, expect, it } from 'vitest';
import type { Battle, Unit } from '../src/domain/types';
import { plantWhiteFlower, consumeWhiteFlowerOnGuard, expireWhiteFlower, clearWhiteFlower } from '../src/domain/white-flower';

function unit(id: string, hp = 100, side: Unit['side'] = 'party'): Unit {
  return { uid: `${side}:${id}`, characterId: id, side, boss: false, hp, maxHp: 200, attack: 999, defense: 50, speed: 20, tie: 0, cooldowns: {}, ultimateCharge: 10 };
}
function fixture() {
  const pilot = unit('pilot'); const caster = unit('caster'); const enemy = unit('enemy', 100, 'enemy');
  const battle = { units: [pilot, caster, enemy], partyIds: ['pilot', 'caster'], round: 1, crystalRole: 'healer' } as Battle;
  return { battle, pilot, caster, enemy };
}

describe('摘まない白花: two deliberately spent ordinary actions', () => {
  it('plants fixed20/50 on the departure pilot, ignoring attacker stats, buffs and crystal', () => {
    const { battle, pilot, caster } = fixture(); caster.buffStrength = 999; caster.buffUntil = 99;
    expect(plantWhiteFlower(battle, caster)).toMatchObject({ targetId: pilot.uid, initialHealing: 20, planted: true });
    expect(pilot.hp).toBe(120); expect(pilot.whiteFlower).toEqual({ amount: 50, until: 3 });
    expect(consumeWhiteFlowerOnGuard(pilot, 1, true)).toEqual({ healed: 50, consumed: true });
    expect(pilot.hp).toBe(170); expect(pilot.ultimateCharge).toBe(10);
  });
  it('caps both heals and consumes excess without storing another benefit', () => {
    const { battle, pilot, caster } = fixture(); pilot.hp = 195;
    expect(plantWhiteFlower(battle, caster).initialHealing).toBe(5);
    expect(pilot.whiteFlower).toBeDefined();
    expect(consumeWhiteFlowerOnGuard(pilot, 1, true)).toEqual({ healed: 0, consumed: true });
    expect(pilot.hp).toBe(200); expect(pilot.barrier).toBeUndefined(); expect(pilot.regenUntil).toBeUndefined();
    expect(consumeWhiteFlowerOnGuard(pilot, 1, true)).toEqual({ healed: 0, consumed: false });
  });
  it('never stacks or freely refreshes an active seed, while still applying initial20', () => {
    const { battle, pilot, caster } = fixture(); plantWhiteFlower(battle, caster); battle.round = 2;
    expect(plantWhiteFlower(battle, caster)).toMatchObject({ initialHealing: 20, planted: false });
    expect(pilot.whiteFlower).toEqual({ amount: 50, until: 3 }); expect(pilot.hp).toBe(140);
  });
  it('allows guard after planting in the same round, but an earlier guard does not count retroactively', () => {
    const { battle, pilot, caster } = fixture();
    expect(consumeWhiteFlowerOnGuard(pilot, 1, true).consumed).toBe(false);
    plantWhiteFlower(battle, caster); expect(pilot.whiteFlower).toBeDefined();
    expect(consumeWhiteFlowerOnGuard(pilot, 2, true).healed).toBe(50);
  });
  it('does not interpret a defense reservation, stance, skip or any unqualified call as execution', () => {
    const { battle, pilot, caster } = fixture(); plantWhiteFlower(battle, caster);
    pilot.defendingUntil = 2; pilot.ailments = { sleep: { turns: 1, sourceId: 'enemy' } };
    expect(consumeWhiteFlowerOnGuard(pilot, 1)).toEqual({ healed: 0, consumed: false });
    expect(consumeWhiteFlowerOnGuard(pilot, 1, false)).toEqual({ healed: 0, consumed: false });
    expect(pilot.hp).toBe(120); expect(pilot.whiteFlower).toBeDefined();
  });
  it('is valid through the end ofR+2 and expires atR+3', () => {
    const a = fixture(); plantWhiteFlower(a.battle, a.caster);
    expect(expireWhiteFlower(a.pilot, 3)).toBe(false); expect(consumeWhiteFlowerOnGuard(a.pilot, 3, true).healed).toBe(50);
    const b = fixture(); plantWhiteFlower(b.battle, b.caster);
    expect(expireWhiteFlower(b.pilot, 4)).toBe(true); expect(consumeWhiteFlowerOnGuard(b.pilot, 4, true).consumed).toBe(false);
  });
  it('does not retarget a dead pilot, or allow dead/enemy casters', () => {
    const { battle, pilot, caster, enemy } = fixture(); pilot.hp = 0; pilot.whiteFlower = { amount: 50, until: 3 };
    expect(plantWhiteFlower(battle, caster).targetId).toBeUndefined(); expect(pilot.whiteFlower).toBeUndefined();
    expect(caster.hp).toBe(100); expect(caster.whiteFlower).toBeUndefined();
    pilot.hp = 100; caster.hp = 0;
    expect(plantWhiteFlower(battle, caster).planted).toBe(false); expect(plantWhiteFlower(battle, enemy).planted).toBe(false);
  });
  it('clears seeds on death and wave reset; never revives or transfers them', () => {
    const { battle, pilot, caster } = fixture(); plantWhiteFlower(battle, caster); pilot.hp = 0;
    expect(consumeWhiteFlowerOnGuard(pilot, 2, true)).toEqual({ healed: 0, consumed: false }); expect(pilot.hp).toBe(0);
    pilot.hp = 100; plantWhiteFlower(battle, caster); clearWhiteFlower(pilot);
    expect(pilot.whiteFlower).toBeUndefined(); expect(caster.whiteFlower).toBeUndefined();
  });
  it('leaves garden flowers, threads, charge, barriers and battle flags entirely independent', () => {
    const { battle, pilot, caster } = fixture(); battle.scoutState = { fioLeaderTriggered: false, rukaHeals: 2 };
    battle.blooms = { seed: 1, checked: '', flower: { id: 'flower', kind: 'heal', wave: 0, round: 1 } };
    pilot.scoutThreadUntil = 9; pilot.barrier = 7; pilot.barrierUntil = 3; pilot.regenStrength = 9; pilot.regenUntil = 4;
    const before = structuredClone({ blooms: battle.blooms, scoutState: battle.scoutState });
    plantWhiteFlower(battle, caster); consumeWhiteFlowerOnGuard(pilot, 1, true);
    expect({ blooms: battle.blooms, scoutState: battle.scoutState }).toEqual(before);
    expect(pilot).toMatchObject({ scoutThreadUntil: 9, barrier: 7, barrierUntil: 3, regenStrength: 9, regenUntil: 4, ultimateCharge: 10 });
  });
  it.each([NaN, Infinity, -5, 0, 51])('discards malformed restored seed amount%s', amount => {
    const { pilot } = fixture(); pilot.whiteFlower = { amount, until: 3 };
    expect(consumeWhiteFlowerOnGuard(pilot, 1, true).consumed).toBe(false); expect(pilot.whiteFlower).toBeUndefined();
  });
});

// Native round tests prove the helper is attached to execution, not preview defenses.
import { content } from '../src/content';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { gemSkill } from '../src/domain/memory-gems';
const labStage = { id: 'white-flower-lab', kind: 'normal' as const, name: 'white-flower-lab', subtitle: '', description: '', artId: 'cathedral', published: true, waves: [[{ characterId: 'pale-wolf', boss: true }], [{ characterId: 'pale-wolf', boss: true }]] };
const labContent = { ...content, dungeons: [...content.dungeons, labStage] };
function replay(b: Battle): Battle { while (b.phase === 'playing') { b.cursor = b.events.length - 1; b = advanceReplay(b, labContent); } return b; }
function nativeFixture() {
  const b = replay(createBattle(labContent, ['fio'], 'fio', labStage.id, 0, 58, 'white-flower-native'));
  const pilot = b.units.find(u => u.side === 'party')!; pilot.hp = 60; pilot.speed = 1000;
  const foe = b.units.find(u => u.side === 'enemy')!; foe.hp = foe.maxHp = 5000; foe.attack = 0; foe.speed = 1;
  const stone = { id: 'white-flower-test', defId: 'white-flower-seed', variant: 'pure' as const, roll: { power: 80, trait: 'none' as const, value: 0 } };
  b.memoryGems = { fio: stone }; return { b, pilot, stone };
}
describe('white flower native guard integration', () => {
  it('uses one stone action with4R cooldown, then blooms once only on an ordinary guard action', () => {
    let { b, stone } = nativeFixture(); b.partyOrder = { kind: 'skill', skillId: gemSkill(stone).id };
    b = replay(resolveRound(b, labContent).battle); let pilot = b.units.find(u => u.side === 'party')!;
    expect(pilot.whiteFlower).toEqual({ amount: 50, until: 3 }); expect(pilot.cooldowns[gemSkill(stone).id]).toBe(5);
    const before = pilot.hp; b.partyOrder = { kind: 'guard' }; const result = resolveRound(b, labContent).battle;
    pilot = result.units.find(u => u.side === 'party')!;
    expect(pilot.whiteFlower).toBeUndefined();
    const event = result.events.find(e => e.kind === 'heal' && e.text.includes('白花'));
    expect(event?.amount).toBe(50); expect(event?.unitsAfter?.find(u => u.uid === pilot.uid)?.hp).toBe(before + 50);
    expect(result.scoutState?.fioLeaderTriggered).not.toBe(true);
  });
  it('a sleeping pilot can reserve guard but cannot bloom until she really acts', () => {
    let { b, pilot } = nativeFixture(); plantWhiteFlower(b, pilot);
    pilot.ailments = { sleep: { turns: 1, sourceId: 'enemy:pale-wolf' } }; b.partyOrder = { kind: 'guard' };
    const result = resolveRound(b, labContent).battle; pilot = result.units.find(u => u.side === 'party')!;
    expect(result.events.some(e => e.statusAction === 'skip')).toBe(true);
    expect(pilot.whiteFlower).toBeDefined(); expect(result.events.some(e => e.kind === 'heal' && e.text.includes('白花'))).toBe(false);
  });
  it.each(['attack', 'ultimate'] as const)('does not consume on a real%s action or round-end regeneration', kind => {
    const { b, pilot } = nativeFixture(); plantWhiteFlower(b, pilot); pilot.ultimateCharge = 100;
    pilot.regenStrength = 10; pilot.regenUntil = 3; b.partyOrder = { kind };
    const result = resolveRound(b, labContent).battle;
    expect(result.units.find(u => u.side === 'party')!.whiteFlower).toEqual({ amount: 50, until: 3 });
    expect(result.events.some(e => e.kind === 'heal' && e.text.includes('摘まない白花'))).toBe(false);
  });
  it('clears the seed on a lethal enemy hit instead of reviving or transferring it', () => {
    const { b, pilot } = nativeFixture(); plantWhiteFlower(b, pilot); b.partyOrder = { kind: 'attack' };
    const foe = b.units.find(u => u.side === 'enemy')!; foe.attack = 99999;
    const result = resolveRound(b, labContent).battle; const dead = result.units.find(u => u.side === 'party')!;
    expect(dead.hp).toBe(0); expect(dead.whiteFlower).toBeUndefined();
  });
  it('clears seeds at a wave transition without changing HP', () => {
    let { b, pilot } = nativeFixture(); plantWhiteFlower(b, pilot); const hp = pilot.hp;
    b.phase = 'playing'; b.nextPhase = 'wave'; b.events = []; b.cursor = -1; b = advanceReplay(b, labContent);
    pilot = b.units.find(u => u.side === 'party')!; expect(pilot.whiteFlower).toBeUndefined(); expect(pilot.hp).toBe(hp);
  });
});
