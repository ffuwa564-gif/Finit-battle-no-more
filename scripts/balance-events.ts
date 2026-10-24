import {content} from '../src/content';
import {advanceReplay,createBattle,resolveRound,usePotion,dungeonDifficulty} from '../src/domain/engine';
import type {Strategy} from '../src/domain/types';
export function simulate(dungeonId:string,party:string[],leader:string,seed:number,strategy:Strategy='balanced',potions=5){
 let battle=createBattle(content,party,leader,dungeonId,potions,seed,'sim');let turns=0;
 while((battle.phase==='playing'||battle.phase==='ready')&&turns<600){
  while(battle.phase==='playing')battle=advanceReplay(battle,content);
  if(battle.phase!=='ready')break;
  battle.strategy=strategy;
  const lowest=battle.units.filter(u=>u.side==='party'&&u.hp>0).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(lowest&&lowest.hp/lowest.maxHp<.65&&battle.potionsRemaining>0)battle=usePotion(battle,lowest.uid);
  battle=resolveRound(battle,content).battle;turns++;
 }
 return{win:battle.phase==='reward',turns,left:battle.units.filter(u=>u.side==='party'&&u.hp>0).length};
}

const rows=[];
for(const stage of content.dungeons.filter(d=>d.eventId))for(const [name,party,leader,strategy,potions]of [
 ['初期・均衡・薬なし',['elaine','liora','seris','noelle'],'liora','balanced',0],
 ['通常版入り・均衡',['elaine','liora','seris','kuzuha'],'kuzuha','balanced',5],
 ['通常版＋回復2・生存',['elaine','veil-priestess','liora','kuzuha'],'liora','survival',5],
 ['通常版＋回復2・均衡',['elaine','veil-priestess','liora','kuzuha'],'liora','balanced',5],
 ['SSR編成・均衡',['mireille','evelyn','asteria','kuzuha'],'evelyn','balanced',5],
] as const){const tests=Array.from({length:50},(_,i)=>simulate(stage.id,[...party],leader,i+1,strategy,potions));const row={difficulty:stage.tierName,index:dungeonDifficulty(stage,content),team:name,wins:tests.filter(r=>r.win).length,seeds:50,meanRounds:Math.round(tests.reduce((s,r)=>s+r.turns,0)/50)};rows.push(row);console.log(JSON.stringify(row));}
const {writeFileSync}=await import('node:fs');writeFileSync('docs/reports/event-balance.json',JSON.stringify(rows,null,2));
