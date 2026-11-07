import {writeFileSync,mkdirSync} from 'node:fs';
import {content} from '../src/content';
import {baseStats,leaderBonus} from '../src/domain/engine';
import {characterSkills} from '../src/domain/character-skills';
import {GEM_DEFINITIONS,gemPowerMultiplier} from '../src/domain/memory-gems';
import {combatProfile} from '../src/domain/combat-profiles';
const chars=content.characters.filter(c=>c.published);
const rows=chars.map(c=>({id:c.id,family:c.familyId??c.id,rarity:c.rarity,role:c.role,stats:baseStats(c),profile:combatProfile(c),leader:leaderBonus(c),skills:characterSkills(c,content).map(s=>JSON.stringify({template:s.template,strength:s.strength,barrierReturn:s.barrierReturn,barrierMend:s.barrierMend,jamDampening:s.jamDampening,dispelStrikePercent:s.dispelStrikePercent})),potency:GEM_DEFINITIONS.map(g=>gemPowerMultiplier({id:'audit',defId:g.id,variant:'pure',roll:g.fixedRoll??{power:230,trait:'none',value:0}},c,content))}));
const pairs:unknown[]=[];
for(const a of rows)for(const b of rows){if(a.family===b.family||a.role!==b.role)continue;
 const sameCapabilities=a.skills.every(s=>b.skills.includes(s));
 const stats=(['hp','attack','defense','speed']as const).every(k=>b.stats[k]>=a.stats[k]);
 const stones=a.potency.every((p,i)=>b.potency[i]>=p-1e-9);
 if(sameCapabilities&&stats&&stones)pairs.push({candidate:a.id,possibleReplacement:b.id,reason:'sheet/ordinary-actions/stone-potency coverage; leader and nonlinear interactions require separate testing'});
}
mkdirSync('artifacts/gem-diversity',{recursive:true});writeFileSync('artifacts/gem-diversity/structural-audit.json',JSON.stringify({version:content.appVersion,forms:rows.length,families:new Set(rows.map(r=>r.family)).size,scope:'Necessary feature coverage screen only. No declaration of practical viability or full dominance. All T6 endgame battle replacement studies remain unverified outside the finite benchmark.',possibleCoverage:pairs,roster:rows},null,2));console.log({forms:rows.length,families:new Set(rows.map(r=>r.family)).size,possibleCoverage:pairs.length});
