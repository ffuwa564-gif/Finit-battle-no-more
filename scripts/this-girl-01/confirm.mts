import{OUT,read,write,sha,summary}from'./study-io.mts';import{key}from'./study-space.mts';
const lockPath=`${OUT}/confirmation-lock.json`,expected=process.argv[2],caseId=process.argv[3];if(!expected||sha(lockPath)!==expected)throw Error('Explicit reviewed lock SHA required');const lock=read(lockPath);for(const[p,s]of Object.entries(lock.sources))if(sha(p)!==s)throw Error('Source changed since lock: '+p);
const before=await import('./before-policy.mts'),after=await import('./after-policy.mts');
const rows=lock.seedMap.filter((x:any)=>x.logical>=930001&&x.logical<=930256);if(rows.length!==256)throw Error('Incomplete seed panel');
const cases=lock.cases.filter((c:any)=>!caseId||c.id===caseId);if(!cases.length)throw Error('Unknown case');
for(const c of cases){const result:any={id:c.id,stage:c.stage,tier:c.tier,coreId:c.coreId,cap:c.cap,lockSha:expected,arms:{}};const cache=new Map<string,any>();for(const[name,arm]of Object.entries(c.arms)as any){const lib=arm.mode==='before'?before:after;const cacheKey=arm.mode+':'+key(arm.config)+':'+(arm.payoutPercent??100);if(cache.has(cacheKey)){result.arms[name]={...cache.get(cacheKey),aliasOf:cacheKey};continue;}
 const definition=after.content.characters.find(c=>c.id==='mireille')!,contract=definition.skillOverrides!['barrier-18'].barrierReturn!,saved=contract.payoutPercent;if(arm.payoutPercent===0)contract.payoutPercent=0;
 let measured;try{measured=summary(arm.config,key(arm.config),rows.map((s:any)=>{const r=lib.run(arm.config,s.applicationSeed,false,c.stage);return{seed:s.logical,applicationSeed:s.applicationSeed,departureSeed:s.departureSeed,win:r.win,rounds:r.rounds,cappedRounds:r.win?r.rounds:c.cap,potionsUsed:r.pots,survivors:r.survivors,flowersUsed:r.flower,fairiesUsed:r.fairy,telemetry:r.telemetry};}));}finally{contract.payoutPercent=saved;}
 const value={...measured,mode:arm.mode,payoutPercent:arm.payoutPercent??100};cache.set(cacheKey,value);result.arms[name]=value;console.log(c.id,name,value.wins,value.meanCappedRounds);}
 write(`${OUT}/confirmation/${c.id}.json.gz`,result);
}
for(const[p,s]of Object.entries(lock.sources))if(sha(p)!==s)throw Error('Source changed during confirmation: '+p);
