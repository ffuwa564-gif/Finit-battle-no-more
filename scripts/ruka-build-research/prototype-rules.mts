/** Research-only native-engine extension. Not imported by the shipped application. */
export const STITCH='research-ruka-backstitch';
export const SPOOL='research-basting-spool';
export function labState(b:any){return b.researchRules;}
export function capResearchDamage(b:any,u:any,wanted:number){const q=labState(b);if(!q||u.side!=='enemy'||!u.boss)return wanted;if(q.releaseCapOnWound&&(u.researchWoundUntil??-1)>=b.round)return wanted;const key=`${b.wave}:${b.round}`;if(q.capKey!==key){q.capKey=key;q.spent=0;}const actual=Math.max(0,Math.min(wanted,q.cap-q.spent));q.spent+=actual;return actual;}
export function collectResearchThread(b:any){const q=labState(b);if(!q||q.stockEnabled===false||b.leaderId!=='ruka')return[];const r=b.units.find((u:any)=>u.side==='party'&&u.characterId==='ruka'&&u.hp>0);if(!r)return[];const residual=b.units.filter((u:any)=>u.side==='party'&&u.hp>0&&(u.barrier??0)>0&&u.barrierUntil!==undefined&&u.barrierUntil<b.round);if(!residual.length)return[];const old=r.researchStock??0;r.researchStock=Math.min(2,old+1);return r.researchStock>old?[`研究：ルカが自然失効した障壁から残り糸を保管 ${r.researchStock}/2`]:[];}
export function threadCount(b:any,u:any){return b.leaderId==='ruka'&&labState(b)?.stockEnabled!==false?(u.researchStock??0):((u.scoutThreadUntil??-1)>=b.round?1:0);}
export function spendThread(b:any,u:any){if(threadCount(b,u)<=0)return false;if(b.leaderId==='ruka'&&labState(b)?.stockEnabled!==false)u.researchStock=Math.max(0,(u.researchStock??0)-1);delete u.scoutThreadUntil;return true;}
export function researchSkill(b:any,u:any,id:string){
 if(!labState(b)||u.side!=='party'||u.hp<=0)return;
 if(id===STITCH&&u.characterId==='ruka'){
  const t=b.units.find((x:any)=>x.side==='enemy'&&x.hp>0&&x.uid===b.focusTargetId)??b.units.find((x:any)=>x.side==='enemy'&&x.hp>0);if(!t||!spendThread(b,u))return{handled:true,amount:0,targetIds:[],messages:['研究：残り糸不足で留め縫いは不発']};t.researchWoundUntil=b.round+1;return{handled:true,amount:0,targetIds:[t.uid],messages:[`研究：留め縫い／敵のHP回復をR${b.round+1}終了まで阻止`]};
 }
 if(id.startsWith('memory:'+SPOOL+':')){const old=(u.barrierUntil??-1)>=b.round?u.barrier??0:0;if(old>=60)return{handled:true,amount:0,targetIds:[u.uid]};u.barrier=60;u.barrierUntil=b.round+1;return{handled:true,amount:60,targetIds:[u.uid],messages:['研究：自分へ60の仮縫い障壁（次ラウンド終了まで）']};}
}
export function researchSuggested(b:any,u:any,skills:any[]){if(!labState(b)||u.side!=='party')return;if(labState(b)?.emergencyFirst&&skills.some(s=>s.template==='heal')&&b.units.some((f:any)=>f.side==='party'&&f.hp>0&&f.hp<f.maxHp*.8))return;const spool=skills.find(s=>s.id.startsWith('memory:'+SPOOL+':'));if(spool&&!((u.barrierUntil??-1)>=b.round&&(u.barrier??0)>0))return{skill:spool,template:spool.template,targets:[u]};}
export function finishResearchRound(b:any){const q=labState(b);if(!q||q.rewindEnabled===false||b.round%q.period!==0)return[];const boss=b.units.find((u:any)=>u.side==='enemy'&&u.boss&&u.hp>0);if(!boss)return[];if((boss.researchWoundUntil??-1)>=b.round){q.blocked=(q.blocked??0)+1;return['研究：留め縫いが傷の巻戻しを阻止'];}const amount=boss.maxHp-boss.hp;boss.hp=boss.maxHp;q.restored=(q.restored??0)+1;return[`研究：回廊の巻戻し HP${amount}回復`];}
export function capResearchHealing(b:any,u:any,wanted:number){return labState(b)&&u.side==='enemy'&&(u.researchWoundUntil??-1)>=b.round?0:wanted;}
