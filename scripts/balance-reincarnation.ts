import {mkdirSync,writeFileSync} from 'node:fs';
import {content} from '../src/content';
import {createBattle,advanceReplay,resolveRound,usePotion} from '../src/domain/engine';
import {partyOrderOptions} from '../src/domain/party-orders';
import {bossWindupStatus} from '../src/domain/boss-pressure';
import type {MemoryGem} from '../src/domain/memory-gems';
import type {Strategy} from '../src/domain/types';
const parties=[
 {ids:['seris','noelle','elaine','liora'],leader:'liora'},
 {ids:['nox','athena','benzaiten','eos-standard'],leader:'athena'},
 {ids:['astraea','athena','selene','vespera'],leader:'astraea'},
 {ids:['nox','mireille','liora','noelle'],leader:'liora'},
 {ids:['nox','asteria','selene','athena'],leader:'athena'},
 {ids:['nox','athena','benzaiten','persephone'],leader:'athena'},
 {ids:['nox','iwanagahime','mireille','nemuria'],leader:'iwanagahime'},
 {ids:['nox','mireille','liora','tikka'],leader:'liora'},
 {ids:['seris-awakened','athena','selene','evelyn'],leader:'athena'},
];
const loadouts=[['dawn-crown','pale-ward','twin-tide','echo-shard'],['dawn-crown','hollow-lantern','pale-ward','disrupt-sigil'],['wick-stone','pale-ward','hollow-lantern','dawn-crown'],['dawn-crown','pale-ward','twin-tide','dream-lace'],['dawn-crown','concord-mark','pale-ward','disrupt-sigil']];
function simulate(stageId:string,team:typeof parties[number],stones:string[],power:number,strategy:Strategy,seed:number){
 let b=createBattle(content,team.ids,team.leader,stageId,5,seed,'reverse-balance');
 const damaging=new Set(['dawn-crown','echo-shard','disrupt-sigil','wick-stone']);
 b.memoryGems=Object.fromEntries(team.ids.map((id,i)=>[id,{id:`balance-${i}`,defId:stones[i],variant:'pure',roll:stones[i]==='wick-stone'?{power:80,trait:'none',value:0}:{power,trait:damaging.has(stones[i])?'mercy':'bulwark',value:power}}satisfies MemoryGem]));
 let rounds=0,breaks=0,guards=0;
 while(!['failed','reward'].includes(b.phase)&&rounds<150){if(b.phase==='playing'){b.cursor=b.events.length-1;b=advanceReplay(b,content);continue;}
  b.strategy=strategy;b.crystalRole=b.units.some(u=>u.side==='party'&&u.hp>0&&u.hp<u.maxHp*.65)?'healer':content.characters.find(c=>c.id===team.ids[0])!.role;const friends=b.units.filter(u=>u.side==='party'&&u.hp>0),foes=b.units.filter(u=>u.side==='enemy'&&u.hp>0);const weak=[...friends].sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];
  if(weak&&weak.hp<weak.maxHp*.5&&b.potionsRemaining&&!b.potionUsed)b=usePotion(b,weak.uid);
  const stage=content.dungeons.find(d=>d.id===stageId)!,boss=foes.find(u=>u.boss),pressure=boss&&stage.bossStrike?bossWindupStatus(boss,stage.bossStrike,b.round):undefined;
  b.focusTargetId=(pressure?.phase==='charging'?boss:foes.find(u=>content.characters.find(c=>c.id===u.characterId)?.role==='healer')??[...foes].sort((a,c)=>a.hp-c.hp)[0])?.uid;
  for(const friend of friends)if((friend.ultimateCharge??0)>=100&&!pressure?.phase.includes('charg')&&(content.characters.find(c=>c.id===friend.characterId)!.role!=='healer'||friends.some(u=>u.hp<u.maxHp*.65)))friend.ultimateQueued=true;
  const pilot=friends.find(u=>u.characterId===team.ids[0]);if(pilot){const options=partyOrderOptions(pilot,b,content).filter(o=>!o.disabled),ult=options.find(o=>o.id==='ultimate');
   if(pressure?.phase==='striking'){b.partyOrder={kind:'guard'};guards++;}else if(ult&&pressure?.phase!=='charging')b.partyOrder=ult.order!;else delete b.partyOrder;}
  b=resolveRound(b,content).battle;rounds++;breaks+=b.events.filter(e=>e.text.includes('溜めを崩した')).length;
 }
 return{seed,win:b.phase==='reward',rounds,potions:5-b.potionsRemaining,survivors:b.units.filter(u=>u.side==='party'&&u.hp>0).length,breaks,guards,wave:b.wave,bossHp:b.units.find(u=>u.boss)?.hp??null,enemiesAlive:b.units.filter(u=>u.side==='enemy'&&u.hp>0).length,materials:b.phase==='reward'?b.pendingMaterials:{}};
}
const out='artifacts/reincarnation';mkdirSync(out,{recursive:true});const results:any[]=[];
const stageArg=process.argv.find(a=>a.startsWith('--stage='))?.split('=')[1];
for(const stage of content.reincarnation!.dungeonIds.filter(id=>!stageArg||id===stageArg))for(const power of (process.argv.includes('--t7')?[290]:[230,290])){
 const candidates=parties.flatMap(base=>base.ids.flatMap(leader=>{const team={...base,leader};return loadouts.flatMap(stones=>(['survival','balanced','aggressive']as const).map(strategy=>({team,stones,strategy})));}));
 const training=candidates.map(c=>({config:c,rows:(process.argv.includes('--quick')?[101]:[101,102,103]).map(seed=>simulate(stage,c.team,c.stones,power,c.strategy,seed))}));
 const score=(r:typeof training[number])=>r.rows.filter(x=>x.win).length*10000+r.rows.reduce((a,x)=>a+x.survivors*20-x.rounds,0);
 // Keep one finalist per distinct roster/stone plan so a lucky fast leader cannot
 // eliminate every slower sustainable plan after a single development seed.
 const groups=new Map<string,typeof training[number]>();
 for(const trial of training){const key=JSON.stringify([trial.config.team.ids,trial.config.stones]),old=groups.get(key);if(!old||score(trial)>score(old))groups.set(key,trial);}
 const validated=[...groups.values()].map(t=>({...t,rows:[201,202,203,204,205].map(seed=>simulate(stage,t.config.team,t.config.stones,power,t.config.strategy,seed))}));
 const best=validated.sort((a,b)=>score(b)-score(a))[0];
 const count=process.argv.includes('--confirm')?200:8;
 const rows=Array.from({length:count},(_,i)=>simulate(stage,best.config.team,best.config.stones,power,best.config.strategy,(count===200?60001:40001)+i));
 const record={stage,power,config:best.config,developmentSeeds:process.argv.includes('--quick')?[101]:[101,102,103],selectionSeeds:[201,202,203,204,205],confirmationStart:count===200?60001:40001,trainingWins:best.rows.filter(r=>r.win).length,wins:rows.filter(r=>r.win).length,seeds:count,meanRounds:rows.reduce((a,r)=>a+r.rounds,0)/count,rows};results.push(record);console.log(JSON.stringify({...record,rows:undefined}));
 writeFileSync(`${out}/balance.json`,JSON.stringify({scope:'Finite candidate exploration, not a proof of global optimality.',contentVersion:content.contentVersion,trainingMode:process.argv.includes('--quick')?'one-seed shortlist plus five-seed selection':'three-seed shortlist plus five-seed selection',results},null,2));
}
