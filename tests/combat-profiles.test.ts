import {describe,it,expect} from 'vitest';
import {content} from '../src/content';
import {COMBAT_STYLES,COMBAT_PROFILES,combatProfile,stoneMastery,stoneAffinity} from '../src/domain/combat-profiles';
import {baseStats,createBattle,encounterStats} from '../src/domain/engine';
import {characterSkills} from '../src/domain/character-skills';
import {GEM_DEFINITIONS,gemPowerMultiplier} from '../src/domain/memory-gems';

describe('shared rule 4 character budget',()=>{
 it('authors every published family and keeps all styles on the same declared budget',()=>{
  for(const c of content.characters.filter(c=>c.published)){
   expect(COMBAT_PROFILES[c.familyId??c.id],c.id).toBeDefined();
   expect(combatProfile(c).stones).toHaveLength(2);
   for(const id of combatProfile(c).stones)expect(GEM_DEFINITIONS.some(g=>g.id===id),`${c.id}/${id}`).toBe(true);
  }
  for(const style of Object.values(COMBAT_STYLES))expect(style.hp+style.attack+style.defense+10*style.speed).toBe(300);
 });
 it('does not award personal stats or ordinary skill strength for rarity',()=>{
  for(const c of content.characters){
   const clone={...c,rarity:'XR' as const,strength:40};
   expect(baseStats(c)).toEqual(baseStats(clone));
   expect(characterSkills(c,content).map(s=>[s.id,s.strength])).toEqual(characterSkills(clone,content).map(s=>[s.id,s.strength]));
  }
 });
 it('uses the recruit sheet on the enemy side and applies only exported encounter scales',()=>{
  for(const id of ['elaine','seris','athena','astraea']){
   const c=content.characters.find(c=>c.id===id)!;
   const stage={...content.dungeons[0],id:'parity',waves:[[{characterId:id},{characterId:id,boss:true}]],enemyScale:{hp:1.7,attack:1.3,defense:1.1}};
   const local={...content,dungeons:[stage]};
   const b=createBattle(local,[id],id,'parity',0,42,'parity');
   for(const u of b.units.filter(u=>u.side==='enemy')){const s=encounterStats(c,stage,u.boss);expect([u.maxHp,u.attack,u.defense,u.speed]).toEqual([s.hp,s.attack,s.defense,s.speed]);}
   const unscaled=encounterStats(c,{...stage,enemyScale:undefined,bossScale:{hp:100,attack:100}},false);
   const raw=baseStats(c);expect(unscaled.speed).toBe(raw.speed);expect(unscaled.hp).toBeLessThanOrEqual(raw.hp);
  }
 });
 it('gives low rarity more stone potency and retains aptitude on explicit awakening',()=>{
  const c=content.characters.find(c=>c.id==='seris')!,g={id:'test',defId:'night-dew',variant:'pure' as const,roll:{power:80,trait:'none' as const,value:0}};
  expect(stoneMastery(c,content)).toBe(1.25);
  expect(stoneMastery(content.characters.find(c=>c.id==='seris-awakened')!,content)).toBe(1.25);
  expect(gemPowerMultiplier(g,c,content)).toBeGreaterThan(gemPowerMultiplier(g,{...c,rarity:'XR'},content));
  expect(stoneAffinity(c,'dawn-crown',content)).toBeCloseTo(1.4);
  expect(gemPowerMultiplier({...g,defId:'white-flower-seed'},c,content)).toBe(1);
  expect(gemPowerMultiplier(g,c,content,'3')).toBeCloseTo(2.2);
 });
});
