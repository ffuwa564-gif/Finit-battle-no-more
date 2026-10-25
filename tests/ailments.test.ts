import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { ailments } from '../src/domain/ailments';
import { createInitialSave } from '../src/application/game';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import { hpChanges } from '../src/platform/combat-feedback';
import { tr } from '../src/locales/i18n';
import type { Ailment, Battle } from '../src/domain/types';

function ready(b: Battle): Battle { while (b.phase === 'playing') b = advanceReplay(b, content); return b; }
function fixture(ids = ['seris', 'liora']): Battle {
  const b = ready(createBattle(content, ids, ids[0]!, 'silent-cathedral', 0, 42, 'ailments'));
  b.units = [...b.units.filter(u => u.side === 'party'), b.units.find(u => u.side === 'enemy')!];
  for (const u of b.units) {
    u.hp = u.maxHp = 1000; u.attack = 20; u.defense = 0; u.speed = 0;
    u.cooldowns = Object.fromEntries(content.characters.find(c => c.id === u.characterId)!.skillIds.map(id => [id, 99]));
  }
  b.units[0]!.speed = 100; b.initialUnits = structuredClone(b.units); return b;
}
function afflict(b: Battle, id: Ailment, turns = 2) {
  const hero = b.units[0]!; hero.ailments = { [id]: { turns, sourceId: b.units.at(-1)!.uid } }; return hero;
}
const casts = { confusion: 'seoritsu', sleep: 'persephone', paralysis: 'mizuhanome', charm: 'iris' } as const;
function cast(id: Ailment, seed: number, boss = false) {
  const b = fixture([casts[id]]); b.seed = seed; b.units[0]!.cooldowns[`${id}-` + content.characters.find(c=>c.id===casts[id])!.strength] = 0;
  b.units.at(-1)!.boss = boss;
  return resolveRound(b, content).battle.events.find(e=>e.statusAction === 'inflict' || e.statusAction === 'resist')!;
}

