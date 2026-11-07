import {content} from './policy.mts';
export type Mode='before'|'after'|'target-only'|'old-triage'|'no-secondary';
const initial=content.characters;
export function setMode(mode:Mode){(content as any).characters=initial.map(c=>{if(c.id!=='miette')return c;if(mode==='before'){const{skillOverrides,...base}=c;return base;}if(mode==='no-secondary')return{...c,skillIds:c.skillIds.filter(id=>!id.startsWith('barrier-mend-'))};const sk=c.skillOverrides?.['barrier-mend-18'];if(!sk?.barrierMend)throw Error('Research flag required');return mode==='after'?c:{...c,skillOverrides:{...c.skillOverrides,'barrier-mend-18':{...sk,barrierMend:{...sk.barrierMend,...(mode==='target-only'?{donorScope:'target'}:{healingFirst:false})}}}};});}
export function resetMode(){(content as any).characters=initial;}
