import {content} from './policy.mts';
export type Mode='before'|'after'|'no-relay'|'no-jam'|'no-exposure';
const initial=content.characters;
export function setMode(mode:Mode){(content as any).characters=initial.map(c=>{if(c.id!=='tikka')return c;if(mode==='before'){const{skillOverrides,...base}=c;return base;}if(mode==='no-jam')return{...c,skillIds:c.skillIds.filter(id=>!id.startsWith('jam-')),skillOverrides:undefined};const sk=c.skillOverrides?.['jam-14'];if(!sk?.jamRelay)throw Error('Tikka research flag required');return mode==='after'?c:{...c,skillOverrides:{...c.skillOverrides,'jam-14':{...sk,jamRelay:{...sk.jamRelay,...(mode==='no-exposure'?{exposeStrength:0}:{charge:0})}}}};});}
export function resetMode(){(content as any).characters=initial;}
