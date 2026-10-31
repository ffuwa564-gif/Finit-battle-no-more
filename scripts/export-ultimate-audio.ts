import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderUltimateSound, ultimateSounds } from '../src/platform/ultimate-audio';

// Review samples use the game recipe and the same recorded combat-buff source.
const directory=process.argv[2] ?? 'artifacts/ultimate-audio';mkdirSync(directory,{recursive:true});
const source=readFileSync(new URL('../src/platform/assets/combat-buff.wav',import.meta.url)),sourceRate=source.readUInt32LE(24);
const sourceCount=(source.length-44)/2;
const rate=44100;
const buff=Float32Array.from({length:Math.round(sourceCount*rate/sourceRate)},(_,i)=>{
  const at=i*sourceRate/rate,lo=Math.floor(at),hi=Math.min(sourceCount-1,lo+1),f=at-lo;
  return (source.readInt16LE(44+lo*2)*(1-f)+source.readInt16LE(44+hi*2)*f)/32768;
});
for(const kind of ultimateSounds){
  const pcm=renderUltimateSound(kind,rate,buff),wav=Buffer.alloc(44+pcm.length*2);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length*2,40);
  for(let i=0;i<pcm.length;i++)wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,pcm[i]))*32767),44+i*2);
  writeFileSync(join(directory,`${kind}.wav`),wav);
}
console.log(`Wrote ${ultimateSounds.length} review WAVs to ${directory}. No approval or publication recorded.`);
