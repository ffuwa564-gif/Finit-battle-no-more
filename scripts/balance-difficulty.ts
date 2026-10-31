import {content as original} from '../src/content';
import {advanceReplay,createBattle,resolveRound,usePotion} from '../src/domain/engine';
import {bossWindupStatus} from '../src/domain/boss-pressure';
import {partyOrderOptions} from '../src/domain/party-orders';
import {mkdir,writeFile} from 'node:fs/promises';
import type {Content,Battle} from '../src/domain/types';
const mode=process.argv[2]??'controls';
if (!['current','early','controls'].includes(mode)) throw Error('Use current, early, or controls.');
const content:Content=structuredClone(original);
const parties=[{name:'initial',ids:['elaine','liora','seris','noelle'],leader:'liora'}, {name:'SSR',ids:['nox','athena','selene','asteria'],leader:'athena'}, {name:'awakened',ids:['seris-awakened','liora-awakened','elaine-awakened','noelle-awakened'],leader:'liora-awakened'}];
const stages=['silent-cathedral','moon-garden','stone-fountain','thorn-court','pale-throne','kuzuha-advanced','kuzuha-awakening','lunette-awakening','goddess-procession'];
if(mode==='early'){parties.splice(1);stages.splice(0,stages.length,...content.dungeons.slice(0,12).map(d=>d.id));}
if(mode==='controls'){parties.splice(0,1);stages.splice(0,stages.length,'pale-throne','kuzuha-awakening','lunette-awakening');}
const policies=mode==='controls'?['auto-items','read']:['auto','read'];
const records=[];
for(const party of parties)for(const stage of stages)for(const policy of policies){
 let wins=0,failed=0,stalled=0,rounds=0,deaths=0,potions=0,enemyActions=0,broken=0,fullStrikes=0;
 for(let seed=1;seed<=20;seed++){
  let b=createBattle(content,party.ids,party.leader,stage,5,seed,'balance');let steps=0,nrounds=0;
  while(!['failed','reward'].includes(b.phase)&&steps++<2500){
   if(b.phase==='playing'){b=advanceReplay(b,content);continue;}
   if(policy!=='auto'){
    const wounded=b.units.filter(u=>u.side==='party'&&u.hp>0).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];
    if(wounded&&wounded.hp<wounded.maxHp*.45&&b.potionsRemaining&&!b.potionUsed)b=usePotion(b,wounded.uid);
    if(policy==='read'){
    const pilot=b.units.find(u=>u.side==='party'&&u.characterId===party.ids[0])!;
    const enemies=b.units.filter(u=>u.side==='enemy'&&u.hp>0);
    const support=enemies.find(u=>content.characters.find(c=>c.id===u.characterId)?.role==='healer');
    const weak=enemies.sort((a,c)=>a.hp-c.hp)[0]; b.focusTargetId=(support??weak)?.uid;
    const opts=partyOrderOptions(pilot,b,content).filter(o=>!o.disabled);
    const strike=content.dungeons.find(d=>d.id===stage)?.bossStrike;
    const urgent=b.units.filter(u=>u.side==='party'&&u.hp>0).some(u=>u.hp<u.maxHp*.4);
    const heal=opts.find(o=>o.template==='heal'||o.template==='mend_pair');
    const ultimate=opts.find(o=>o.id==='ultimate');
    const damage=opts.filter(o=>o.order?.kind==='skill'&&['attack','area','pierce','drain','shatter','dawn'].includes(o.template)).at(-1);
    const boss=enemies.find(u=>u.boss); const pressure=boss&&strike?bossWindupStatus(boss,strike,b.round):undefined;
    if(pressure?.phase==='charging')b.focusTargetId=boss?.uid;
    b.partyOrder=pressure?.phase==='charging'?ultimate?.order??damage?.order??{kind:'attack'}:pressure?.phase==='striking'?{kind:'guard'}:urgent&&heal?heal.order??undefined:ultimate?.order??damage?.order??undefined;
   }
   }
   const stageDef=content.dungeons.find(d=>d.id===stage)!; const strike=stageDef.bossStrike;
   if(strike&&b.round%strike.every===0)for(const boss of b.units.filter(u=>u.side==='enemy'&&u.boss&&u.hp>0)){if(bossWindupStatus(boss,strike,b.round).phase==='broken')broken++;else fullStrikes++;}
   const result=resolveRound(b,content);b=result.battle;nrounds++;
   enemyActions+=b.events.filter(e=>e.actionSelection&&e.actorId?.startsWith('enemy:')).length;
  }
  wins+=Number(b.phase==='reward');failed+=Number(b.phase==='failed');stalled+=Number(!['reward','failed'].includes(b.phase));rounds+=nrounds;deaths+=b.units.filter(u=>u.side==='party'&&u.hp<=0).length;potions+=5-b.potionsRemaining;
 }
 const r={mode,party:party.name,stage,policy,wins,failed,stalled,total:20,broken:broken/20,fullStrikes:fullStrikes/20,rounds:rounds/20,deaths:deaths/20,potions:potions/20,enemyActions:enemyActions/20};records.push(r);console.log(JSON.stringify(r));
}
await mkdir('artifacts/difficulty-balance',{recursive:true});
await writeFile(`artifacts/difficulty-balance/${mode}.json`,JSON.stringify(records,null,2));
