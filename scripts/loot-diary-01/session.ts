import {mkdirSync,writeFileSync} from 'node:fs';
import {content} from '../../src/content';
import {createInitialSave,applyCommand} from '../../src/application/game';
import {assertSaveCompatibility} from '../../src/platform/save';
import {partyOrderOptions} from '../../src/domain/party-orders';
import {bossWindupStatus} from '../../src/domain/boss-pressure';
import type {GameCommand,GameSave} from '../../src/domain/types';
const O='artifacts/loot-diary-01';mkdirSync(O,{recursive:true});
let s=createInitialSave(content,20261107),serial=0;
s.novels={seen:['rebirth-introduction',...Array.from({length:5},(_,i)=>`rebirth-${i+1}-after`)]};s.reincarnation={version:1,count:1,previousChoices:{}};
s.worldStory={version:1,profile:{name:'ユイ',voice:'soft',favorite:'tea'},carriedChapters:[],completed:content.worldStory!.nodes.map(n=>n.id),choices:{},position:{x:.47,y:.77},dungeonProgress:content.worldStory!.chapters.flatMap(c=>c.dungeonIds)};
s.completedDungeonIds=[...s.worldStory.dungeonProgress!,...Array.from({length:5},(_,i)=>`rebirth-${i+1}`)];s.ownedIds=content.characters.filter(c=>c.published).map(c=>c.id);s.partyIds=['nox','mireille','liora','noelle'];s.leaderId='liora';s.gold=30000;s.potions=99;s.materials={};s.memoryGems!.items=s.partyIds.map((id,i)=>({id:'fixture-'+i,defId:['dawn-crown','pale-ward','twin-tide','echo-shard'][i],variant:'pure',locked:true,roll:{power:230,trait:(i===0||i===3?'mercy':'bulwark'),value:230}}));s.memoryGems!.equipped=Object.fromEntries(s.partyIds.map((id,i)=>[id,'fixture-'+i]));s.memoryGems!.seen=s.memoryGems!.items.map(g=>g.defId);for(const f of ['sanctuary','grave','clock'])s.memoryGems!.dust[f]=270;
s.settings={...s.settings,speed:2,bgmVolume:0,seVolume:.65,reducedMotion:false};assertSaveCompatibility(s,content);
writeFileSync(O+'/starting-save.json',JSON.stringify(s));
const sessions:any[]=[];let active:any;
function doCommand(c:GameCommand){const before=s.revision;s=applyCommand(s,c,content,{now:1794038400000+serial++});active?.commands.push(c);if(s.revision!==before+1)throw Error('Command did not apply '+c.type);}
function drain(){let n=0;while(s.battle?.phase==='playing'){doCommand({type:'replay'});if(n++>2000)throw Error('replay loop');}}
function battle(id:string,dungeonId:string){active={id,initial:structuredClone(s),commands:[],rounds:[],readyStates:[]};sessions.push(active);doCommand({type:'depart',dungeonId,potions:5});active.captureInitial=structuredClone(s);drain();let rounds=0;
 while(s.battle?.phase==='ready'&&rounds++<180){if(s.battle.wave===1&&!active.bossCapture){active.bossCapture=structuredClone(s);active.bossCommandOffset=active.commands.length;}active.readyStates.push({offset:active.commands.length,save:structuredClone(s)});const b=s.battle!,friends=b.units.filter(u=>u.side==='party'&&u.hp>0),foes=b.units.filter(u=>u.side==='enemy'&&u.hp>0),weak=[...friends].sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];
  doCommand({type:'strategy',strategy:'survival'});const role=friends.some(u=>u.hp<u.maxHp*.65)?'healer':'caster';if(friends.some(u=>content.characters.find(c=>c.id===u.characterId)!.role===role))doCommand({type:'crystalRole',role:role as any});
  if(weak&&weak.hp<weak.maxHp*.5&&s.battle!.potionsRemaining&&!s.battle!.potionUsed)doCommand({type:'potion',unitId:weak.uid});
  const stage=content.dungeons.find(d=>d.id===dungeonId)!,boss=foes.find(u=>u.boss),pressure=boss&&stage.bossStrike?bossWindupStatus(boss,stage.bossStrike,b.round):undefined;
  const focus=(pressure?.phase==='charging'?boss:foes.find(u=>content.characters.find(c=>c.id===u.characterId)?.role==='healer')??[...foes].sort((a,c)=>a.hp-c.hp)[0]);if(focus)doCommand({type:'focusEnemy',battleId:b.id,unitId:focus.uid});
  for(const u of friends)if((u.ultimateCharge??0)>=100&&!u.ultimateQueued&&pressure?.phase!=='charging'&&(content.characters.find(c=>c.id===u.characterId)!.role!=='healer'||friends.some(x=>x.hp<x.maxHp*.65)))doCommand({type:'ultimate',unitId:u.uid});
  const pilot=friends.find(u=>u.characterId==='nox');if(pilot){const ult=partyOrderOptions(pilot,s.battle!,content).find(o=>o.id==='ultimate'&&!o.disabled);doCommand({type:'partyOrder',battleId:b.id,order:pressure?.phase==='striking'?{kind:'guard'}:ult&&pressure?.phase!=='charging'?ult.order!:null});}
  doCommand({type:'round'});active.rounds.push({round:s.battle!.round,wave:s.battle!.wave,seed:s.battle!.seed,events:s.battle!.events});drain();
 }
 if(!s.battle||!['reward','failed'].includes(s.battle.phase))throw Error('Battle did not terminate');
 const b=s.battle;active.tailCapture=active.readyStates.at(-5);const states=active.readyStates.filter((x:any)=>x.save.battle.wave===1);active.captureSlices=[['start',0],['middle',Math.max(0,Math.floor(states.length/2)-1)],['end',Math.max(0,states.length-2)]].map(([tag,i])=>({tag,initial:states[i as number].save,start:states[i as number].offset,end:states[(i as number)+2]?.offset??active.commands.length,expected:states[(i as number)+2]?.save??structuredClone(s)}));delete active.readyStates;active.outcome={phase:b.phase,rounds:active.rounds.length,wave:b.wave,bossHp:b.units.find(u=>u.boss)?.hp,survivors:b.units.filter(u=>u.side==='party'&&u.hp>0).length,potions:5-b.potionsRemaining,materials:b.pendingMaterials};active.result=structuredClone(s);
 doCommand({type:b.phase==='reward'?'claim':'leaveFailure'});active.final=structuredClone(s);writeFileSync(O+'/'+id+'.json',JSON.stringify(active));console.log(id,JSON.stringify(active.outcome));active=undefined;
}
battle('attempt-before','rebirth-6');for(let i=1;i<=9;i++)battle('farm-'+i,'rebirth-1');
active={id:'forge',initial:structuredClone(s),commands:[]};sessions.push(active);doCommand({type:'craftAscendedGem',defId:'dawn-crown',variant:'pure',tier:7,trait:'mercy'});const gem=s.memoryGems!.items.at(-1)!;doCommand({type:'equipMemoryGem',characterId:'nox',gemId:gem.id});active.gem=gem;active.final=structuredClone(s);writeFileSync(O+'/forge.json',JSON.stringify(active));active=undefined;
battle('attempt-after','rebirth-6');doCommand({type:'party',partyIds:s.partyIds,leaderId:'nox'});battle('attempt-leader','rebirth-6');writeFileSync(O+'/session-summary.json',JSON.stringify({version:content.appVersion,startingSeed:20261107,scope:'Prepared endgame ownership; public rules; scripted legal operation; single attempts are not a causal or win-rate study.',runs:sessions.map(x=>({id:x.id,outcome:x.outcome,gem:x.gem})),ending:s},null,2));
