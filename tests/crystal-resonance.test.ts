import { describe, expect, it } from 'vitest';
import { createBattle, advanceReplay, resolveRound } from '../src/domain/engine';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import type { Battle, CharacterDef, Content, Role, SkillTemplate } from '../src/domain/types';
const def = (id: string, role: Role, skills: string[]): CharacterDef => ({ id, name:id, epithet:'', flavor:'', speciesId:'ashen', role, strength:10, leaderStat:'hp', skillIds:skills, portraitId:'test', artId:'test', origin:['initial'], rarity:'R', published:true, soundProfile:'test' });
function fixture(role: Role, template: SkillTemplate) {
  const c: Content={appVersion:'test',contentVersion:'test',rulesVersion:'test',schemaVersion:1,assets:[],species:[{id:'ashen',name:'ashen'}],skills:[{id:'skill',name:'skill',template,strength:10,soundProfile:'test'}],characters:[def('actor',role,['skill']),def('friend','healer',[]),def('foe','attacker',[])],dungeons:[{id:'d',name:'',subtitle:'',description:'',artId:'',published:true,waves:[[{characterId:'foe'}],[{characterId:'foe'}]]}]};
  let b=createBattle(c,['actor','friend'],'actor','d',2,42,'crystal-test');while(b.phase==='playing')b=advanceReplay(b,c);
  for(const u of b.units){u.hp=u.maxHp=u.side==='enemy'?100000:1000;u.attack=u.characterId==='actor'?100:0;u.defense=u.characterId==='actor'?40:0;u.speed=u.characterId==='actor'?100:u.side==='party'?0:-1;}
  b.units[1].hp=100;
  return {c,b};
}
function first(b: Battle,c: Content){return resolveRound(b,c).battle.events.find(e=>e.actorId==='party:actor'&&!e.statusAction)!;}
const unit=(event: ReturnType<typeof first>,id='party:friend')=>event.unitsAfter!.find(u=>u.uid===id)!;
describe('selected crystal role',()=>{
  it.each([['attacker','attack'],['area_attacker','area']] as const)('increases %s skill damage without changing enemy damage or cooldowns', (role,template)=>{
    const {b,c}=fixture(role,template),plain=resolveRound(b,c).battle;b.crystalRole=role;const boosted=resolveRound(b,c).battle;
    expect(boosted.events[0].amount).toBe(Math.floor(plain.events[0].amount!*1.2));
    expect(boosted.units.find(u=>u.side==='enemy')!.cooldowns).toEqual(plain.units.find(u=>u.side==='enemy')!.cooldowns);
    expect(boosted.events.find(e=>e.actorId?.startsWith('enemy:'))?.amount).toBe(plain.events.find(e=>e.actorId?.startsWith('enemy:'))?.amount);
    expect(boosted.units[0].cooldowns).toEqual(plain.units[0].cooldowns);
    b.crystalRole='healer';expect(first(b,c).amount).toBe(plain.events[0].amount);
  });
  it('scales healing and barriers, and stores stronger guard and regeneration effects',()=>{
    for(const [role,template]of [['healer','heal'],['tank','barrier'],['tank','guard'],['healer','regen']]as const){
      const {b,c}=fixture(role,template),plain=first(b,c);b.crystalRole=role;const boosted=first(b,c);
      if(template==='heal')expect(boosted.amount).toBe(Math.floor(plain.amount!*1.2));
      if(template==='barrier')expect(unit(boosted).barrier).toBe(Math.floor(unit(plain).barrier!*1.2));
      if(template==='guard')expect(unit(boosted,'party:actor').guardStrength).toBe(18);
      if(template==='regen')expect(unit(boosted).regenStrength).toBe(20);
      expect(unit(boosted).regenUntil).toBe(unit(plain).regenUntil);
    }
  });
  it('boosts the effective buff/debuff percentage, not just encoded skill strength',()=>{
    for(const [role,template]of [['supporter','buff'],['debuffer','debuff']]as const){
      const {b,c}=fixture(role,template);b.crystalRole=role;const e=first(b,c);
      const target=e.unitsAfter!.find(u=>u.uid===e.targetIds![0])!;
      expect(template==='buff'?target.buffStrength:target.debuffStrength).toBe(18);
      expect(template==='buff'?target.buffUntil:target.debuffUntil).toBe(2);
    }
  });
  it('increases ailment chance relatively, keeps boss duration and wards intact',()=>{
    for(const boss of [false,true]){
      const {b,c}=fixture('debuffer','sleep');const foe=b.units.find(u=>u.side==='enemy')!;foe.boss=boss;b.seed=boss?400:1500;
      const plain=resolveRound(b,c).battle.events.find(e=>e.actorId==='party:actor')!;expect(plain.statusAction).toBe('resist');
      b.crystalRole='debuffer';const e=resolveRound(b,c).battle.events.find(e=>e.actorId==='party:actor')!;expect(e.statusAction).toBe('inflict');
      expect(unit(e,foe.uid).ailments!.sleep!.turns).toBe(boss?1:2);
      foe.statusWardUntil=10;expect(resolveRound(b,c).battle.events.find(e=>e.actorId==='party:actor')!.statusAction).not.toBe('inflict');
    }
  });
  it.each(['healer','tank','attacker','area_attacker','supporter','debuffer'] as const)('applies %s resonance to its Ultimate',role=>{
    const {b,c}=fixture(role,'attack');b.units[0].ultimateCharge=100;b.units[0].ultimateQueued=true;
    const plain=first(b,c);b.crystalRole=role;const boosted=first(b,c);
    if(['attacker','area_attacker','debuffer'].includes(role))expect(boosted.amount).toBe(Math.floor(plain.amount!*1.2));
    if(role==='healer')expect(boosted.amount).toBe(480);
    if(role==='tank'||role==='supporter')expect(unit(boosted).barrier).toBe(Math.floor(unit(plain).barrier!*1.2));
    if(role==='supporter')expect(unit(boosted).buffStrength).toBe(66);
    if(role==='debuffer')expect(unit(boosted,'enemy:w0:0:foe').debuffStrength).toBe(54);
    expect(unit(boosted,'party:actor').ultimateCharge).toBe(0);
  });
  it('does not empower status-forced friendly attacks',()=>{
    const {b,c}=fixture('attacker','attack');b.units[0].ailments={charm:{turns:2,sourceId:'enemy:w0:0:foe'}};
    const plain=resolveRound(b,c).battle;b.crystalRole='attacker';const boosted=resolveRound(b,c).battle;
    expect(boosted.events.find(e=>e.actorId==='party:actor')!.amount).toBe(plain.events.find(e=>e.actorId==='party:actor')!.amount);
  });
  it('persists one non-stacking choice, preserves resources, rejects invalid/busy choices and accepts legacy saves',()=>{
    let save=createInitialSave(content,42);save.battle=createBattle(content,save.partyIds,save.leaderId,'silent-cathedral',2,42,'crystal-save');
    while(save.battle!.phase==='playing')save=applyCommand(save,{type:'replay'},content);
    const before=structuredClone(save);const selected=applyCommand(save,{type:'crystalRole',role:'healer'},content);
    expect(save).toEqual(before);expect(selected.battle).toEqual({...before.battle,crystalRole:'healer'});expect(selected.seed).toBe(before.seed);expect(selected.potions).toBe(before.potions);
    assertSaveCompatibility(JSON.parse(JSON.stringify(selected)),content);assertSaveCompatibility(before,content);
    const changed=applyCommand(selected,{type:'crystalRole',role:'tank'},content);expect(changed.battle!.crystalRole).toBe('tank');
    expect(applyCommand(changed,{type:'crystalRole',role:null},content).battle!.crystalRole).toBeUndefined();
    const bad=structuredClone(selected);(bad.battle as unknown as {crystalRole:string}).crystalRole='invalid';expect(()=>assertValidSave(bad)).toThrow('宝石');
    expect(()=>applyCommand(save,{type:'crystalRole',role:'debuffer'},content)).toThrow('役割');
    selected.battle!.phase='playing';expect(()=>applyCommand(selected,{type:'crystalRole',role:'tank'},content)).toThrow();
    const b=structuredClone(changed.battle!);b.phase='playing';b.cursor=b.events.length;b.nextPhase='wave';expect(advanceReplay(b,content).crystalRole).toBe('tank');
  });
});
