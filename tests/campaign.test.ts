import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { campaignFrontier, campaignStageIds, chapterUnlocked } from '../src/domain/campaign';
import { dungeonLock } from '../src/domain/events';
import { dungeonStoneReward } from '../src/domain/rewards';
import { applyCommand, createInitialSave } from '../src/application/game';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { assertSaveCompatibility } from '../src/platform/save';
import type { GameSave } from '../src/domain/types';
const ids = campaignStageIds(content);
function finish(save: GameSave): GameSave {
  for (let n=0;n<200 && save.battle && !['reward','failed'].includes(save.battle.phase);n++) {
    if (save.battle.phase === 'ready') for (const unit of save.battle.units.filter(u=>u.side==='party')) {unit.attack=10000;unit.speed=100;}
    save=applyCommand(save, { type: save.battle!.phase==='playing'?'replay':'round' }, content);
  }
  expect(save.battle?.phase).toBe('reward'); return save;
}
describe('normal campaign chapters',()=>{
  it('extends the thirty-six stable routes with the two-stage Zakuro chapter and distinct scaled finale bosses',()=>{
    expect(validateContent(content)).toEqual([]);expect(content.chapters).toHaveLength(4);
    expect(content.chapters!.map(ch=>ch.dungeonIds.length)).toEqual([12,12,12,2]);expect(new Set(ids).size).toBe(38);
    const bosses=content.chapters!.map(ch=>content.dungeons.find(d=>d.id===ch.dungeonIds.at(-1))!);
    expect(bosses.map(d=>d.waves.at(-1)![0]!.characterId)).toEqual(['stone-drake','liora','lisette','zakuro']);
    expect(bosses.map(d=>d.bossScale!.hp)).toEqual([320,500,1600,1200]);
    expect(bosses[1]!.bossLoot).toBeDefined();expect(bosses[2]!.bossLoot).toBeDefined();
  });
  it('opens only the first exploration for a new save and enforces the gate in real commands',()=>{
    const save=createInitialSave(content),before=structuredClone(save);
    expect(ids.filter(id=>!dungeonLock(content.dungeons.find(d=>d.id===id)!,save,content))).toEqual([ids[0]]);
    expect(content.chapters!.map(ch=>chapterUnlocked(ch,save,content))).toEqual([true,false,false,false]);
    for(const id of ids.slice(1))expect(()=>applyCommand(save,{type:'depart',dungeonId:id,potions:0},content)).toThrow('解放');
    expect(save).toEqual(before);
  });
  it('advances in order only after confirming each clear, pays three stones once, and preserves story loot',()=>{
    let save=createInitialSave(content,42);
    for(const [index,id]of ids.entries()){
      const reward=finish(applyCommand(save,{type:'depart',dungeonId:id,potions:0},content));
      expect(reward.completedDungeonIds).not.toContain(id);
      if(index+1<ids.length)expect(dungeonLock(content.dungeons.find(d=>d.id===ids[index+1])!,reward,content)).toBeTruthy();
      save=applyCommand(JSON.parse(JSON.stringify(reward)),{type:'claim'},content);
      expect(save.completedDungeonIds).toContain(id);expect(save.stones).toBe((index+1)*3);
      if(index+1<ids.length)expect(dungeonLock(content.dungeons.find(d=>d.id===ids[index+1])!,save,content)).toBeNull();
    }
    expect(save.materials['lisette-memory:rare']).toBeGreaterThanOrEqual(6);
    const repeat=applyCommand(finish(applyCommand(save,{type:'depart',dungeonId:ids[0]!,potions:0},content)),{type:'claim'},content);
    expect(repeat.stones).toBe(114);assertSaveCompatibility(repeat,content);
  });
  it('does not unlock a route after retreat or failure',()=>{
    let save=applyCommand(createInitialSave(content),{type:'depart',dungeonId:ids[0]!,potions:0},content);
    while(save.battle!.phase==='playing')save=applyCommand(save, { type: 'replay' }, content);
    save=applyCommand(save,{type:'retreat'},content);save=applyCommand(save,{type:'leaveFailure'},content);
    expect(save.completedDungeonIds).toEqual([]);expect(campaignFrontier(save,content)).toBe(0);
  });
  it('keeps old deep clear records accessible without inventing earlier rewards',()=>{
    const save=createInitialSave(content);save.completedDungeonIds=['last-observatory'];const before=structuredClone(save);
    assertSaveCompatibility(save,content);expect(campaignFrontier(save,content)).toBe(ids.indexOf('last-observatory')+1);
    expect(content.chapters!.slice(0,3).every(ch=>chapterUnlocked(ch,save,content))).toBe(true);
    expect(ids.slice(0,ids.indexOf('last-observatory')+2).every(id=>!dungeonLock(content.dungeons.find(d=>d.id===id)!,save,content))).toBe(true);
    expect(dungeonLock(content.dungeons.find(d=>d.id==='pale-throne')!,save,content)).toBeTruthy();
    expect(dungeonStoneReward(content.dungeons.find(d=>d.id==='last-observatory')!,save.completedDungeonIds)).toBe(0);
    expect(dungeonStoneReward(content.dungeons[0]!,save.completedDungeonIds)).toBe(3);expect(save).toEqual(before);
  });
  it('resumes an old expedition into a newly gated route and unlocks the route beyond on claim',()=>{
    const save=createInitialSave(content);save.battle=createBattle(content,save.partyIds,save.leaderId,'hollow-gate',0,42,'old-deep-battle');
    assertSaveCompatibility(JSON.parse(JSON.stringify(save)),content);
    const claimed=applyCommand(finish(save),{type:'claim'},content);
    expect(chapterUnlocked(content.chapters![2]!,claimed,content)).toBe(true);
    expect(claimed.completedDungeonIds).toEqual(['hollow-gate']);expect(claimed.stones).toBe(3);
  });
  it('rejects duplicate or broken chapter routes and missing scaled finale bosses',()=>{
    const bad=structuredClone(content);bad.chapters![1]!.dungeonIds[0]=ids[0]!;bad.dungeons.find(d=>d.id==='pale-throne')!.bossScale=undefined;
    const errors=validateContent(bad);expect(errors.some(e=>e.includes('unique published campaign'))).toBe(true);expect(errors).toContain('chapters/promise-of-dawn: scaled finale boss required');
  });
  it('uses a single telegraphed heavy attack every third turn and lets guards and barriers counter it',()=>{
    let battle=createBattle(content,['elaine','liora','seris','noelle'],'elaine','stone-fountain',0,42,'heavy');
    while(battle.phase==='playing')battle=advanceReplay(battle,content);
    while(battle.wave<2){battle.phase='playing';battle.nextPhase='wave';battle.events=[];battle.cursor=0;while(battle.phase==='playing')battle=advanceReplay(battle,content);}
    battle.round=3;
    for(const unit of battle.units){unit.hp=unit.maxHp=10000;unit.defense=0;unit.attack=unit.side==='party'?1:100;unit.speed=unit.side==='party'?100:0;unit.cooldowns=Object.fromEntries(content.characters.find(c=>c.id===unit.characterId)!.skillIds.map(id=>[id,99]));}
    battle.units.find(u=>u.boss)!.barrier=800;battle.units.find(u=>u.boss)!.barrierUntil=4;
    const hit=resolveRound(battle,content).battle.events.filter(e=>e.bossStrike);
    expect(hit[0]).toMatchObject({ ultimate: true, ultimateName: '石燐の突進' });
    expect(hit).toHaveLength(1);expect(hit[0]!.amount).toBe(280);expect(hit[0]!.skillId).toBeUndefined();expect(hit[0]!.unitsAfter!.find(u=>u.boss)!.barrier).toBeUndefined();
    const ordinary=structuredClone(battle);ordinary.round=2;expect(resolveRound(ordinary,content).battle.events.some(e=>e.bossStrike)).toBe(false);
    const guarded=structuredClone(battle);const ward=guarded.units.find(u=>u.characterId==='elaine')!,guard=guarded.units.find(u=>u.characterId==='liora')!;
    guard.guardTarget=ward.uid;guard.guardUntil=4;guard.guardStrength=14;guard.barrier=1000;guard.barrierUntil=4;
    const shielded=resolveRound(guarded,content).battle.events.find(e=>e.bossStrike)!;
    expect(shielded.targetIds).toEqual([guard.uid]);expect(shielded.amount).toBe(0);
    const saved=createInitialSave(content);saved.battle=resolveRound(guarded,content).battle;assertSaveCompatibility(JSON.parse(JSON.stringify(saved)),content);
  });
  it('guards the most fragile ally when everyone is at full health',()=>{
    let battle=createBattle(content,['elaine','liora','seris','noelle'],'elaine','stone-fountain',0,42,'fragile');while(battle.phase==='playing')battle=advanceReplay(battle,content);
    const guard=resolveRound(battle,content).battle.events.find(e=>e.actorId==='party:liora'&&e.skillId==='guard-14')!;
    expect(guard.targetIds).toEqual(['party:noelle']);
  });
});

