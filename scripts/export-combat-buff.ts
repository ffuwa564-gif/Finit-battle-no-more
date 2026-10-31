// Run with the dev server on port 4173. Exports only the existing buff recipe.
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch();const page=await browser.newPage();await page.goto('http://127.0.0.1:4173/');
const samples=await page.evaluate(async()=>{
 const Tone=await import('/node_modules/.vite/deps/tone.js');
 const {createCombatSynth}=await import('/src/platform/combat-synth.ts');
 const buffer=await Tone.Offline(async()=>{
  const synth=await createCombatSynth(Tone,new Tone.Gain(1).toDestination());
  synth.play('buff',undefined,.01);
 },1.5,1,48000);
 return Array.from(buffer.getChannelData(0));
});
await fs.mkdir('src/platform/assets',{recursive:true});
const wav=Buffer.alloc(44+samples.length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);samples.forEach((x,i)=>wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,x))*32767),44+i*2));await fs.writeFile('src/platform/assets/combat-buff.wav',wav);console.log('Actual game CombatSynth buff exported',samples.length);await browser.close();
