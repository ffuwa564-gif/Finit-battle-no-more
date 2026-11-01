import { describe, expect, it } from 'vitest';
import { applyCommand, createInitialSave } from '../src/application/game';
import { content } from '../src/content';
import type { GameSave } from '../src/domain/types';
import { gemSkill } from '../src/domain/memory-gems';
import { assertSaveCompatibility } from '../src/platform/save';
import { decodeBackup, encodeBackup } from '../src/platform/save-backup';

function settle(input: GameSave): GameSave {
  let save = input;
  for(let i=0;i<500 && save.battle?.phase==='playing';i++) save=applyCommand(save,{type:'replay'},content);
  expect(save.battle?.phase).toBe('ready');
  return save;
}
function prepared(ids=['elaine','noelle','liora','lisette'], leader='noelle'): GameSave {
  const initial=createInitialSave(content,19283);
  initial.ownedIds=[...new Set([...initial.ownedIds,...ids])];
  const party=applyCommand(initial,{type:'party',partyIds:ids,leaderId:leader},content);
  const save=settle(applyCommand(party,{type:'depart',dungeonId:'silent-cathedral',potions:0},content));
  for(const unit of save.battle!.units) {
    unit.attack=0;
    if(unit.side==='enemy') {unit.hp=unit.maxHp=9999;unit.defense=100;}
  }
  save.battle!.initialUnits=structuredClone(save.battle!.units);
  return save;
}
const orderFor=(save:GameSave,followers=['liora'])=>({targetId:save.battle!.units.find(u=>u.side==='enemy')!.uid,followerIds:followers.map(id=>save.battle!.units.find(u=>u.side==='party'&&u.characterId===id)!.uid)});

describe('new research update: native command and save acceptance',()=>{
  it('keeps the existing initial save free of reservations, seeds and free crafted loot',()=>{
    const save=createInitialSave(content,7);
    expect(save.battle).toBeNull();expect(save.memoryGems!.items).toHaveLength(0);
    expect(save.seed).toBe(7);assertSaveCompatibility(save,content);
    expect(decodeBackup(encodeBackup(save,content),content).save).toEqual(save);
  });
  it('reserves, restores and cancels without consuming RNG or currency',()=>{
    const save=prepared(),before=structuredClone(save),order=orderFor(save,['liora','lisette']);
    const queued=applyCommand(save,{type:'commandOrder',battleId:save.battle!.id,order},content);
    expect(save).toEqual(before);expect(queued.battle!.commandOrder).toEqual(order);
    expect(queued.seed).toBe(before.seed);expect(queued.gold).toBe(before.gold);
    const restored=decodeBackup(encodeBackup(queued,content),content).save;
    expect(restored).toEqual(queued);
    const cancelled=applyCommand(restored,{type:'commandOrder',battleId:restored.battle!.id,order:null},content);
    expect(cancelled.battle!.commandOrder).toBeUndefined();
    expect(cancelled.battle!.units).toEqual(before.battle!.units);
  });
  it.each(['duplicate','enemy','self','overload','wrong-battle','extra-field'] as const)('rejects %s without mutating its input',kind=>{
    const save=kind==='overload'?prepared(['elaine','noelle','athena','hecate']):prepared();
    const order=orderFor(save,kind==='overload'?['athena','hecate']:['liora']);
    if(kind==='duplicate')order.followerIds.push(order.followerIds[0]);
    if(kind==='enemy')order.followerIds=[order.targetId];
    if(kind==='self')order.followerIds=['party:noelle'];
    const before=structuredClone(save);
    expect(()=>applyCommand(save,{type:'commandOrder',battleId:kind==='wrong-battle'?'other':save.battle!.id,order:kind==='extra-field'?{...order,extra:true}:order} as never,content)).toThrow();
    expect(save).toEqual(before);
  });
  it('rejects a tampered backup even when its JSON and units are well formed',()=>{
    const save=prepared();
    const raw=JSON.parse(encodeBackup(save,content));
    raw.save.battle.commandOrder={targetId:orderFor(save).targetId,followerIds:['party:noelle']};
    expect(()=>decodeBackup(JSON.stringify(raw),content)).toThrow();
  });
  it('accepts a four-point order only with the awakened commander and preserves base-form load',()=>{
    const awake=prepared(['elaine','noelle-awakened','athena','liora'],'noelle-awakened');
    const order=orderFor(awake,['athena','liora']);
    const queued=applyCommand(awake,{type:'commandOrder',battleId:awake.battle!.id,order},content);
    expect(queued.battle!.commandOrder).toEqual(order);
    expect(decodeBackup(encodeBackup(queued,content),content).save).toEqual(queued);
    const base=prepared(['elaine','noelle','athena','liora']);
    expect(()=>applyCommand(base,{type:'commandOrder',battleId:base.battle!.id,order:orderFor(base,['athena','liora'])},content)).toThrow();
  });
  it('does not queue commands while the commander has a visible ailment',()=>{
    const save=prepared();
    save.battle!.units.find(u=>u.characterId==='noelle')!.ailments={sleep:{turns:1,sourceId:orderFor(save).targetId}};
    const before=structuredClone(save);
    expect(()=>applyCommand(save,{type:'commandOrder',battleId:save.battle!.id,order:orderFor(save)},content)).toThrow();
    expect(save).toEqual(before);
  });
  it('does not override an explicit pilot instruction or a commander ultimate',()=>{
    let save=prepared(['noelle','elaine','liora','lisette']);
    save=applyCommand(save,{type:'commandOrder',battleId:save.battle!.id,order:orderFor(save,['liora'])},content);
    save=applyCommand(save,{type:'partyOrder',battleId:save.battle!.id,order:{kind:'guard'}},content);
    expect(save.battle!.commandOrder).toBeUndefined();
    expect(save.battle!.partyOrder).toEqual({kind:'guard'});
    save=prepared();save.battle!.units.find(u=>u.characterId==='noelle')!.ultimateCharge=100;
    save=applyCommand(save,{type:'commandOrder',battleId:save.battle!.id,order:orderFor(save)},content);
    save=applyCommand(save,{type:'ultimate',unitId:'party:noelle'},content);
    expect(save.battle!.commandOrder).toBeUndefined();
    expect(save.battle!.units.find(u=>u.characterId==='noelle')!.ultimateQueued).toBe(true);
  });
});

