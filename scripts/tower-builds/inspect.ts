import {content} from '../../src/content';
import {characterStats} from '../../src/domain/engine';
import {leaderEffectDescription} from '../../src/domain/skill-info';
for(const c of content.characters.filter(c=>c.published&&c.origin.some(x=>['initial','recruit','gacha','awakening','event'].some(p=>x.includes(p)))&&c.rarity!=='XR')){
 console.log(JSON.stringify({id:c.id,name:c.name,rarity:c.rarity,strength:c.strength,role:c.role,stats:characterStats(c),skills:c.skillIds.map(id=>{const s=content.skills.find(s=>s.id===id)!;return s.template+':'+s.name}),leader:leaderEffectDescription(c)}));
}
