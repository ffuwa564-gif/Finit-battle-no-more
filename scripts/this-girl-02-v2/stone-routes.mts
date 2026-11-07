import{content}from'../../src/content/index';
import{dungeonGemFamily,dungeonGemLootProfile}from'../../src/domain/memory-gems';
import{writeFileSync}from'node:fs';
const stones=[['pale-ward','白灯石','sanctuary'],['echo-shard','残響石','clock']].map(([id,name,family])=>({id,name,family,routes:content.dungeons.filter(d=>d.published&&dungeonGemFamily(d)===family).map(d=>({id:d.id,name:d.name,towerFloor:d.towerFloor,profile:dungeonGemLootProfile(d)}))}));
writeFileSync('artifacts/this-girl-02-v2/research/stone-routes.json',JSON.stringify({stones,scope:'Actual published content family routes. Not a desired-affix per-run probability; no invented farming duration.'},null,2));console.log(stones.map(s=>[s.name,s.routes.length,s.routes.slice(0,3)]));
