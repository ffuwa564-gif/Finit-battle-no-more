import{readFileSync,writeFileSync,mkdirSync,renameSync}from'node:fs';import{dirname}from'node:path';import{gzipSync,gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
export const OUT='artifacts/this-girl-01/research';
export const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
export function write(path:string,data:any){mkdirSync(dirname(path),{recursive:true});const bytes=Buffer.from(JSON.stringify(data));writeFileSync(path+'.partial',path.endsWith('.gz')?gzipSync(bytes,{level:7}):bytes);renameSync(path+'.partial',path);}
export function read(path:string){const b=readFileSync(path);return JSON.parse((path.endsWith('.gz')?gunzipSync(b):b).toString());}
export const rankFast=(a:any,b:any)=>b.wins-a.wins||a.meanCappedRounds-b.meanCappedRounds||a.meanPotions-b.meanPotions||b.allSurvive-a.allSurvive||a.key.localeCompare(b.key);
export const rankSafe=(a:any,b:any)=>b.wins-a.wins||b.allSurvive-a.allSurvive||a.meanCappedRounds-b.meanCappedRounds||a.meanPotions-b.meanPotions||a.key.localeCompare(b.key);
export const rankFrugal=(a:any,b:any)=>b.wins-a.wins||a.meanPotions-b.meanPotions||b.allSurvive-a.allSurvive||a.meanCappedRounds-b.meanCappedRounds||a.key.localeCompare(b.key);
export function summary(config:any,key:string,rows:any[]){return{key,config,n:rows.length,wins:rows.filter(r=>r.win).length,meanCappedRounds:rows.reduce((s,r)=>s+r.cappedRounds,0)/rows.length,meanPotions:rows.reduce((s,r)=>s+r.potionsUsed,0)/rows.length,allSurvive:rows.filter(r=>r.win&&r.survivors===4).length,rows};}
export function frontier(candidates:any[]){return candidates.filter(c=>!candidates.some(d=>d.key!==c.key&&d.wins>=c.wins&&d.meanCappedRounds<=c.meanCappedRounds&&d.meanPotions<=c.meanPotions&&d.allSurvive>=c.allSurvive&&(d.wins>c.wins||d.meanCappedRounds<c.meanCappedRounds||d.meanPotions<c.meanPotions||d.allSurvive>c.allSurvive)));}
