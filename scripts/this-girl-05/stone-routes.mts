import{content}from'../../src/content/index';
import{dungeonGemFamily,dungeonGemLootProfile}from'../../src/domain/memory-gems';
import{writeFileSync}from'node:fs';
const rows=content.dungeons.filter(d=>d.published&&dungeonGemFamily(d)==='clock').map(d=>({id:d.id,name:d.name,towerFloor:d.towerFloor,profile:dungeonGemLootProfile(d)})).filter(d=>(d.profile.tier6Chance??0)>0);
writeFileSync('artifacts/this-girl-05/research/stone-routes.json',JSON.stringify({stone:'echo-shard',family:'clock',rows,scope:'Content-derived legal T6 family routes; attribute conditional rates are NOT a per-run full desired-roll probability.'},null,2));console.log(rows.slice(0,6));
