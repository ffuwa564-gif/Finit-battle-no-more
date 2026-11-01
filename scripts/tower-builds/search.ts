import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {content,gem,run,type Config} from './search-core';
const out='artifacts/tower-builds';mkdirSync(out,{recursive:true});
const defs:any[]=[
 ['initial','覚醒した初期の四人',['seris-awakened','liora-awakened','elaine-awakened','noelle-awakened'],'liora-awakened',['echo-shard','night-dew','twin-tide','dawn-crown'],['chain','mercy','none','execution'],[],0],
 ['echo','残響と連鎖',['nox','athena','benzaiten','hecate'],'athena',['echo-shard','night-dew','twin-tide','dawn-crown'],['chain','mercy','none','chain'],[],0],
 ['shield','障壁を砲弾に',['seris-awakened','athena','selene','lunette-awakened'],'athena',['shield-break','night-dew','pale-ward','echo-shard'],['execution','bulwark','bulwark','chain'],[],2],
 ['drain','吸収で殴り続ける',['freyja','evelyn','benzaiten','hecate'],'freyja',['night-dew','night-dew','twin-tide','echo-shard'],['mercy','mercy','none','mercy'],['drain'],0],
 ['dawn','弱体から暁冠',['seris-awakened','athena','hecate','benzaiten'],'athena',['dawn-crown','night-dew','echo-shard','twin-tide'],['execution','bulwark','chain','none'],[],1],
 ['area','全体攻撃で取り巻き処理',['asteria','athena','lunette-awakened','benzaiten'],'athena',['echo-shard','night-dew','dawn-crown','twin-tide'],['chain','mercy','chain','none'],['area'],0],
 ['sleep','眠りで敵の手数を減らす',['persephone','athena','nox','benzaiten'],'athena',['dream-lace','night-dew','echo-shard','twin-tide'],['bulwark','mercy','chain','none'],['sleep'],0],
 ['confuse','混乱を軸に崩す',['seoritsu','athena','nox','selene'],'athena',['echo-shard','night-dew','dawn-crown','twin-tide'],['mercy','bulwark','chain','none'],['confusion'],0],
 ['paralysis','麻痺で行動を妨害',['mizuhanome','athena','seris-awakened','benzaiten'],'athena',['echo-shard','night-dew','dawn-crown','twin-tide'],['mercy','bulwark','chain','none'],['paralysis'],0],
 ['charm','魅了で同士討ちを狙う',['thorn-witch','athena','nox','benzaiten'],'athena',['echo-shard','night-dew','dawn-crown','twin-tide'],['mercy','bulwark','chain','none'],['charm'],0],
 ['cleanse','解除と立て直し',['hecate','athena','nox','benzaiten'],'athena',['clear-tear','night-dew','echo-shard','twin-tide'],['bulwark','mercy','chain','none'],['cleanse'],0],
 ['regen','再生で粘る',['selene-standard','evelyn','nox','ukanomitama'],'evelyn',['twin-tide','night-dew','echo-shard','pale-ward'],['none','mercy','mercy','bulwark'],['regen'],2],
 ['rewind','巻戻しで通常スキル回転',['vespera','athena','nox','benzaiten'],'athena',['rewind-thread','night-dew','echo-shard','twin-tide'],['bulwark','mercy','chain','none'],['buff'],0],
 ['battery','星炉から兎の必殺',['vespera','athena','lunette-awakened','benzaiten'],'athena',['star-furnace','night-dew','echo-shard','twin-tide'],['bulwark','mercy','chain','none'],['overclock'],0],
 ['rally','号令で攻撃を底上げ',['athena','nox','freyja','benzaiten'],'athena',['night-dew','echo-shard','dawn-crown','twin-tide'],['bulwark','chain','mercy','none'],['rally'],0],
 ['accel','加速の両刃',['eos','evelyn','nox','benzaiten'],'eos',['pale-ward','night-dew','echo-shard','twin-tide'],['bulwark','mercy','chain','none'],['buff'],0],
 ['recycle','障壁を回復へ変える',['miette','liora-awakened','nox','lunette-awakened'],'liora-awakened',['twin-tide','pale-ward','night-dew','echo-shard'],['none','bulwark','mercy','chain'],['barrier_mend'],2],
 ['execute','処刑で終盤を刈り取る',['artemis','athena','nox','benzaiten'],'athena',['dawn-crown','night-dew','echo-shard','twin-tide'],['execution','bulwark','execution','none'],[],1],
 ['dream6','T6夢織で必殺加速',['persephone','athena','nox','benzaiten'],'athena',['dream-lace','night-dew','echo-shard','twin-tide'],['bulwark','mercy','chain','none'],['sleep'],0],
];
const results:any[]=JSON.parse(requireRead());
function requireRead(){try{return String(readFileSync(out+'/search.json'));}catch{return '[]';}}
for(const [id,title,party,leader,stones,traits,prefer,policy] of defs){
 if(results.some(r=>r.id===id&&r.representative))continue;
 let best:any;
 for(const tier of id==='dream6'?[6]:[3,4,5]){
  const c:Config={party,leader,gems:stones.map((s:string,i:number)=>gem(s,tier,traits[i],traits[i]==='none'?0:tier)),prefer,policy};
  const tests=Array.from({length:12},(_,i)=>({seed:1001+i,...run(c,1001+i)}));
  const wins=tests.filter(x=>x.win);console.log(id,tier,wins.length+'/12',Math.min(...tests.map(x=>x.remaining)),Math.min(...tests.map(x=>x.rounds)));
  best={id,title,config:c,tier,search:tests,representative:wins.sort((a,b)=>b.survivors-a.survivors||a.rounds-b.rounds)[0]};
  if(wins.length>=9||tier===(id==='dream6'?6:5))break;
 }
 if(best.representative){
  best.holdout=Array.from({length:60},(_,i)=>({seed:70001+i,...run(best.config,70001+i)}));
  best.proof=run(best.config,best.representative.seed,true);
 }
 const old=results.findIndex(r=>r.id===id);if(old>=0)results[old]=best;else results.push(best);writeFileSync(out+'/search.json',JSON.stringify(results,null,2));
}
