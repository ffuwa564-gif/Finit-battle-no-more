// Bounded fixed-composition invariance check. Not a portfolio/adoption certificate.
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';
import{createHash}from'node:crypto';
import{resolve}from'node:path';
import{fileURLToPath}from'node:url';
import*as before from'../before-policy.mts';
import*as after from'../after-policy.mts';
const ROOT=resolve(fileURLToPath(new URL('../../../',import.meta.url))),O=resolve(ROOT,'artifacts/this-girl-01/research');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalized=value=>JSON.parse(JSON.stringify(value,(key,value)=>['contentVersion','rulesVersion','commandRedirected'].includes(key)?undefined:value));
const stages=['ivory-tower-010','kuzuha-awakening'],healers=['elaine','miette','benzaiten'],seeds=Array.from({length:8},(_,i)=>910021+i);
const preconditions=[];
for(const id of stages){
 const a=before.content.dungeons.find(d=>d.id===id),b=after.content.dungeons.find(d=>d.id===id);
 if(!a||!b)throw Error('Missing stage '+id);
 const possible=[...b.waves.flat().map(e=>e.characterId),...(b.rareEncounter?.characterIds??[])];
 const check={stageId:id,definitionsIdentical:digest(a)===digest(b),noMireilleEnemy:!possible.includes('mireille'),possibleEnemyIds:[...new Set(possible)]};
 preconditions.push(check);if(!check.definitionsIdentical||!check.noMireilleEnemy)throw Error('NoS precondition failed '+JSON.stringify(check));
}
const affected=after.content.characters.filter(c=>c.skillOverrides&&Object.values(c.skillOverrides).some(s=>s.barrierReturn)).map(c=>c.id);
if(JSON.stringify(affected)!==JSON.stringify(['mireille']))throw Error('Unexpected other barrier-return owner');
const changedCharacters=after.content.characters.filter(c=>digest(c)!==digest(before.content.characters.find(a=>a.id===c.id))).map(c=>c.id);
if(JSON.stringify(changedCharacters)!==JSON.stringify(['mireille']))throw Error('Additional character data changed');
const checks=[];
for(const stage of stages)for(let h=0;h<healers.length;h++){
 const id=healers[h],party=['astraea','athena','seris-awakened',id];
 const config={party,leader:'athena',gems:[before.gem('echo-shard',6,'mercy',6,'swift'),before.gem('pale-ward',6,'bulwark',6),before.gem('echo-shard',6,'bulwark',6),before.gem('twin-tide',6,'none',0)],policy:[2,5,7][h],command:false,potionThreshold:.6};
 for(const seed of seeds){
  const a=before.run(config,seed,true,stage),b=after.run(config,seed,true,stage);
  const rawBefore=digest(a.battle),rawAfter=digest(b.battle),canonicalBefore=digest(normalized(a.battle)),canonicalAfter=digest(normalized(b.battle));
  const record={stageId:stage,seed,config,beforeBattleSha256:rawBefore,afterBattleSha256:rawAfter,canonicalBeforeBattleSha256:canonicalBefore,canonicalAfterBattleSha256:canonicalAfter,beforeHistorySha256:digest(a.history),afterHistorySha256:digest(b.history),beforeEventsSha256:digest(normalized(a.events)),afterEventsSha256:digest(normalized(b.events)),win:[a.win,b.win],rounds:[a.rounds,b.rounds],potions:[a.pots,b.pots],survivors:[a.survivors,b.survivors],finalRng:[a.battle!.seed,b.battle!.seed],passed:canonicalBefore===canonicalAfter&&digest(a.history)===digest(b.history)&&digest(normalized(a.events))===digest(normalized(b.events))};
  checks.push(record);
 }
}
const report={passed:checks.every(c=>c.passed),scope:'48 paired fixed-composition native traces,96 simulations, eight development seed identifiers, three healer replacements including R/SR/SSR, two existing stages. Fresh battles only.',importantLimit:'Unchanged noS fixed-composition performance does not prove that character adoption value or prior witnesses survive competition from the new Sakuya. Portfolio audit and held-out comparisons are still required.',normalization:{removedKeys:['contentVersion','rulesVersion','commandRedirected'],reason:'Public/research content identities differ; commandRedirected is read-only telemetry. Raw battle and raw history hashes are both retained. No HP, damage, resource, cooldown, target, action, RNG or cost fields are removed.'},beforeVersion:{app:before.content.appVersion,content:before.content.contentVersion,rules:before.content.rulesVersion},afterVersion:{app:after.content.appVersion,content:after.content.contentVersion,rules:after.content.rulesVersion},preconditions,affectedOwnerIds:affected,changedCharacterIds:changedCharacters,sourceHashes:{beforePolicy:sha(resolve(ROOT,'scripts/this-girl-01/before-policy.mts')),afterPolicy:sha(resolve(ROOT,'scripts/this-girl-01/after-policy.mts')),beforeEngine:sha(resolve(ROOT,'artifacts/this-girl-01/baseline/src/domain/engine.ts')),afterEngine:sha(resolve(ROOT,'src/domain/engine.ts')),beforeGems:sha(resolve(ROOT,'artifacts/this-girl-01/baseline/src/domain/memory-gems.ts')),afterGems:sha(resolve(ROOT,'src/domain/memory-gems.ts')),checkCode:sha(fileURLToPath(import.meta.url))},checks};
mkdirSync(O,{recursive:true});writeFileSync(resolve(O,'non-s-invariance.json'),JSON.stringify(report,null,2));
console.log('NO SAKUYA INVARIANCE',report.passed,checks.length,'pairs');
if(!report.passed)process.exitCode=1;