it('keeps chapter-specific boss dialogue in saved replays without changing the recruit or memory encounter',()=>{
  const battle=createBattle(content,['elaine','liora','seris','noelle'],'elaine','hollow-gate',0,42,'chapter-dialogue');
  let b=battle;while(b.phase==='playing')b=advanceReplay(b,content);
  while(b.wave<2){b.phase='playing';b.nextPhase='wave';b.events=[];b.cursor=0;while(b.phase==='playing')b=advanceReplay(b,content);}
  expect(b.events.some(e=>e.text.includes('盾が、もう私の命令'))).toBe(true);
  const save=createInitialSave(content);save.battle=b;assertSaveCompatibility(JSON.parse(JSON.stringify(save)),content);
  expect(content.characters.find(c=>c.id==='liora')!.dialogue!.intro).toBe('この門は、私が開いた。');
});
it('rejects missing story passages and invalid boss dialogue while accepting the expanded campaign',()=>{
  const bad=structuredClone(content);bad.dungeons[0]!.narrative!.after='';bad.dungeons.find(d=>d.id==='hollow-gate')!.bossDialogue!.defeat='';
  expect(validateContent(bad)).toContain('dungeons/silent-cathedral: plain narrative before and after required');
  expect(validateContent(bad)).toContain('dungeons/hollow-gate: complete plain boss dialogue required');
});


it('allows the late-campaign damage ceiling without relaxing early chapters or events',()=>{
  const c=structuredClone(content),late=c.dungeons.find(d=>d.id==='silver-crypt')!;
  late.bossScale!.attack=800;expect(validateContent(c)).toEqual([]);
  late.bossScale!.attack=801;expect(validateContent(c)).toContain('dungeons/silver-crypt: invalid event boss scale');
  late.bossScale!.attack=650;c.dungeons.find(d=>d.id==='hollow-gate')!.bossScale!.attack=650;
  expect(validateContent(c)).toContain('dungeons/hollow-gate: invalid event boss scale');
  c.dungeons.find(d=>d.id==='kuzuha-awakening')!.bossScale!.attack=650;
  expect(validateContent(c)).toContain('dungeons/kuzuha-awakening: invalid event boss scale');
});
