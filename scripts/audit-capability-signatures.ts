/** Read-only signature overlap diagnostic, not a proof of combat dominance.
 * Run: npx tsx scripts/audit-capability-signatures.ts
 * Same role/templates/leader/stat CAN hide distinct ID-specific mechanics.
 */
import {content} from '../src/content';
import type {CharacterDef} from '../src/domain/types';

const skills = new Map(content.skills.map(skill => [skill.id,skill]));
const entries = content.characters.filter(c=>c.published).map(character=>{
  const templates = character.skillIds.map(id=>skills.get(id)?.template ?? `unresolved:${id}`);
  const signature = [character.role,...templates,character.leaderEffect??'none',character.leaderStat].join('|');
  return {
    id:character.id,name:character.name,rarity:character.rarity,familyId:character.familyId??character.id,
    strength:character.strength,signature,
    templates,role:character.role,leaderEffect:character.leaderEffect??null,
  };
});
const groups = Map.groupBy(entries,item=>item.signature);
const overlaps = [...groups.entries()].filter(([,members])=>members.length>1).map(([signature,members])=>({
  signature,
  members:members.sort((a,b)=>b.strength-a.strength),
  acrossRarities:new Set(members.map(m=>m.rarity)).size>1,
  containsLowRarity:members.some(m=>m.rarity==='R'||m.rarity==='SR'),
})).sort((a,b)=>b.members.length-a.members.length || a.signature.localeCompare(b.signature));
const lowerWithStrongerMatch = overlaps.flatMap(group=>
  group.members.filter(m=>(m.rarity==='R'||m.rarity==='SR')&&group.members.some(n=>
    n.id!==m.id&&n.strength>m.strength &&(n.rarity==='SSR'||n.rarity==='XR')))
  .map(m=>({id:m.id,signature:group.signature,stronger:group.members.filter(n=>n.strength>m.strength).map(n=>n.id)}))
);
console.log(JSON.stringify({
  warning:'Identical role/skill-template/leader signatures are ONLY dominance risk flags. Actual strengths and tactical code, target AI, scout-specific effects, unique ultimates, acquisition states, gear and policies require native counterexample search.',
  totalPublished:entries.length,overlapGroups:overlaps.length,overlapForms:overlaps.reduce((n,g)=>n+g.members.length,0),
  lowerWithStrongerMatch,overlaps,
},null,2));
