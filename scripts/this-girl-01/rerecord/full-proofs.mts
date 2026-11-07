import{readFileSync,writeFileSync}from'node:fs';import{prepare}from'../capture/prepare-proof.mts';
process.env.RERECORD_CAPTURE_LOCK='rerecord/capture-source-lock.json';
for(const id of['reference','sakuya']){const spec=JSON.parse(readFileSync(`artifacts/this-girl-01/proofs/spec-${id}.json`,'utf8'));spec.id=id+'-full';writeFileSync(`artifacts/this-girl-01/proofs/spec-${spec.id}.json`,JSON.stringify(spec,null,2));await prepare(spec);}
