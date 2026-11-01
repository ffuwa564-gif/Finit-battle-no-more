import{readFileSync,writeFileSync}from'node:fs';import{content}from'../../src/content';import{applyCommand,createInitialSave}from'../../src/application/game';import{assertValidSave}from'../../src/platform/save';import{initialNovelProgress}from'../../src/domain/novels';import type{GameCommand}from'../../src/domain/types';
const id=process.argv[2]??'rewind';const row=JSON.parse(readFileSync(`artifacts/diary-111/search/${id}-representative.json`,'utf8'));const c=row.config,proof=row.result;
let save=createInitialSave(content,row.seed);save.revision=999;save.novels=initialNovelProgress(content,false);save.partyIds=c.party;save.leaderId=c.leader;save.ownedIds=[...new Set([...save.ownedIds,...c.party])];save.discoveredIds=[...save.ownedIds];save.completedDungeonIds=content.dungeons.filter(d=>d.published&&!d.towerFloor&&d.kind!=='trial').map(d=>d.id);save.settings={bgmVolume:0,seVolume:1,speed:1,reducedMotion:false};
save.memoryGems!.items=c.gems.flatMap((g:any,i:number)=>g?[{...g,id:'slot-'+i}]:[]);save.memoryGems!.equipped=Object.fromEntries(c.party.flatMap((cid:string,i:number)=>c.gems[i]?[[cid,'slot-'+i]]:[]));save.memoryGems!.seen=[...new Set(c.gems.filter(Boolean).map((g:any)=>g.defId))]as string[];assertValidSave(save);
const initialTown=structuredClone(save);save=applyCommand(save,{type:'depart',dungeonId:'ivory-tower-001',potions:5},content);assertValidSave(save);const fixture=structuredClone(save);const events:any[]=[],groups:any[]=[];const command=(c:GameCommand)=>{save=applyCommand(save,c,content);};const ready=()=>{while(save.battle?.phase==='playing'){events.push(save.battle.events[save.battle.cursor]);command({type:'replay'});}};const summary=()=>({phase:save.battle?.phase,round:save.battle?.round,units:save.battle?.units.map(u=>({id:u.characterId,hp:u.hp,charge:u.ultimateCharge??0,whiteFlower:u.whiteFlower,ailments:u.ailments}))});ready();
for(const h of proof.history){ready();const before=summary(),commands:GameCommand[]=[];const push=(c:GameCommand)=>{command(c);commands.push(c);};
 if(h.type==='potion')push({type:'potion',unitId:h.unitId});
 else if(h.type==='battleFairy')push({type:'battleFairy',fairyId:save.battle!.fairies!.visitor!.id});
 else if(h.type==='battleBloom')push({type:'battleBloom',bloomId:save.battle!.blooms!.flower!.id});
 else{
  const b=save.battle!;if(b.strategy!==h.strategy)push({type:'strategy',strategy:h.strategy});if(b.crystalRole!==h.crystalRole)push({type:'crystalRole',role:h.crystalRole});push({type:'focusEnemy',battleId:b.id,unitId:h.focus});
  for(const uid of h.queued)if(!save.battle!.units.find(u=>u.uid===uid)?.ultimateQueued)push({type:'ultimate',unitId:uid});
  if(save.battle!.units.find(u=>u.characterId===c.party[0])!.hp>0)push({type:'partyOrder',battleId:b.id,order:h.order??null});
  if(h.commandOrder)push({type:'commandOrder',battleId:b.id,order:h.commandOrder});push({type:'round',battleId:b.id});
 }
 ready();groups.push({round:h.round,kind:h.type,commands,before,after:summary()});
}
ready();assertValidSave(save);const summarize=(units:any[])=>units.map(u=>[u.uid,u.hp,u.ultimateCharge??0]);if(JSON.stringify(summarize(proof.battle.units))!==JSON.stringify(summarize(save.battle!.units))||save.battle!.phase!==proof.battle.phase)throw Error('Native command proof mismatch '+id);
const result={id,config:c,seed:row.seed,rounds:proof.rounds,nativeVerified:true,sourceCommit:'dec20ebbfb8d139713ffe847ebc48eefe8ff54ca',comparisonFixture:true,fixture,initialTown,groups,events,final:save};writeFileSync(`artifacts/diary-111/proofs/${id}.json`,JSON.stringify(result,null,2));console.log(id,'NATIVE VERIFIED',proof.rounds,save.battle!.phase,'groups',groups.length,'events',events.length);
