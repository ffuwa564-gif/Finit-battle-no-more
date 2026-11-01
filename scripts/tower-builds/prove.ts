import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {content} from '../../src/content';
import {applyCommand,createInitialSave} from '../../src/application/game';
import {assertValidSave} from '../../src/platform/save';
import {initialNovelProgress} from '../../src/domain/novels';
import type {GameCommand} from '../../src/domain/types';
const out='artifacts/tower-builds';mkdirSync(out+'/proofs',{recursive:true});
const rows=JSON.parse(readFileSync(out+'/search.json','utf8'));
for(const row of rows.filter((r:any)=>r.representative)){
 const {config:c,proof}=row;
 let save=createInitialSave(content,row.representative.seed);save.revision=999;
 save.novels=initialNovelProgress(content,false);save.partyIds=c.party;save.leaderId=c.leader;
 save.ownedIds=[...new Set([...save.ownedIds,...c.party])];save.discoveredIds=save.ownedIds;
 save.completedDungeonIds=['silent-cathedral'];save.settings={bgmVolume:0,seVolume:1,speed:2,reducedMotion:false};
 save.memoryGems!.items=c.gems.flatMap((g:any,i:number)=>g?[{...g,id:'slot-'+i}]:[]);
 save.memoryGems!.equipped=Object.fromEntries(c.party.flatMap((id:string,i:number)=>c.gems[i]?[[id,'slot-'+i]]:[]));
 save.memoryGems!.seen=[...new Set(c.gems.filter(Boolean).map((g:any)=>g.defId))] as string[];
 save=applyCommand(save,{type:'depart',dungeonId:'ivory-tower-001',potions:5},content);
 assertValidSave(save);const fixture=structuredClone(save),groups:any[]=[],events:any[]=[];
 const command=(c:GameCommand)=>{save=applyCommand(save,c,content);};
 const ready=()=>{while(save.battle?.phase==='playing'){events.push(save.battle.events[save.battle.cursor]);command({type:'replay'});}};
 ready();
 for(const h of proof.history){
  ready();const before=structuredClone(save);const commands:GameCommand[]=[];
  const push=(c:GameCommand)=>{command(c);commands.push(c);};
  if(h.type!=='round'){const {round,...action}=h;push(action);}else{
   const b=save.battle!;
   if(b.strategy!==h.strategy)push({type:'strategy',strategy:h.strategy});
   if(b.crystalRole!==h.crystalRole)push({type:'crystalRole',role:h.crystalRole});
   push({type:'focusEnemy',battleId:b.id,unitId:h.focus});
   for(const uid of h.queued)if(!save.battle!.units.find(u=>u.uid===uid)?.ultimateQueued)push({type:'ultimate',unitId:uid});
   if(save.battle!.units.find(u=>u.characterId===c.party[0])!.hp>0)push({type:'partyOrder',battleId:b.id,order:h.order??null});
   push({type:'round',battleId:b.id});
  }
  ready();groups.push({round:h.round,kind:h.type,commands,...(h.type==='round'?{before,after:structuredClone(save)}:{})});
 }
 ready();assertValidSave(save);
 const expected=proof.battle.units.map((u:any)=>[u.uid,u.hp,u.ultimateCharge??0]);
 const actual=save.battle!.units.map(u=>[u.uid,u.hp,u.ultimateCharge??0]);
 if(save.battle!.phase!=='reward'||JSON.stringify(expected)!==JSON.stringify(actual))throw Error(row.id+' native mismatch');
 const mechanism=events.filter(e=>e&&(e.ailment||e.skillId?.startsWith('memory:')||e.ultimate));
 const info={id:row.id,title:row.title,config:c,tier:row.tier,seed:row.representative.seed,rounds:proof.rounds,survivors:proof.survivors,potions:proof.pots,holdoutWins:row.holdout.filter((r:any)=>r.win).length,holdoutCount:row.holdout.length,fixture,groups,events,final:save,mechanism,nativeVerified:true};
 writeFileSync(out+'/proofs/'+row.id+'.json',JSON.stringify(info,null,2));
 console.log(row.id,'native verified',proof.rounds,info.holdoutWins+'/'+info.holdoutCount,'mechanisms',mechanism.length);
}
