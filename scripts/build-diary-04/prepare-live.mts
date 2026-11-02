/** Current shipped1.11 native application, manual Fio overflow orders; no research rule. */
import{content,gem}from'../diary-part3/core';
import{createInitialSave,applyCommand}from'../../src/application/game';
import{assertValidSave}from'../../src/platform/save';
import{partyOrderOptions}from'../../src/domain/party-orders';
import{writeFileSync}from'node:fs';import{gzipSync}from'node:zlib';
let s:any=createInitialSave(content,42);const party=['fio','seris','ione','ruka'];
s.ownedIds=[...new Set([...s.ownedIds,...party])];s.partyIds=party;s.leaderId='fio';s.completedDungeonIds=['silent-cathedral'];s.novels={seen:(content.novels??[]).map(n=>n.id)};s.potions=5;
s.memoryGems={items:party.map((id,i)=>({...gem(i===0?'twin-tide':'echo-shard',3,'none',0),id:'live-fio-'+i})),equipped:Object.fromEntries(party.map((id,i)=>[id,'live-fio-'+i])),dust:{sanctuary:0,clock:0,grave:0},seen:[],craftSerial:0};assertValidSave(s);
const initial=structuredClone(s),allCommands:any[]=[],events:any[]=[];const issue=(c:any)=>{s=applyCommand(s,c,content);allCommands.push(c)};
issue({type:'depart',dungeonId:'ivory-tower-001',potions:5});const fixture=structuredClone(s);
const ready=()=>{while(s.battle?.phase==='playing'){events.push(structuredClone(s.battle.events[s.battle.cursor]));issue({type:'replay'})}};ready();const groups:any[]=[];
for(let i=0;i<3&&!['reward','failed'].includes(s.battle.phase);i++){
 const before=structuredClone(s),commands:any[]=[];const push=(c:any)=>{issue(c);commands.push(c)};const b=s.battle,pilot=b.units.find((u:any)=>u.side==='party'&&u.characterId==='fio');const options=partyOrderOptions(pilot,b,content);const desired=options.find(o=>o.order?.kind==='skill'&&o.order.skillId==='scout-fio-overflow'&&!o.disabled);
 push({type:'partyOrder',battleId:b.id,order:desired?.order??null});push({type:'round',battleId:b.id});ready();groups.push({index:i,round:before.battle.round,wave:before.battle.wave,kind:'round',commands,before,after:structuredClone(s)});
}
assertValidSave(s);const overflow=events.filter(e=>e.skillId==='scout-fio-overflow');if(!overflow.length||!events.some(e=>e.text?.includes('余り布が障壁')))throw Error('Actual Fio overflow did not create new barrier');
const result={initial,fixture,final:structuredClone(s),groups,events,allCommands,nativeVerified:true,researchFixture:true,config:{party,leader:'fio',gems:s.memoryGems.items},excerpt:'First3 rounds, synthetic comparison-owned T3. Manual current Fio overflow orders; no proposed skill.',sourceGameCommit:'489d5a4b15f02385c7229a2b2ff29f76da0abf44'};
writeFileSync('artifacts/build-diary-04/proofs/live-fio.json.gz',gzipSync(JSON.stringify(result)));console.log('CURRENT LIVE FIO',groups.length,'rounds',overflow.map(e=>e.text));
