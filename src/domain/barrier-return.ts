import type { BarrierReturnContract, BarrierReturnState, SkillDef, Unit } from './types';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,a:number,b:number):v is number=>Number.isSafeInteger(v)&&Number(v)>=a&&Number(v)<=b;
export function validBarrierReturnContract(v:unknown):v is BarrierReturnContract{return record(v)&&Object.keys(v).every(k=>['shieldPercent','conversionPercent','capacityPercent','windowRounds','payoutPercent'].includes(k))&&int(v.shieldPercent,0,100)&&int(v.conversionPercent,0,500)&&int(v.capacityPercent,0,100)&&int(v.windowRounds,1,3)&&int(v.payoutPercent,0,100);}
export function validBarrierReturnState(v:unknown):v is BarrierReturnState{return record(v)&&['sourceId','skillId','name'].every(k=>typeof v[k]==='string'&&String(v[k]).length>0&&String(v[k]).length<=256)&&int(v.until,0,Number.MAX_SAFE_INTEGER)&&int(v.referenceHp,1,Number.MAX_SAFE_INTEGER)&&int(v.conversionPercent,0,500)&&int(v.capacityPercent,0,100)&&int(v.payoutPercent,0,100)&&int(v.power,0,Number(v.capacityPercent));}
export function expireBarrierReturn(unit:Unit,round:number):void{if(unit.hp<=0||(unit.barrierReturn?.until??-1)<round)delete unit.barrierReturn;}
export function canMarkBarrierReturn(unit:Unit,round:number):boolean{return unit.hp>0&&(!unit.barrierReturn||unit.barrierReturn.until<round);}
export function markBarrierReturn(source:Unit,target:Unit,skill:SkillDef,round:number):boolean{
 const c=skill.barrierReturn;if(!c||!validBarrierReturnContract(c)||source.hp<=0||source.side!==target.side||!canMarkBarrierReturn(target,round))return false;
 target.barrierReturn={sourceId:source.uid,skillId:skill.id,name:skill.name,until:round+c.windowRounds,referenceHp:target.maxHp,conversionPercent:c.conversionPercent,capacityPercent:c.capacityPercent,payoutPercent:c.payoutPercent,power:0};return true;
}
/** Only real hostile primary absorption fills the bounded reserve. */
export function storeBarrierAbsorption(target:Unit,absorbed:number,round:number,hostilePrimary:boolean):number{
 expireBarrierReturn(target,round);const s=target.barrierReturn;if(!s||!hostilePrimary||!Number.isSafeInteger(absorbed)||absorbed<=0)return 0;
 const before=s.power;s.power=Math.min(s.capacityPercent,s.power+Math.floor(absorbed*s.conversionPercent/s.referenceHp));return s.power-before;
}
export function takeBarrierReturn(actor:Unit,round:number):BarrierReturnState|undefined{expireBarrierReturn(actor,round);if(!actor.barrierReturn||actor.barrierReturn.power<=0)return;const s={...actor.barrierReturn};delete actor.barrierReturn;return s;}
export function barrierReturnDamage(primaryHpDamage:number,state?:BarrierReturnState):number{return state&&Number.isSafeInteger(primaryHpDamage)&&primaryHpDamage>0?Math.floor(primaryHpDamage*state.power*state.payoutPercent/10000):0;}
