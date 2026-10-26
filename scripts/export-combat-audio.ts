import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { combatSignatures, renderCombatSignature, type CombatSignature } from '../src/platform/combat-signatures';
import { combatFamilies, combatTake, renderCombatSound } from '../src/platform/combat-audio';

const directory=process.argv[2] ?? 'artifacts/combat-audio',rate=44100;
mkdirSync(directory,{recursive:true});
function wave(name:string,pcm:Float32Array){
  const wav=Buffer.alloc(44+pcm.length*2);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length*2,40);
  for(let i=0;i<pcm.length;i++)wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,pcm[i]))*32767),44+i*2);
  writeFileSync(join(directory,name),wav);
}
const rows:string[]=[];
const signatureNames: Record<CombatSignature,string> = {blade:'剣：切断と鋼の響き',thunder:'雷：亀裂と不規則な放電',mechanism:'機巧射撃：発射と反動'};
const representatives:Float32Array[]=[];
for(const signature of combatSignatures){
  const clips=[0,1,2].map(take=>renderCombatSignature(signature,rate,take));
  representatives.push(clips[0]);
  clips.forEach((clip,take)=>wave(`${signature}-${take+1}.wav`,clip));
  rows.push(`<tr><th>${signatureNames[signature]}</th>${clips.map((_,take)=>`<td>Take ${take+1}<br><audio controls preload="none" src="${signature}-${take+1}.wav"></audio></td>`).join('')}</tr>`);
}
const gapSize=Math.round(rate*.5), signatureMix=new Float32Array(representatives.reduce((sum,clip)=>sum+clip.length,0)+gapSize*2);
let position=0;
for(const clip of representatives){signatureMix.set(clip,position);position+=clip.length+gapSize;}
wave('signatures-comparison.wav',signatureMix);
for(const family of combatFamilies){
  const clips=[0,1,2].map(take=>renderCombatSound(family,rate,take));
  const gap=Math.round(rate*.35),comparison=new Float32Array(clips.reduce((n,pcm)=>n+pcm.length,0)+gap*2);
  let cursor=0;
  clips.forEach((pcm,take)=>{wave(`${family}-${take+1}.wav`,pcm);comparison.set(pcm,cursor);cursor+=pcm.length+gap;});
  wave(`${family}.wav`,clips[0]);wave(`${family}-comparison.wav`,comparison);
  rows.push(`<tr><th>${family}<br><a href="${family}-comparison.wav">3種類を続けて試聴</a></th>${clips.map((_,take)=>`<td>${take+1}. ${combatTake(family,take).name}<br><audio controls preload="none" src="${family}-${take+1}.wav"></audio></td>`).join('')}</tr>`);
}
writeFileSync(join(directory,'index.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>通常戦闘音の比較</title><style>body{font:16px/1.7 system-ui;background:#f5f2eb;color:#263543;margin:24px}table{border-collapse:collapse}th,td{padding:18px;border:1px solid #bdc8cd;text-align:left}audio{max-width:220px}main{overflow:auto}</style><h1>通常戦闘音の比較</h1><p>先頭3行は新しい剣・雷・機巧射撃です。同じ武器の3テイクを切り替え、音色の個性を保ちます。残りは既存の系統です。素材段階の音で、ゲームの音量設定・BGM・最終出力処理は含みません。</p><p><a href="signatures-comparison.wav">剣→雷→機巧射撃を続けて試聴</a></p><main><table>${rows.join('')}</table></main></html>`);
console.log(`Wrote 36 individual takes, 9 family comparisons and the signature comparison to ${directory}. Open index.html to audition.`);
