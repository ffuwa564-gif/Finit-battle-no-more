import {describe,expect,it} from 'vitest';
import {content} from '../src/content';
import {applyCommand,createInitialSave} from '../src/application/game';
import {getBuildDefinition,getBuildPlan,findGemSources,type BuildStage} from '../src/domain/builds';
import {buildTactics} from '../src/domain/build-tactics';
import {emptyGemInventory,validMemoryGem} from '../src/domain/memory-gems';
import {duplicateFamily} from '../src/domain/events';
import {decodeBackup,encodeBackup} from '../src/platform/save-backup';
const ids=['status-weave','enduring-tides','skill-rewind'];
function equippedFixture(id:string,stage:BuildStage){
 const save=createInitialSave(content,11031),recipe=getBuildDefinition(id)!.stages[stage];
 save.ownedIds=[...new Set([...save.ownedIds,...recipe.slots.map(s=>s.characterIds[0])])];
 save.memoryGems=emptyGemInventory();save.memoryGems.items=recipe.slots.map((s,i)=>({id:`research-${i}`,defId:s.gem.defId,variant:s.gem.variant,roll:{power:s.gem.power,trait:s.gem.trait??'none',value:s.gem.value??0},locked:i===0}));
 save.memoryGems.seen=[...new Set(recipe.slots.map(s=>s.gem.defId))];return save;
}
describe('new research guides use the owned-equipment and persistent-goal flow',()=>{
 for(const id of ids)for(const stage of ['starter','complete','perfect']as const)it(`${id}/${stage}: tracks, equips and restores without gifting items or spending RNG`,()=>{
  const save=equippedFixture(id,stage),before=structuredClone(save),plan=getBuildPlan(content,save,id,stage);
  expect(plan.complete).toBe(true);expect(plan.canApply).toBe(true);expect(duplicateFamily(plan.partyIds,content)).toBe(false);
  expect(save.memoryGems!.items.every(validMemoryGem)).toBe(true);
  const tracked=applyCommand(save,{type:'trackBuild',buildId:id,stage},content);
  const restored=decodeBackup(encodeBackup(tracked,content),content).save;
  expect(restored.buildGoal).toEqual({buildId:id,stage});
  const applied=applyCommand(restored,{type:'applyBuild',buildId:id,stage},content);
  expect(applied.partyIds).toEqual(plan.partyIds);expect(applied.leaderId).toBe(plan.leaderId);
  for(const slot of plan.slots)expect(applied.memoryGems!.equipped[slot.characterId!]).toBe(slot.gem!.id);
  expect(applied.memoryGems!.items).toEqual(before.memoryGems!.items);
  for(const key of ['gold','stones','materials','seed']as const)expect(applied[key]).toEqual(before[key]);
  expect(save).toEqual(before);expect(buildTactics(id)).toBeDefined();
  for(const slot of plan.slots)expect(findGemSources(content,save,slot.slot.gem.defId,slot.slot.gem).length).toBeGreaterThan(0);
 });
 it('shows missing unique core stones and refuses application rather than inventing dream or rewind',()=>{
  for(const id of ['status-weave','skill-rewind']){
   const s=equippedFixture(id,'starter'),core=getBuildDefinition(id)!.stages.starter.slots[0].gem.defId;
   s.memoryGems!.items=s.memoryGems!.items.filter(g=>g.defId!==core);const before=structuredClone(s);
   expect(getBuildPlan(content,s,id,'starter').canApply).toBe(false);
   expect(()=>applyCommand(s,{type:'applyBuild',buildId:id,stage:'starter'},content)).toThrow();expect(s).toEqual(before);
  }
 });
 it('finds an owned alternative without assigning Izanami twice when Freyja is absent',()=>{
  const s=equippedFixture('enduring-tides','starter');s.ownedIds=s.ownedIds.filter(id=>id!=='freyja');
  const plan=getBuildPlan(content,s,'enduring-tides','starter');expect(plan.canApply).toBe(true);expect(plan.partyIds[0]).toBe('evelyn');expect(plan.partyIds[1]).toBe('liora');expect(new Set(plan.partyIds).size).toBe(4);
 });
 it('only lists sleep-capable replacements for the sleep role and preserves regeneration in its branch',()=>{
  for(const id of getBuildDefinition('status-weave')!.stages.starter.slots[0].characterIds){const ch=content.characters.find(c=>c.id===id)!;expect(ch.skillIds.some(id=>content.skills.some(s=>s.id===id&&s.template==='sleep'))).toBe(true);}
  for(const id of getBuildDefinition('enduring-tides')!.stages.starter.slots[3].characterIds){const ch=content.characters.find(c=>c.id===id)!;expect(ch.skillIds.some(id=>content.skills.some(s=>s.id===id&&s.template==='regen'))).toBe(true);}
 });
});
