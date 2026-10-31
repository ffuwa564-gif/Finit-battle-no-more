import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderUltimateSound, ultimateSounds } from '../src/platform/ultimate-audio';

// Review samples use the same synthesis code as the game.
const directory=process.argv[2] ?? 'artifacts/ultimate-audio';mkdirSync(directory,{recursive:true});
const rate=44100;
for(const kind of ultimateSounds){
  const pcm=renderUltimateSound(kind,rate),wav=Buffer.alloc(44+pcm.length*2);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length*2,40);
  for(let i=0;i<pcm.length;i++)wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,pcm[i]))*32767),44+i*2);
  writeFileSync(join(directory,`${kind}.wav`),wav);
}
console.log(`Wrote ${ultimateSounds.length} review WAVs to ${directory}. No approval or publication recorded.`);