describe('white flower native lifecycle',()=>{
  it('crafts, equips, plants, restores and blooms only after an executed guard',()=>{
    const initial=createInitialSave(content,19283);initial.memoryGems!.dust.sanctuary=6;initial.ownedIds=[...new Set([...initial.ownedIds,'noelle','lisette'])];
    let save=applyCommand(initial,{type:'craftMemoryGem',defId:'white-flower-seed'},content);
    const gem=save.memoryGems!.items.find(g=>g.defId==='white-flower-seed')!;
    expect(gem.roll).toEqual({power:80,trait:'none',value:0});expect(save.seed).toBe(initial.seed);
    save=applyCommand(save,{type:'equipMemoryGem',characterId:'elaine',gemId:gem.id},content);
    save=applyCommand(save,{type:'party',partyIds:['elaine','liora','noelle','lisette'],leaderId:'noelle'},content);
    save=settle(applyCommand(save,{type:'depart',dungeonId:'silent-cathedral',potions:0},content));
    for(const u of save.battle!.units) {u.attack=0;if(u.side==='enemy')u.hp=u.maxHp=9999;}
    const pilot=save.battle!.units.find(u=>u.characterId==='elaine')!;pilot.hp=20;
    save.battle!.initialUnits=structuredClone(save.battle!.units);
    save=applyCommand(save,{type:'partyOrder',battleId:save.battle!.id,order:{kind:'skill',skillId:gemSkill(gem).id}},content);
    save=settle(applyCommand(save,{type:'round'},content));
    expect(save.battle!.units.find(u=>u.uid===pilot.uid)!.whiteFlower).toEqual({amount:50,until:3});
    save=decodeBackup(encodeBackup(save,content),content).save;
    const tampered=JSON.parse(encodeBackup(save,content));
    tampered.save.battle.units.find((u:{uid:string})=>u.uid===pilot.uid).whiteFlower.amount=500;
    expect(()=>decodeBackup(JSON.stringify(tampered),content)).toThrow();
    const hp=save.battle!.units.find(u=>u.uid===pilot.uid)!.hp;
    save=applyCommand(save,{type:'partyOrder',battleId:save.battle!.id,order:{kind:'guard'}},content);
    expect(save.battle!.units.find(u=>u.uid===pilot.uid)!.hp).toBe(hp);
    expect(save.battle!.units.find(u=>u.uid===pilot.uid)!.whiteFlower).toBeDefined();
    save=settle(applyCommand(save,{type:'round'},content));
    expect(save.battle!.units.find(u=>u.uid===pilot.uid)!.whiteFlower).toBeUndefined();
    expect(save.battle!.events.some(e=>e.kind==='heal'&&e.amount===50)).toBe(true);
    assertSaveCompatibility(save,content);
    expect(decodeBackup(encodeBackup(save,content),content).save).toEqual(save);
  });
});
