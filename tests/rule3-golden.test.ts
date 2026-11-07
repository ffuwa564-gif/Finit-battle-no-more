import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {content} from '../src/content';
import {createBattle,advanceReplay,resolveRound} from '../src/domain/engine';
import golden from './fixtures/rule3-combat-golden.json';
const sorted=(v:unknown):unknown=>Array.isArray(v)?v.map(sorted):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted((v as Record<string,unknown>)[k])])):v;
it.each(golden.rows)('preserves the actual 1.28 $mode replay/RNG/loot at seed $seed',row=>{
 const old={...content,rulesVersion:'3',contentVersion:golden.contentVersion};
 let b=createBattle(old,['seris','liora','elaine','noelle'],'liora','veiled-cloister',5,row.seed,'legacy-golden',row.mode==='hunt'?'hunt':undefined);
 b.memoryGems={seris:{id:'legacy-stone',defId:'night-dew',variant:'pure',roll:{power:80,trait:'bulwark',value:40}}};
 let rounds=0;
 while(rounds<5&&!['failed','reward'].includes(b.phase)){
  if(b.phase==='playing'){b.cursor=b.events.length-1;b=advanceReplay(b,content);continue;}
  b=resolveRound(b,content).battle;rounds++;
 }
 expect(createHash('sha256').update(JSON.stringify(sorted(b))).digest('hex')).toBe(row.digest);
});
