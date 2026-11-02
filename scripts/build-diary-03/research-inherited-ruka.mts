/** Execute with tsx. Native turn order, damage, cooldowns, ultimates and side actions retained. */
import{writeFileSync}from'node:fs';
import{content}from'/tmp/build-diary-03-lab/src/content/index';
import{createBattle,resolveRound,advanceReplay,usePotion,useBattleBloom,useBattleFairy}from'/tmp/build-diary-03-lab/src/domain/engine';
import{gem,valid}from'/tmp/build-diary-03-lab/scripts/diary-part3/core';
import{partyOrderOptions}from'/tmp/build-diary-03-lab/src/domain/party-orders';
import{gemPowerMultiplier,gemSkill}from'/tmp/build-diary-03-lab/src/domain/memory-gems';
import{threadCount,STITCH,SPOOL}from'/tmp/build-diary-03-lab/src/domain/research-ruka';
const originalRuka=[...content.characters.find(c=>c.id==='ruka')!.skillIds];content.skills.push({id:STITCH,name:'留め縫い（研究案）',template:'debuff',strength:19,soundProfile:'debuff'});
const loom={...structuredClone(content.characters.find(c=>c.id==='pale-wolf')!),id:'research-unravelling-loom',name:'ほどける回廊の織機',strength:10,role:'attacker',skillIds:['attack-10','drain-10']}as const;content.characters.push(loom as any);
function stage(id:string,hp=1800,atk=40){content.dungeons.push({id,name:'ほどける回廊（研究用）',subtitle:'HPが4Rごとに戻る',description:'研究用。全HPダメージは1R合計300まで。4R終了ごとにHP全回復。回復阻害は適用。40R制限。',artId:'pale-wolf-art',published:true,kind:'trial',towerFloor:999,bossScale:{hp:hp,attack:atk/32*100},waves:[[{characterId:loom.id,boss:true}]]});}
stage('research-loom');stage('research-loom-hard',1800,100);stage('research-loom-hp2400',2400,40);stage('research-loom-hp3600',3600,40);stage('research-loom-hp4800',4800,40);stage('research-loom-final',4800,160);stage('research-loom-attack240',4800,240);
type Opt={party:string[];leader?:string;gems?:any[];tier?:number;skill?:boolean;stock?:boolean;noCap?:boolean;noReset?:boolean;timing?:'early'|'late';cap?:number;period?:number;releaseCapOnWound?:boolean;stage?:string;sideActions?:boolean;record?:boolean;holdDPSUlt?:boolean;emergencyFirst?:boolean;potions?:number};
const spool=()=>({id:'spool',defId:SPOOL,variant:'pure',roll:{power:80,trait:'none',value:0}});
function gears(ids:string[],tier:number){return ids.map(id=>id==='fio'?spool():id==='ruka'?gem('echo-shard',tier,'mercy',tier):['athena','liora','liora-awakened','neri','iwanagahime'].includes(id)?gem('pale-ward',tier,'bulwark',tier):['benzaiten','selene','elaine','elaine-awakened'].includes(id)?gem('twin-tide',tier,'bulwark',tier):gem('echo-shard',tier,'mercy',tier));}
function settle(b:any){if(b.phase==='playing'){b.cursor=b.events.length-1;return advanceReplay(b,content);}return b;}
export function trial(opt:Opt,seed:number){
 const ids=opt.party,tier=opt.tier??4,leader=opt.leader??(ids.includes('ruka')?'ruka':ids[0]);const gs=opt.gems??gears(ids,tier);content.characters.find(c=>c.id==='ruka')!.skillIds=opt.skill===false?[...originalRuka]:[...originalRuka,STITCH];
 if(!valid({party:ids,leader,gems:gs}))throw Error('Illegal config '+JSON.stringify(opt));
 let b:any=createBattle(content,ids,leader,opt.stage??'research-loom',opt.potions??5,seed,'research-'+seed);b.memoryGems=Object.fromEntries(ids.flatMap((id,i)=>gs[i]?[[id,{...gs[i],id:'slot-'+i}]]:[]));b.researchRules={cap:opt.noCap?1e9:opt.cap??300,period:opt.period??4,stockEnabled:opt.stock!==false,rewindEnabled:!opt.noReset,releaseCapOnWound:opt.releaseCapOnWound??false,emergencyFirst:opt.emergencyFirst??false};b=settle(b);const trace:any[]=[];const captureSteps:any[]=[];const captureFixture=structuredClone(b);let rounds=0,pots=0,flowers=0,fairies=0;
 while(!['reward','failed'].includes(b.phase)&&rounds<100){
  const alive=b.units.filter((u:any)=>u.side==='party'&&u.hp>0);const low=[...alive].sort((a:any,c:any)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];if(!low)throw Error('Invalid boundary');
  if(low.hp<low.maxHp*.7&&b.potionsRemaining&&!b.potionUsed){{const before=structuredClone(b),after=usePotion(b,low.uid);if(opt.record)captureSteps.push({kind:'potion',command:{type:'potion',unitId:low.uid},before,after:structuredClone(after)});b=settle(after);}pots++;continue;}
  if(opt.sideActions!==false){if(b.fairies?.visitor){{const before=structuredClone(b),id=b.fairies.visitor.id,after=useBattleFairy(b,id,content);if(opt.record)captureSteps.push({kind:'battleFairy',command:{type:'battleFairy',fairyId:id},before,after:structuredClone(after)});b=settle(after);}fairies++;continue;}if(b.blooms?.flower){{const before=structuredClone(b),id=b.blooms.flower.id,after=useBattleBloom(b,id,content).battle;if(opt.record)captureSteps.push({kind:'battleBloom',command:{type:'battleBloom',bloomId:id},before,after:structuredClone(after)});b=settle(after);}flowers++;continue;}}
  b.strategy='survival';b.crystalRole=low.hp<low.maxHp*.7?'healer':'attacker';const boss=b.units.find((u:any)=>u.side==='enemy'&&u.hp>0);b.focusTargetId=boss.uid;
  for(const u of alive)if(u.characterId!==ids[0]&&u.ultimateCharge===100){const damageRole=['attacker','area_attacker','debuffer'].includes(content.characters.find(c=>c.id===u.characterId)!.role);if(!opt.holdDPSUlt||!damageRole||(boss.researchWoundUntil??-1)>=b.round)u.ultimateQueued=true;}
  const pilot=alive.find((u:any)=>u.characterId===ids[0]);if(pilot){const opts=partyOrderOptions(pilot,b,content).filter(o=>!o.disabled);const wound=opts.find(o=>o.order?.kind==='skill'&&o.order.skillId===STITCH);const rem=b.round%(opt.period??4);const timely=opt.timing==='early'?rem===2:opt.timing==='late'?rem===1:rem===0||rem===(opt.period??4)-1;
   const needWound=(boss.researchWoundUntil??-1)<b.round+(rem===(opt.period??4)-1?1:0);if(pilot.characterId==='ruka'&&wound&&(threadCount(b,pilot)>0||(opt.releaseCapOnWound&&b.units.some((u:any)=>u.side==='party'&&u.hp>0&&(u.barrier??0)>0&&u.barrierUntil!==undefined&&u.barrierUntil<b.round)))&&timely&&needWound)b.partyOrder=wound.order;
   else{const available=opts.filter(o=>['attack','pierce','drain','dawn','area'].includes(o.template)&&o.order?.kind==='skill'&&o.order.skillId!=='scout-ruka-shear');const scored=available.map(o=>{const sk=o.order?.kind==='skill'?content.skills.find(s=>s.id===o.order!.skillId)??gemSkill(b.memoryGems[pilot.characterId]):undefined;return{o,v:(sk!.strength+30)*(o.id.startsWith('skill:memory:')?gemPowerMultiplier(b.memoryGems[pilot.characterId]):1)};}).sort((a,c)=>c.v-a.v);b.partyOrder=(opts.find(o=>o.id==='ultimate'&&(!opt.holdDPSUlt||!['attacker','area_attacker','debuffer'].includes(content.characters.find(c=>c.id===pilot.characterId)!.role)||(boss.researchWoundUntil??-1)>=b.round))??scored[0]?.o)?.order??{kind:'attack'};}
  }
  const before=b.round;const beforeBattle=structuredClone(b);b=resolveRound(b,content).battle;if(opt.record)captureSteps.push({kind:'round',before:beforeBattle,after:structuredClone(b)});rounds++;if(opt.record)trace.push({round:before,bossHp:b.units.find((u:any)=>u.side==='enemy').hp,party:b.units.filter((u:any)=>u.side==='party').map((u:any)=>({id:u.characterId,hp:u.hp,barrier:u.barrier??0,until:u.barrierUntil,stock:u.researchStock??0,thread:u.scoutThreadUntil})),events:b.events.map((e:any)=>({text:e.text,amount:e.amount,skill:e.skillId}))});b=settle(b);
 }
 return{seed,win:b.phase==='reward',rounds,pots,flowers,fairies,blocked:b.researchRules.blocked??0,resets:b.researchRules.restored??0,bossHP:b.units.find((u:any)=>u.side==='enemy').hp,survivors:b.units.filter((u:any)=>u.side==='party'&&u.hp>0).length,...(opt.record?{trace,captureFixture,captureSteps,finalBattle:structuredClone(b)}:{})};
}
const base=['ruka','nox','athena','fio'];
const cases:{id:string;opt:Opt;n?:number}[]=[
 {id:'full-t4',opt:{party:base}},{id:'full-t3',opt:{party:base,tier:3}},{id:'full-t6',opt:{party:base,tier:6}},
 {id:'guard-liora',opt:{party:['ruka','nox','liora-awakened','fio']}},{id:'guard-neri',opt:{party:['ruka','nox','neri','fio']}},{id:'no-athena-budget',opt:{party:['ruka','seris','liora','fio'],tier:3}},
 {id:'damage-seris',opt:{party:['ruka','seris-awakened','liora-awakened','fio']}},{id:'without-new-skill',opt:{party:base,skill:false}},
 {id:'without-new-gem',opt:{party:base,gems:[gem('echo-shard',4,'mercy',4),gem('echo-shard',4,'mercy',4),gem('pale-ward',4,'bulwark',4),gem('twin-tide',4,'bulwark',4)]}},
 {id:'without-new-leader',opt:{party:base,stock:false}},{id:'athena-leader',opt:{party:base,leader:'athena'}},{id:'cast-too-early',opt:{party:base,timing:'early'}},{id:'cast-too-late',opt:{party:base,timing:'late'}},
 {id:'no-sideactions-no-potions',opt:{party:base,potions:0,sideActions:false}},{id:'harder-attacks',opt:{party:base,stage:'research-loom-hard'}},
 {id:'t6-burst-no-ruka',opt:{party:['astraea','seris-awakened','nox','eos'],tier:6}},{id:'t6-athena-turtle',opt:{party:['benzaiten','athena','selene','elaine-awakened'],leader:'athena',tier:6}},
 {id:'t6-sleep-control',opt:{party:['nemuria','athena','nox','selene'],leader:'athena',tier:6,gems:[gem('dream-lace',6,'bulwark',6),gem('pale-ward',6,'bulwark',6),gem('echo-shard',6,'mercy',6),gem('twin-tide',6,'bulwark',6)]}},
 {id:'negative-no-reset',opt:{party:['astraea','seris-awakened','nox','eos'],tier:6,noReset:true}},
 {id:'negative-no-cap',opt:{party:['astraea','seris-awakened','nox','eos'],tier:6,noCap:true}},
];
let selected=process.env.VERSION==='v2'?[...['research-loom-hp2400','research-loom-hp3600','research-loom-hp4800'].flatMap(stage=>[3,4,5,6].map(tier=>({id:`v2-${stage}-${tier}`,opt:{party:base,stage,tier,releaseCapOnWound:true}}))),
 ...cases.filter(c=>!['full-t3','full-t4','full-t6','harder-attacks','negative-no-reset','negative-no-cap'].includes(c.id)).map(c=>({...c,id:'v2-'+c.id,opt:{...c.opt,releaseCapOnWound:true,stage:'research-loom-hp3600'}})),
 {id:'v2-ruka-no-generator',opt:{party:['ruka','nox','astraea','seris-awakened'],gems:Array.from({length:4},()=>gem('echo-shard',6,'mercy',6)),tier:6,stage:'research-loom-hp3600',releaseCapOnWound:true}},
 {id:'v2-no-ruka-no-cap-control',opt:{party:['astraea','seris-awakened','nox','eos'],tier:6,noCap:true,stage:'research-loom-hp3600',releaseCapOnWound:true}},
 {id:'v2-no-ruka-no-reset-control',opt:{party:['astraea','seris-awakened','nox','eos'],tier:6,noReset:true,stage:'research-loom-hp3600',releaseCapOnWound:true}},
]:cases;
if(['v3','v4'].includes(process.env.VERSION??''))selected=[
 ...[3,4,5,6].map(tier=>({id:'v3-tier'+tier,opt:{party:base,tier,stock:false,releaseCapOnWound:true,stage:'research-loom-final'}})),
 ...cases.filter(c=>!['full-t3','full-t4','full-t6','harder-attacks','negative-no-reset','negative-no-cap','without-new-leader'].includes(c.id)).map(c=>({...c,id:'v3-'+c.id,opt:{...c.opt,stock:false,releaseCapOnWound:true,stage:'research-loom-final'}})),
 {id:'v3-ruka-no-generator',opt:{party:['ruka','nox','astraea','seris-awakened'],gems:Array.from({length:4},()=>gem('echo-shard',6,'mercy',6)),tier:6,stock:false,releaseCapOnWound:true,stage:'research-loom-final'}},
 {id:'v3-attack240',opt:{party:base,stock:false,releaseCapOnWound:true,stage:'research-loom-attack240'}},
 {id:'v3-no-ruka-no-cap-control',opt:{party:['astraea','seris-awakened','nox','eos'],tier:6,noCap:true,stock:false,stage:'research-loom-final',releaseCapOnWound:true}},
 {id:'v3-no-ruka-no-reset-control',opt:{party:['astraea','seris-awakened','nox','eos'],tier:6,noReset:true,stock:false,stage:'research-loom-final',releaseCapOnWound:true}},
];
if(process.env.VERSION==='v4')selected=selected.map(c=>({...c,id:c.id.replace('v3-','v4-'),opt:{...c.opt,emergencyFirst:true}}));
if(process.env.LIB_ONLY!=='1'){
const out:any[]=[];
for(const c of selected){const rows=[];for(let seed=1;seed<=(c.n??100);seed++)rows.push(trial(c.opt,seed));const summary={id:c.id,opt:c.opt,n:rows.length,wins:rows.filter(r=>r.win).length,meanRounds:rows.reduce((s,r)=>s+r.rounds,0)/rows.length,minRounds:Math.min(...rows.map(r=>r.rounds)),maxRounds:Math.max(...rows.map(r=>r.rounds)),meanBlocked:rows.reduce((s,r)=>s+r.blocked,0)/rows.length,meanResets:rows.reduce((s,r)=>s+r.resets,0)/rows.length,rows};out.push(summary);console.log(c.id,summary.wins+'/'+summary.n,summary.meanRounds,summary.meanBlocked,flush());}
function flush(){return'';}
writeFileSync(new URL(`../../artifacts/ruka-build-research/prototype-${process.env.VERSION??'v1'}-results.json`,import.meta.url),JSON.stringify({type:'Isolated native-engine extension; proposed new skill/gem/stage, not current deployed gameplay',cases:out},null,2));writeFileSync(new URL('../../artifacts/ruka-build-research/example-trace.json',import.meta.url),JSON.stringify(trial({party:base,record:true,stock:['v3','v4'].includes(process.env.VERSION??'')?false:true,emergencyFirst:process.env.VERSION==='v4',releaseCapOnWound:process.env.VERSION!=='v1',stage:['v3','v4'].includes(process.env.VERSION??'')?'research-loom-final':process.env.VERSION==='v2'?'research-loom-hp3600':'research-loom'},1),null,2));

}
