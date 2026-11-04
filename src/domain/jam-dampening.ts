import type { JamDampeningContract, SkillDef, Unit } from './types';
export function validJamDampeningContract(value:unknown):value is JamDampeningContract {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;return Object.keys(v).sort().join(',')==='percent,windowRounds'&&Number.isSafeInteger(v.percent)&&Number(v.percent)>=0&&Number(v.percent)<=75&&Number.isSafeInteger(v.windowRounds)&&Number(v.windowRounds)>=1&&Number(v.windowRounds)<=2;
}
/** Real extension only. One finite mark, never refresh an equal/stronger active one. */
export function applyJamDampening(target:Unit,sourceId:string,round:number,skill:SkillDef,extended:boolean):boolean {
 if(!extended||skill.template!=='jam'||!validJamDampeningContract(skill.jamDampening)||!skill.jamDampening.percent||target.hp<=0)return false;
 if(target.jamDampening&&target.jamDampening.until>=round&&target.jamDampening.percent>=skill.jamDampening.percent)return false;
 target.jamDampening={percent:skill.jamDampening.percent,until:round+skill.jamDampening.windowRounds,sourceId};return true;
}
/** Called only for one ordinary, unforced, non-skill attack; boss arts/bits never call this. */
export function consumeJamDampening(actor:Unit,round:number):number {
 const mark=actor.jamDampening;if(!mark)return 0;delete actor.jamDampening;
 return actor.hp>0&&mark.until>=round?mark.percent:0;
}
