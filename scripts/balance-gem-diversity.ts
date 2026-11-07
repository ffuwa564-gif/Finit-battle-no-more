/** Reproducible finite candidate search, not a claim of global party optimality. */
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {content} from '../src/content';
import {createBattle,advanceReplay,resolveRound,usePotion,proceedToHuntBoss} from '../src/domain/engine';
import {partyOrderOptions} from '../src/domain/party-orders';
import {GEM_DEFINITIONS,gemDefinitionForSkill,type MemoryGem} from '../src/domain/memory-gems';
import {characterSkills} from '../src/domain/character-skills';
import {combatProfile,COMBAT_STYLES,COMBAT_REFERENCE} from '../src/domain/combat-profiles';
import type {Strategy} from '../src/domain/types';
const endgame=process.argv.includes('--tower-affixes');
interface Config {affixes?:boolean;ids:string[];leader:string;stones:string[];strategy:Strategy}
const sets=[['seris','noelle','mireille','liora'],['seris','noelle','elaine','liora'],['pale-wolf','noelle','miette','athena'],['lunette','mireille','liora','fortuna'],['astraea','athena','selene','nox'],['artemis','athena','selene','vespera'],['nox','athena','benzaiten','eos-standard'],['lunette-awakened','evelyn','selene','fortuna'],['nox','asteria','selene','athena']];
const scenarios=[{id:'hunt-early',stage:'veiled-cloister',hunt:true,early:true},{id:'hunt-full',stage:'veiled-cloister',hunt:true,early:false},{id:'tower',stage:'ivory-tower-001',hunt:false,early:false}];
const tiers=[{tier:3,power:80},{tier:4,power:130},{tier:6,power:endgame?239:230}];
const seeds={train:Array.from({length:8},(_,i)=>100+i),confirm:Array.from({length:200},(_,i)=>10001+i)};
function candidates(s:typeof scenarios[number]):Config[]{return sets.flatMap(ids=>{
 const old=ids.map((_,i)=>['dawn-crown','pale-ward','twin-tide','echo-shard'][i]);
 const fresh=ids.map((_,i)=>s.hunt?['overflow-ember','sweep-prism','camp-lantern','boss-reserve'][i]:['dawn-crown','concord-mark','pale-ward','disrupt-sigil'][i]);
 return [...new Set(ids)].flatMap(leader=>(['balanced','aggressive','survival']as const).flatMap(strategy=>[old,fresh].map(stones=>({ids,leader,stones,strategy,...(endgame?{affixes:true}:{})}))));
});}
function simulate(cfg:Config,s:typeof scenarios[number],power:number,seed:number){
 let b=createBattle(content,cfg.ids,cfg.leader,s.stage,5,seed,'diversity',s.hunt?'hunt':undefined);
 b.memoryGems=Object.fromEntries(cfg.ids.map((id,i)=>[id,{id:`fair-${i}`,defId:cfg.stones[i],variant:'pure',roll:{power,trait:cfg.affixes?(['attack','area','drain','pierce','dawn','shatter'].includes(GEM_DEFINITIONS.find(g=>g.id===cfg.stones[i])!.skill.template)?'mercy':'bulwark'):'none',value:cfg.affixes?power:0}} satisfies MemoryGem]));
 let rounds=0;const casts:Record<string,number>={};
 while(!['reward','failed'].includes(b.phase)&&rounds<100){
  if(b.phase==='playing'){b.cursor=b.events.length-1;b=advanceReplay(b,content);continue;}
  if(s.early&&b.hunt?.stage==='hunting'&&b.hunt.kills>=12){b=proceedToHuntBoss(b,content);continue;}
  b.strategy=cfg.strategy;const friends=b.units.filter(u=>u.side==='party'&&u.hp>0),enemies=b.units.filter(u=>u.side==='enemy'&&u.hp>0);
  const weak=[...friends].sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];if(weak&&weak.hp<weak.maxHp*.4&&b.potionsRemaining&&!b.potionUsed)b=usePotion(b,weak.uid);
  const boss=enemies.find(u=>u.boss),target=boss??[...enemies].sort((a,c)=>a.hp-c.hp)[0];b.focusTargetId=target?.uid;
  for(const u of friends)if((u.ultimateCharge??0)>=100&&((content.characters.find(c=>c.id===u.characterId)!.role!=='healer')||friends.some(u=>u.hp<u.maxHp*.65)))u.ultimateQueued=true;
  const pilot=friends.find(u=>u.characterId===cfg.ids[0]);
  if(pilot){const options=partyOrderOptions(pilot,b,content).filter(o=>!o.disabled);const ultimate=options.find(o=>o.id==='ultimate');if(ultimate)b.partyOrder=ultimate.order!;else delete b.partyOrder;}
  b=resolveRound(b,content).battle;rounds++;
  for(const e of b.events)if(e.actionSelection&&e.skillId){const id=gemDefinitionForSkill(e.skillId)?.id;if(id)casts[id]=(casts[id]??0)+1;}
 }
 return{seed,win:b.phase==='reward',rounds,potions:5-b.potionsRemaining,survivors:b.units.filter(u=>u.side==='party'&&u.hp>0).length,kills:b.hunt?.kills??0,hands:b.hunt?.actions??0,casts};
}
const mean=(xs:number[])=>xs.reduce((a,b)=>a+b,0)/xs.length;
function summary(rows:ReturnType<typeof simulate>[]){const wins=rows.filter(r=>r.win).length,n=rows.length,p=wins/n,z=1.96,den=1+z*z/n,mid=(p+z*z/(2*n))/den,radius=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;
 return{n,wins,winRate:p,wilson95:[mid-radius,mid+radius],rounds:mean(rows.map(r=>r.rounds)),potions:mean(rows.map(r=>r.potions)),allAlive:rows.filter(r=>r.win&&r.survivors===4).length/n,kills:mean(rows.map(r=>r.kills)),hands:mean(rows.map(r=>r.hands)),casts:rows.reduce((a,r)=>{for(const[k,v]of Object.entries(r.casts))a[k]=(a[k]??0)+v;return a;},{}as Record<string,number>)};
}
function score(x:ReturnType<typeof summary>){return x.winRate*10000+x.allAlive*100+(x.hands>0?x.kills*2:0)-x.rounds-x.potions*2;}
const supplement=process.argv.includes('--supplement-high');
const out='artifacts/gem-diversity';mkdirSync(out,{recursive:true});const results:any[]=[];
if(process.argv.includes('--verify')){
 const frozen=JSON.parse(readFileSync(`${out}/results.json`,'utf8'));
 for(const record of frozen.results){const scenario=scenarios.find(s=>s.id===record.scenario)!,tier=tiers.find(t=>t.tier===record.tier)!;
  for(const old of record.rows.slice(0,2)){const actual=simulate(record.config,scenario,tier.power,old.seed);if(JSON.stringify(actual)!==JSON.stringify(old))throw Error(`Replay mismatch: ${record.scenario}/${record.tier}/${record.group}/${old.seed}`);}
 }
 console.log(`Verified ${frozen.results.length*2} frozen native-engine outcomes against the final source.`);process.exit(0);
}
for(const scenario of scenarios.filter(s=>!endgame||s.id==='tower'))for(const tier of tiers.filter(t=>!endgame||t.tier===6)){
 const pool=candidates(scenario).filter(cfg=>!supplement||cfg.ids.join(',')==='nox,asteria,selene,athena'),training=pool.map(config=>({config,result:summary(seeds.train.map(seed=>simulate(config,scenario,tier.power,seed)))}));
 for(const group of (supplement?['high']:['mixed','high'])as ('mixed'|'high')[]){const shortlist=training.filter(r=>r.config.ids.some(id=>content.characters.find(c=>c.id===id)!.rarity==='R')===(group==='mixed')).sort((a,b)=>score(b.result)-score(a.result));
  const best=shortlist[0];const rows=seeds.confirm.map(seed=>simulate(best.config,scenario,tier.power,seed));const result={scenario:scenario.id,tier:tier.tier,group,config:best.config,training:best.result,confirmation:summary(rows),rows};results.push(result);console.log(scenario.id,tier.tier,group,JSON.stringify({...result,rows:undefined}));
 }
 writeFileSync(`${out}/${endgame?'endgame-tower':supplement?'high-balanced-supplement':'results'}.json`,JSON.stringify({version:content.appVersion,combatReference:COMBAT_REFERENCE,contract:content.rulesVersion,seeds,candidateCount:pool.length,results},null,2));
}
const published=content.characters.filter(c=>c.published);const roster=published.map(c=>({id:c.id,family:c.familyId??c.id,rarity:c.rarity,role:c.role,style:combatProfile(c).style,favorites:combatProfile(c).stones,skills:characterSkills(c,content).map(s=>({id:s.id,template:s.template,strength:s.strength})),status:'not-individually-certified'}));
writeFileSync(`${out}/roster.json`,JSON.stringify({styles:COMBAT_STYLES,roster},null,2));
