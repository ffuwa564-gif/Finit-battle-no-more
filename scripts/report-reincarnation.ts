import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='docs/research/reincarnation';
const data=JSON.parse(readFileSync('artifacts/reincarnation/balance.json','utf8'));
if(data.results.length!==12)throw Error('The complete six-stage, two-tier run is required.');
const keys=new Set<string>();
const lines=['| 区間 | 装備値 | 勝利 / 戦数 | 勝率（Wilson 95%） | 全戦平均総R | 勝利時平均薬 | 全員生還 / 全戦 |','| --- | ---: | ---: | --- | ---: | ---: | ---: |'];
for(const r of data.results){
 const key=`${r.stage}/${r.power}`;if(keys.has(key)||r.rows.length!==200||new Set(r.rows.map((x:any)=>x.seed)).size!==200||r.confirmationStart!==60001)throw Error('Invalid confirmation records');keys.add(key);
 const wins=r.rows.filter((x:any)=>x.win),stage=Number(r.stage.split('-')[1]);
 if(wins.length!==r.wins||r.rows.some((x:any,i:number)=>x.seed!==60001+i))throw Error('Invalid outcomes or seed sequence');
 for(const win of wins){if(win.materials['palimpsest:common']!==stage||win.materials['palimpsest:rare']!==(stage===6?2:1))throw Error('A real clear did not grant the promised crafting materials');}
 const n=r.rows.length,p=wins.length/n,z=1.959963984540054,den=1+z*z/n,mid=(p+z*z/(2*n))/den,half=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/den;
 const potions=wins.length?wins.reduce((a:number,x:any)=>a+x.potions,0)/wins.length:undefined,alive=r.rows.filter((x:any)=>x.win&&x.survivors===4).length;
 lines.push(`| ${stage} | T${r.power===230?6:7} / ${r.power} | ${wins.length}/${n} | ${(100*p).toFixed(1)}% (${(100*(mid-half)).toFixed(1)}–${(100*Math.min(1,mid+half)).toFixed(1)}%) | ${r.meanRounds.toFixed(2)} | ${potions?.toFixed(2)??'—'} | ${alive}/${n} |`);
}
data.sourceHashes=Object.fromEntries(['src/content/reincarnation.ts','scripts/balance-reincarnation.ts'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
mkdirSync(root,{recursive:true});writeFileSync(`${root}/balance.json`,JSON.stringify(data,null,2)+'\n');
const path=`${root}/README.md`,doc=readFileSync(path,'utf8');
writeFileSync(path,doc.replace(/<!-- measured-results -->[\s\S]*?(?=\n## 自動)/,'<!-- measured-results -->\n\n'+lines.join('\n')+'\n'));
console.log('Validated 2,400 native-engine outcomes, exact guaranteed crafting drops and source hashes.');
