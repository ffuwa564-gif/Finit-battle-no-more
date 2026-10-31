import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { coordinationTrial } from '../src/content/trials';
import { createInitialSave } from '../src/application/game';
import { advanceReplay, companionCommitments, createBattle, resolveRound } from '../src/domain/engine';
import { companionSignals } from '../src/domain/companion-behavior';
import { assertSaveCompatibility } from '../src/platform/save';
import type { Battle, Content } from '../src/domain/types';
function ready(ids = ['seris', 'pale-wolf']): Battle {
 let b=createBattle(content,ids,ids[0],coordinationTrial.id,0,42,'read-companions');
 while(b.phase==='playing')b=advanceReplay(b,content);
 for(const u of b.units){u.hp=u.maxHp=u.side==='party'?1000:100000;u.attack=u.side==='enemy'?0:u.characterId===ids[0]?100:10;u.defense=0;u.speed=u.side==='enemy'?0:u.characterId===ids[0]?100:20;u.cooldowns=Object.fromEntries(content.characters.find(c=>c.id===u.characterId)!.skillIds.map(id=>[id,999]));}
 b.initialUnits=structuredClone(b.units);return b;
}
const hero=(b:Battle)=>b.units.find(u=>u.side==='party'&&u.characterId===b.partyIds[0])!;
const events=(b:Battle)=>b.events.filter(e=>e.actionSelection);
function withoutLinks():Content{const c=structuredClone(content);delete c.dungeons.find(d=>d.id===coordinationTrial.id)!.coordination;return c;}
describe('read companions before committing, reveal commands afterwards',()=>{
 it('shows broad public-state signals with no skill, target or exact decision hidden in their shape',()=>{
  const b=ready(['seris','elaine','liora']);const before=structuredClone(b);const signals=companionSignals(b,content);
  expect(signals).toHaveLength(2);for(const s of signals)expect(Object.keys(s).sort()).toEqual(['actorId','cue','label']);
  const alternative=structuredClone(b);alternative.partyOrder={kind:'guard'};alternative.focusTargetId=b.units.find(u=>u.side==='enemy')!.uid;
  expect(companionSignals(alternative,content)).toEqual(signals);expect(b).toEqual(before);
  // Skill availability can change the private choice without disclosing it in the same gesture.
  b.units.find(u=>u.characterId==='elaine')!.cooldowns['heal-14']=0;hero(b).hp=400;
  const healing=companionSignals(b,content);b.units.find(u=>u.characterId==='elaine')!.cooldowns['heal-14']=999;
  expect(companionSignals(b,content)).toEqual(healing);
 });
 it('commits real companion commands without consuming random state or chasing the pilot selection',()=>{
  const b=ready();const before=structuredClone(b);const plans=companionCommitments(b,content);
  b.partyOrder={kind:'attack'};b.focusTargetId=b.units.filter(u=>u.side==='enemy')[1].uid;
  expect(companionCommitments(b,content)).toEqual(plans);expect(b.seed).toBe(before.seed);
  const result=resolveRound(b,content).battle;
  expect(events(result).find(e=>e.actorId===plans[0].actorId)?.targetIds).toEqual(plans[0].targetIds);
  expect(companionSignals(result,content)).toEqual([]);
 });
 it('boosts the later actual hit, not an earlier action that guesses the hidden answer',()=>{
  const b=ready();b.partyOrder={kind:'attack'};b.focusTargetId=b.units.find(u=>u.side==='enemy')!.uid;
  const linked=resolveRound(b,content).battle,plain=resolveRound(b,withoutLinks()).battle;
  const first=events(linked).find(e=>e.actorId===hero(b).uid)!;
  const later=events(linked).find(e=>e.actorId==='party:pale-wolf')!;
  expect(first.coordinationAction).toBeUndefined();expect(first.amount).toBe(events(plain).find(e=>e.actorId===first.actorId)!.amount);
  expect(later.coordinationAction).toBe('linked');expect(later.amount).toBe(13);
 });
 it('uses actual recipients after cover and boosts only overlapping targets of an area attack',()=>{
  const b=ready(['seris','noelle']);b.partyOrder={kind:'attack'};const enemies=b.units.filter(u=>u.side==='enemy');b.focusTargetId=enemies[0].uid;
  const noelle=b.units.find(u=>u.characterId==='noelle')!;noelle.cooldowns['area-14']=0;
  const linked=resolveRound(b,content).battle,plain=resolveRound(b,withoutLinks()).battle;
  const burst=events(linked).find(e=>e.actorId===noelle.uid)!;const baseline=events(plain).find(e=>e.actorId===noelle.uid)!;
  expect(burst.targetIds).toHaveLength(2);expect(burst.coordinationAction).toBe('linked');expect(burst.amount! - baseline.amount!).toBeGreaterThan(0);
  // Cover redirects both hits to the actual protector, which is where the chain forms.
  const cover=ready();const foes=cover.units.filter(u=>u.side==='enemy');foes[0].guardTarget=foes[1].uid;foes[0].guardUntil=99;foes[0].guardStrength=14;
  cover.partyOrder={kind:'attack'};cover.focusTargetId=foes[1].uid;
  const done=resolveRound(cover,content).battle;
  expect(events(done).find(e=>e.actorId===hero(cover).uid)!.targetIds).toEqual([foes[0].uid]);
  expect(events(done).find(e=>e.actorId==='party:pale-wolf')!.coordinationAction).toBe('linked');
 });
 it('does not impose a fixed recoil or make auto read a hidden ally answer',()=>{
  const b=ready();b.partyOrder={kind:'attack'};b.focusTargetId=b.units.filter(u=>u.side==='enemy')[1].uid;
  const different=resolveRound(b,content).battle;
  expect(events(different).filter(e=>e.actorId?.startsWith('party:')).every(e=>!e.coordinationAction)).toBe(true);
  expect(different.events.some(e=>e.coordinationAction==='isolated')).toBe(false);expect(hero(different).hp).toBeGreaterThan(990);
  const tank=ready(['liora','pale-wolf']);hero(tank).cooldowns['guard-14']=0;
  const auto=resolveRound(tank,content).battle;
  expect(events(auto).find(e=>e.actorId===hero(tank).uid)!.kind).toBe('guard'); // Real tank policy, not the partner's attack.
 });
 it('lets another patient take the heal, and makes self-defense decide survival against a warned strike',()=>{
  const b=ready(['seris','elaine','pale-wolf']);b.round=3;hero(b).hp=200;
  const healer=b.units.find(u=>u.characterId==='elaine')!,patient=b.units.find(u=>u.characterId==='pale-wolf')!;
  healer.speed=200;healer.attack=100;healer.cooldowns['heal-14']=0;patient.hp=1;patient.speed=0;
  const boss=b.units.find(u=>u.side==='enemy')!;boss.speed=150;boss.attack=150;
  expect(companionCommitments(b,content).find(i=>i.actorId===healer.uid)!.targetIds).toEqual([patient.uid]);
  const reckless=structuredClone(b);reckless.partyOrder={kind:'attack'};
  const guarded=structuredClone(b);guarded.partyOrder={kind:'guard'};
  const attack=resolveRound(reckless,content).battle,defend=resolveRound(guarded,content).battle;
  expect(events(attack).find(e=>e.actorId===healer.uid)!.targetIds).toEqual([patient.uid]);
  expect(attack.events.some(e=>e.bossStrike)).toBe(true);expect(hero(attack).hp).toBe(0);expect(hero(defend).hp).toBeGreaterThan(0);
  expect([...attack.events,...defend.events].some(e=>e.coordinationAction==='isolated')).toBe(false);
 });
 it('keeps uncertainty, solo, ordinary rules and saved replay compatibility',()=>{
  const b=ready();b.units[1].ailments={sleep:{turns:1,sourceId:b.units.find(u=>u.side==='enemy')!.uid}};
  expect(companionSignals(b,content)[0].cue).toBe('uncertain');
  const solo=ready(['seris']);expect(resolveRound(solo,content).battle.events.some(e=>e.coordinationAction)).toBe(false);
  const regular=ready();regular.dungeonId='silent-cathedral';expect(companionCommitments(regular,content)).toEqual([]);
  const snapshot=ready();snapshot.partyOrder={kind:'attack'};const result=resolveRound(snapshot,content).battle;
  expect(resolveRound(JSON.parse(JSON.stringify(snapshot)),content).battle).toEqual(result);
  const save=createInitialSave(content,42);save.partyIds=snapshot.partyIds;save.leaderId=snapshot.leaderId;save.ownedIds=[...new Set([...save.ownedIds,...snapshot.partyIds])];save.battle=result;
  expect(()=>assertSaveCompatibility(save,content)).not.toThrow();let replay=result;while(replay.phase==='playing')replay=advanceReplay(replay,content);
  expect(replay.seed).toBe(result.seed);expect(replay.pendingMaterials).toEqual({});
 });
 it('validates linked trials with visible boss pressure without relaxing other trial contracts',()=>{
  expect(validateContent(content)).toEqual([]);expect(coordinationTrial.bossStrike?.every).toBe(3);
  for(const value of [0,101]){const c=structuredClone(content);c.dungeons.find(d=>d.id===coordinationTrial.id)!.coordination!.bonusPercent=value;expect(validateContent(c).some(e=>e.includes('coordination trial'))).toBe(true);}
  const invalid=structuredClone(content);invalid.dungeons[0].coordination={bonusPercent:35};expect(validateContent(invalid).some(e=>e.includes('coordination trial'))).toBe(true);
 });
});