describe('control ailments', () => {
  it('casts all four real skills, with 70% normal and 35% boss chances, shorter boss duration, and translated logs', () => {
    for (const id of ailments) {
      let normal = 0, bosses = 0;
      for (let n=0;n<200;n++) {
        const seed = Math.imul(n+1, 2654435761) >>> 0;
        for (const boss of [false,true]) {
          const event = cast(id, seed, boss); expect(event).toBeDefined();
          expect(tr(event.text,'en')).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
          if (event.statusAction === 'inflict') {
            if(boss) bosses++; else normal++;
            expect(event.unitsAfter!.find(u=>u.side==='enemy')!.ailments![id]!.turns).toBe(boss?1:2);
          }
        }
      }
      expect(normal).toBeGreaterThan(125);expect(normal).toBeLessThan(155);
      expect(bosses).toBeGreaterThan(55);expect(bosses).toBeLessThan(85);
    }
  });
  it('sleep blocks exactly two actions, ages without changing the input, and grants recovery immunity', () => {
    let b=fixture(['seris']); const hero=afflict(b,'sleep'); hero.barrier=1000;hero.barrierUntil=99;
    const original=structuredClone(b);
    for(let n=1;n<=2;n++) {
      const out=resolveRound(b,content).battle; expect(out.events.some(e=>e.actorId===hero.uid&&e.statusAction==='skip')).toBe(true);
      expect(out.units[0]!.ailments?.sleep?.turns).toBe(n===1?1:undefined);
      b=ready(out);
    }
    expect(original.units[0]!.ailments!.sleep!.turns).toBe(2); expect(b.units[0]!.statusWardUntil).toBe(3);
    expect(b.events.filter(e=>e.ailment==='sleep'&&e.statusAction==='recover')).toHaveLength(1);
  });
  it('HP damage wakes sleep before the victim acts while a full barrier absorption does not', () => {
    for(const shield of [false,true]) {
      const b=fixture(['seris']); const hero=afflict(b,'sleep');b.units.at(-1)!.speed=200;
      if(shield){hero.barrier=1000;hero.barrierUntil=99;}
      const out=resolveRound(b,content).battle;
      expect(out.events.some(e=>e.actorId===hero.uid&&e.statusAction==='skip')).toBe(shield);
      const hit=out.events.find(e=>e.kind==='attack')!;
      expect(hpChanges(b.units,hit.unitsAfter!).filter(c=>c.amount<0).reduce((sum,c)=>sum-c.amount,0)).toBe(hit.amount);
      expect(out.events.filter(e=>e.ailment==='sleep'&&e.statusAction==='recover')).toHaveLength(shield?0:1);
    }
  });
  it('paralysis can skip or permit actions and always resumes deterministically from the saved seed', () => {
    let skipped=0;
    for(let n=0;n<200;n++) {
      const b=fixture();afflict(b,'paralysis');b.seed=Math.imul(n+1,2654435761)>>>0;
      const out=resolveRound(b,content); expect(out).toEqual(resolveRound(JSON.parse(JSON.stringify(b)),content));
      skipped+=Number(out.battle.events.some(e=>e.actorId===b.units[0]!.uid&&e.statusAction==='skip'));
      expect(out.battle.units[0]!.ailments!.paralysis!.turns).toBe(1);
    }
    expect(skipped).toBeGreaterThan(65);expect(skipped).toBeLessThan(95);
  });
  it('confusion uses ordinary attacks against self, allies, or enemies instead of skills', () => {
    const hit=new Set<string>();
    for(let n=0;n<100;n++) {
      const b=fixture();const hero=afflict(b,'confusion');hero.cooldowns={};b.seed=Math.imul(n+1,2654435761)>>>0;
      const action=resolveRound(b,content).battle.events.find(e=>e.actorId===hero.uid&&e.kind==='attack')!;
      expect(action.skillId).toBeUndefined();hit.add(action.targetIds![0]!);
    }
    expect(hit).toEqual(new Set(fixture().units.map(u=>u.uid)));
  });
  it('charm attacks another ally, skips when alone, and ends when its caster falls', () => {
    const b=fixture();const hero=afflict(b,'charm');
    const action=resolveRound(b,content).battle.events.find(e=>e.actorId===hero.uid)!;
    expect(action.targetIds).toEqual([b.units[1]!.uid]);expect(action.statusAction).toBe('friendly_fire');expect(action.skillId).toBeUndefined();
    const solo=fixture(['seris']);afflict(solo,'charm');expect(resolveRound(solo,content).battle.events[0]!.statusAction).toBe('skip');
    const fallen=fixture();afflict(fallen,'charm');fallen.units.at(-1)!.hp=0;
    fallen.units.push({...structuredClone(fallen.units.at(-1)!),uid:'enemy:other',hp:1000});
    const out=resolveRound(fallen,content).battle;
    expect(out.events[0]!.statusAction).toBe('recover');expect(out.events.find(e=>e.kind==='attack')!.targetIds).toEqual(['enemy:other']);
  });
  it('cleanse prioritizes controlled allies and clears all ailments and reduced defense at once', () => {
    const b=fixture(['elaine','seris']);const healer=b.units[0]!,victim=b.units[1]!;
    healer.cooldowns['cleanse-14']=0;victim.debuffUntil=9;victim.debuffStrength=14;
    victim.ailments=Object.fromEntries(ailments.map(id=>[id,{turns:2,sourceId:b.units.at(-1)!.uid}]));
    const out=resolveRound(b,content).battle;const cure=out.events[0]!;
    expect(cure.skillId).toBe('cleanse-14');expect(cure.targetIds).toEqual([victim.uid]);
    const state=cure.unitsAfter!.find(u=>u.uid===victim.uid)!;expect(state.ailments).toBeUndefined();expect(state.debuffUntil).toBeUndefined();expect(state.statusWardUntil).toBe(2);
    expect(out.events.filter(e=>e.statusAction==='recover')).toHaveLength(4);
  });
  it('AI avoids reapplying during immunity without spending the ailment cooldown', () => {
    const b=fixture(['persephone']);b.units[0]!.cooldowns['sleep-17']=0;b.units.at(-1)!.statusWardUntil=2;
    const out=resolveRound(b,content).battle;expect(out.events.some(e=>e.skillId==='sleep-17')).toBe(false);expect(out.units[0]!.cooldowns['sleep-17']).toBe(0);
  });
  it('ordinary targeting preserves sleep when another enemy can be attacked', () => {
    const b=fixture(['seris']);const sleeper=b.units.at(-1)!;sleeper.hp=100;
    sleeper.ailments={sleep:{turns:2,sourceId:b.units[0]!.uid}};
    b.units.push({...structuredClone(sleeper),uid:'enemy:awake',hp:1000,ailments:undefined});
    const attack=resolveRound(b,content).battle.events.find(e=>e.actorId===b.units[0]!.uid&&e.kind==='attack')!;
    expect(attack.targetIds).toEqual(['enemy:awake']);
    expect(attack.unitsAfter!.find(u=>u.uid===sleeper.uid)!.ailments?.sleep).toBeDefined();
  });
  it('preserves ailment snapshots and HP through save/replay and rejects malformed states', () => {
    const b=fixture();afflict(b,'confusion');const save=createInitialSave(content);save.battle=resolveRound(b,content).battle;
    assertSaveCompatibility(JSON.parse(JSON.stringify(save)),content);const out=ready(structuredClone(save.battle));expect(out.units).toEqual(save.battle.units);
    for(const patch of [{turns:0,sourceId:'bad'},{turns:99,sourceId:'bad'},{turns:1,sourceId:''}]){
      const bad=structuredClone(save);bad.battle!.units[0]!.ailments={sleep:patch};expect(()=>assertValidSave(bad)).toThrow();
    }
    const bad=structuredClone(save);bad.battle!.units[0]!.ailments={sleep:{turns:1,sourceId:'missing'}};expect(()=>assertSaveCompatibility(bad,content)).toThrow('付与者');
  });
  it('clears old ailments and immunity when opening a new wave', () => {
    const b=fixture();afflict(b,'sleep');b.units[0]!.statusWardUntil=9;b.phase='playing';b.events=[];b.cursor=0;b.nextPhase='wave';
    const next=advanceReplay(b,content);expect(next.units[0]!.ailments).toBeUndefined();expect(next.units[0]!.statusWardUntil).toBeUndefined();
  });
});
