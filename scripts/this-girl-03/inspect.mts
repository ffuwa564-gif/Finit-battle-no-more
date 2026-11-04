import{content,run,gem}from'./policy.mts';
const c=content.characters.find(c=>c.id==='tikka')!;console.log(c, c.skillIds.map(id=>content.skills.find(s=>s.id===id)));
console.log('candidates',content.characters.filter(c=>(c.role==='debuffer'||['astraea','nox','vespera'].includes(c.id))&&c.published).map(c=>c.id));
for(const stage of['ivory-tower-010','lunette-awakening'])for(const tier of[3,6]){let wins=0,jam=0;for(let i=0;i<8;i++){const party=['tikka','seris-awakened','athena','benzaiten'];const r=run({party,leader:'athena',gems:party.map(()=>gem('echo-shard',tier,'bulwark',tier)),prefer:['jam']},3000+i,true,stage);wins+=+r.win;jam+=r.events!.filter(e=>e.actorId==='party:tikka'&&e.skillId==='jam-14').length;}console.log(stage,tier,wins,jam);}
