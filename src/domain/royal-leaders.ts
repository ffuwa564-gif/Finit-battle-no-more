import type {Battle,CharacterDef,Content,Unit} from './types';
import {bossWindupStatus} from './boss-pressure';
import {huntRank,HUNT_RANKS} from './hunt';
import type {GemEmit} from './build-gems';
export interface RoyalLeaderState {verdictRound?:number;verdictUsedRound?:number;rank?:number}
export function royalLeaderDescription(c:CharacterDef):string|undefined{
 if(c.id==='astraea'&&c.rarity==='XR')return '終天の裁定：味方の主攻撃でボスの予告を崩すと、そのラウンドの次の味方主攻撃の威力を35%上昇。発動・消費は各ラウンド1回。追撃では発動せず、持ち越さない。';
 if(c.id==='selene'&&c.rarity==='SSR')return '月宴の救命：敵の攻撃で味方が倒れる直前、セレネの必殺ゲージ100を消費できる場合に限りHP1で耐えさせる。本人の必殺と同じゲージを使い、支払えなければ救えない。';
 if(c.id==='fortuna'&&c.rarity==='SSR')return '幸運の隊商：連続討伐でB・A・S・SSへ初めて到達するたび、生存中の味方全員の必殺ゲージを15充填。各ランク1回。追加の討伐・素材・石は作らない。';
 return;
}
function leader(b:Battle,c:Content,id:string):Unit|undefined{
 const definition=c.characters.find(v=>v.id===id);if(!definition||!royalLeaderDescription(definition))return;
 if(b.rulesVersion!=='4'||b.leaderId!==id||b.commandIssuedRound===b.round)return;
 return b.units.find(u=>u.side==='party'&&u.characterId===id&&u.hp>0);
}
export function consumeRoyalPower(b:Battle,actor:Unit,c:Content,offensive:boolean):number{
 if(!offensive||actor.side!=='party'||!leader(b,c,'astraea')||b.royalLeader?.verdictRound!==b.round||b.royalLeader.verdictUsedRound===b.round)return 1;
 b.royalLeader.verdictUsedRound=b.round;return 1.35;
}
export function observeRoyalBreak(b:Battle,before:Unit[],c:Content,emit:GemEmit):void{
 if(!leader(b,c,'astraea')||b.royalLeader?.verdictRound===b.round)return;
 const strike=c.dungeons.find(d=>d.id===b.dungeonId)?.bossStrike;if(!strike?.windup)return;
 if(b.units.some(u=>u.side==='enemy'&&u.boss&&u.hp>0&&bossWindupStatus(u,strike,b.round).phase==='broken'&&before.some(v=>v.uid===u.uid&&bossWindupStatus(v,strike,b.round).phase==='charging'))){
  (b.royalLeader??={}).verdictRound=b.round;emit({kind:'buff',actorId:'party:astraea',text:'終天の裁定 — 次の主攻撃へ',unitsAfter:structuredClone(b.units)});
 }
}
export function royalLethalProtection(b:Battle,target:Unit,incoming:number,c:Content):number{
 const source=leader(b,c,'selene');if(!source||target.side!=='party'||target.hp<=0||incoming<target.hp||(source.ultimateCharge??0)<100)return incoming;
 source.ultimateCharge=0;return Math.max(0,target.hp-1);
}
export function observeRoyalRank(b:Battle,c:Content,emit:GemEmit):void{
 if(!b.hunt)return;const rank=HUNT_RANKS.indexOf(huntRank(b.hunt.kills));const old=b.royalLeader?.rank??0;
 (b.royalLeader??={}).rank=rank;
 if(rank<=old||!leader(b,c,'fortuna'))return;
 const ids:string[]=[];for(const u of b.units.filter(u=>u.side==='party'&&u.hp>0)){u.ultimateCharge=Math.min(100,(u.ultimateCharge??0)+15*(rank-old));ids.push(u.uid);}
 emit({kind:'buff',actorId:'party:fortuna',targetIds:ids,text:'幸運の隊商 — 討伐ランクの充填',unitsAfter:structuredClone(b.units)});
}
export function validRoyalLeaderState(v:unknown):v is RoyalLeaderState{
 if(!v||typeof v!=='object')return false;const x=v as Record<string,unknown>;
 return Object.keys(x).every(k=>['verdictRound','verdictUsedRound','rank'].includes(k))&&Object.entries(x).every(([k,n])=>Number.isSafeInteger(n)&&Number(n)>=0&&Number(n)<=(k==='rank'?4:Number.MAX_SAFE_INTEGER));
}
