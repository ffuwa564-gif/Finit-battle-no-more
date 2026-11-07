import type {Battle,BattleEvent,Content,SkillDef,Unit} from './types';
import {gemDefinitionForSkill,gemPowerMultiplier} from './memory-gems';

export const BUILD_GEM_IDS=['sweep-prism','overflow-ember','camp-lantern','concord-mark','disrupt-sigil','boss-reserve'] as const;
export interface GemPreparation {kind:'camp'|'reserve';power:number;kills:number;until:number}
export interface ConcordMark {sourceId:string;power:number;until:number;contributors:string[]}
export type GemEmit=(event:Omit<BattleEvent,'id'>)=>void;
const live=(b:Battle,side:Unit['side'])=>b.units.filter(u=>u.side===side&&u.hp>0);
const offensive=new Set(['attack','area','pierce','drain','shatter','dawn']);
const integer=(x:unknown,min=0,max=1_000_000):x is number=>Number.isSafeInteger(x)&&Number(x)>=min&&Number(x)<=max;
export function validGemPreparation(v:unknown):v is GemPreparation{
 if(!v||typeof v!=='object')return false;const x=v as GemPreparation;
 return Object.keys(x).every(k=>['kind','power','kills','until'].includes(k))&&['camp','reserve'].includes(x.kind)&&integer(x.power,1,10_000)&&integer(x.kills,0,12)&&integer(x.until,1,Number.MAX_SAFE_INTEGER);
}
export function validConcordMark(v:unknown):v is ConcordMark{
 if(!v||typeof v!=='object')return false;const x=v as ConcordMark;
 return Object.keys(x).every(k=>['sourceId','power','until','contributors'].includes(k))&&typeof x.sourceId==='string'&&x.sourceId.length>0&&integer(x.power,1,1_000_000)&&integer(x.until,1,Number.MAX_SAFE_INTEGER)&&Array.isArray(x.contributors)&&x.contributors.length<=1&&x.contributors.every(v=>typeof v==='string'&&v.length>0)&&new Set(x.contributors).size===x.contributors.length;
}
/** Preconditions are shared by AI, manual commands and replay previews. */
export function buildGemUsable(actor:Unit,b:Battle,skill:SkillDef):boolean{
 const id=gemDefinitionForSkill(skill.id)?.id;
 if(!id||!BUILD_GEM_IDS.includes(id as typeof BUILD_GEM_IDS[number]))return true;
 if(b.rulesVersion!=='4')return false;
 const enemies=live(b,actor.side==='party'?'enemy':'party');
 if(id==='sweep-prism')return enemies.length>=2;
 if(id==='overflow-ember')return enemies.length>=2;
 if(id==='camp-lantern')return !actor.gemPreparation&&enemies.some(u=>!u.boss)&&live(b,actor.side).some(u=>u.hp<u.maxHp*.85);
 if(id==='concord-mark')return live(b,actor.side).length>=2&&enemies.some(u=>!u.concordMark||u.concordMark.until<b.round);
 if(id==='boss-reserve')return !actor.gemPreparation&&!enemies.some(u=>u.boss)&&(b.hunt?.stage==='hunting'||b.wave<2);
 return enemies.some(u=>u.boss);
}
export function buildGemSuggested(actor:Unit,b:Battle,skills:SkillDef[],content:Content):{skill:SkillDef;targets:Unit[]}|undefined{
 if(b.rulesVersion!=='4'||actor.side!=='party')return;
 const enemies=live(b,'enemy');
 const skill=skills.find(s=>{const id=gemDefinitionForSkill(s.id)?.id;
  if(!id||!BUILD_GEM_IDS.includes(id as typeof BUILD_GEM_IDS[number])||!buildGemUsable(actor,b,s))return false;
  if(id==='concord-mark')return enemies.some(u=>u.boss||u.hp>actor.attack*4);
  if(id==='boss-reserve')return (b.hunt?.actions??0)<70;
  return true;
 });
 if(!skill)return;const id=gemDefinitionForSkill(skill.id)!.id;
 const targets=id==='sweep-prism'?enemies:['camp-lantern','boss-reserve'].includes(id)?[actor]:enemies.filter(u=>id!=='concord-mark'||!u.concordMark||u.concordMark.until<b.round).sort((a,c)=>id==='overflow-ember'?a.hp-c.hp:Number(Boolean(c.boss))-Number(Boolean(a.boss))||c.hp-a.hp).slice(0,1);
 return targets.length?{skill,targets}:undefined;
}
/** A preparation replaces an ordinary action; it is never a free equipment passive. */
export function startBuildGem(actor:Unit,b:Battle,skill:SkillDef,targets:Unit[],power:number):boolean{
 const id=gemDefinitionForSkill(skill.id)?.id;
 if(id==='camp-lantern'||id==='boss-reserve'){
  actor.gemPreparation={kind:id==='camp-lantern'?'camp':'reserve',power:Math.max(1,Math.round(power*100)),kills:0,until:b.round+4};return true;
 }
 if(id==='concord-mark'){
  const target=targets[0];if(target)target.concordMark={sourceId:actor.uid,power:Math.max(1,Math.floor(actor.attack*power*1.4)),until:b.round+3,contributors:[]};return true;
 }
 return false;
}
export function expireBuildGems(b:Battle):void{
 for(const u of b.units){if(u.hp<=0||u.concordMark&&u.concordMark.until<b.round)delete u.concordMark;if(u.hp<=0||u.gemPreparation?.kind==='camp'&&u.gemPreparation.until<b.round)delete u.gemPreparation;}
}
/** Secondary effects are settled once and never call this observer recursively. */
export function afterBuildPrimary(b:Battle,actor:Unit,before:Unit[],skill:SkillDef|undefined,template:string,targets:string[],overflow:number,content:Content,hit:(source:Unit,target:Unit,power:number)=>{unit:Unit;amount:number;absorbed:number},emit:GemEmit,primaryAfter:Unit[]=b.units):void{
 if(b.rulesVersion!=='4'||actor.side!=='party')return;
 const id=skill?gemDefinitionForSkill(skill.id)?.id:undefined;
 if(id==='overflow-ember'&&overflow>0&&targets.some(id=>before.some(u=>u.uid===id&&u.hp>0)&&primaryAfter.some(u=>u.uid===id&&u.hp<=0))){
  const target=live(b,'enemy').filter(u=>!targets.includes(u.uid)).sort((a,c)=>a.hp-c.hp||a.uid.localeCompare(c.uid))[0];
  if(target){const g=b.memoryGems?.[actor.characterId];const power=g?gemPowerMultiplier(g,content.characters.find(c=>c.id===actor.characterId),content,b.rulesVersion):1;
   const spilled=Math.min(Math.floor(overflow*.5),Math.floor(actor.attack*power*1.2));if(spilled>0){const r=hit(actor,target,spilled);emit({kind:'attack',actorId:actor.uid,targetIds:[r.unit.uid],skillId:skill!.id,amount:r.amount,absorbed:r.absorbed||undefined,text:'残火石 — 余った一撃を渡す',unitsAfter:structuredClone(b.units)});}}
 }
 if(offensive.has(template))for(const u of b.units){const m=u.concordMark,old=before.find(v=>v.uid===u.uid);if(!m||u.hp<=0||!old||u.side!=='enemy'||!targets.includes(u.uid)||(primaryAfter.find(v=>v.uid===u.uid)?.hp??old.hp)>=old.hp||m.contributors.includes(actor.uid))continue;
  const source=b.units.find(v=>v.uid===m.sourceId&&v.side==='party'&&v.hp>0);if(!source){delete u.concordMark;continue;}
  if(m.contributors.length===0)m.contributors.push(actor.uid);
  else{const power=m.power;delete u.concordMark;const r=hit(source,u,power);emit({kind:'attack',actorId:source.uid,targetIds:[r.unit.uid],amount:r.amount,absorbed:r.absorbed||undefined,text:'共鳴標石 — 二人の主攻撃が結ぶ',unitsAfter:structuredClone(b.units)});}
 }
 const kills=before.filter(v=>v.side==='enemy'&&v.hp>0&&primaryAfter.some(u=>u.uid===v.uid&&u.hp<=0)).length;
 if(!kills)return;
 for(const source of live(b,'party')){const prep=source.gemPreparation;if(!prep)continue;prep.kills=Math.min(12,prep.kills+kills);
  if(prep.kind==='camp'&&prep.kills>=3){delete source.gemPreparation;let amount=0;const targetIds:string[]=[];
   for(const u of live(b,'party')){if((u.field?.woundUntil??-1)>=b.round)continue;const n=Math.min(u.maxHp-u.hp,Math.floor(u.maxHp*Math.min(.35,prep.power/2000)));if(n>0){u.hp+=n;amount+=n;targetIds.push(u.uid);}}
   emit({kind:'heal',actorId:source.uid,targetIds,amount,text:'野営灯石 — 三討伐の手当',unitsAfter:structuredClone(b.units)});
  }
 }
}
/** HP/charge were never reset by the old wave transition; preparations explicitly convert here. */
export function releaseBossReserves(b:Battle,emit:GemEmit):void{
 if(b.rulesVersion!=='4'||!b.units.some(u=>u.side==='enemy'&&u.hp>0&&u.boss))return;
 for(const u of live(b,'party')){const p=u.gemPreparation;if(p?.kind!=='reserve')continue;delete u.gemPreparation;
  const charge=Math.min(35,Math.floor(p.kills*p.power/100));const shield=Math.floor(u.maxHp*Math.min(.4,p.kills*p.power/10000));
  u.ultimateCharge=Math.min(100,(u.ultimateCharge??0)+charge);const current=(u.barrierUntil??-1)>=b.round?u.barrier??0:0;if(shield>current){u.barrier=shield;u.barrierUntil=Math.max(u.barrierUntil??0,b.round+1);}
  emit({kind:'guard',actorId:u.uid,targetIds:[u.uid],text:'戦果の備え石 — 狩りの準備をボスへ',unitsAfter:structuredClone(b.units)});
 }
}
