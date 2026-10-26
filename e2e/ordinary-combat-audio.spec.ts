import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page:Page){
  await page.addInitScript(()=>{
    const ids=new WeakMap<AudioBuffer,number>();let next=0;
    (window as any).__ordinaryVoices=[];
    const start=AudioBufferSourceNode.prototype.start,stop=AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start=function(...args:any[]){
      if(this.buffer&&!this.loop&&this.buffer.duration>.25&&this.buffer.duration<.8){
        if(!ids.has(this.buffer))ids.set(this.buffer,++next);
        const record={buffer:ids.get(this.buffer),duration:this.buffer.duration,lead:(args[0]-this.context.currentTime)*1000,stopped:false,ended:false};
        (this as any).__ordinary=record;(window as any).__ordinaryVoices.push(record);
        this.addEventListener('ended',()=>record.ended=true);
      }
      return start.apply(this,args as any);
    };
    AudioBufferSourceNode.prototype.stop=function(...args:any[]){if((this as any).__ordinary)(this as any).__ordinary.stopped=true;return stop.apply(this,args as any);};
  });
  await page.goto('/#settings');await enterGame(page);
  await page.evaluate(async()=>{const audio=await import('/src/platform/audio.ts');await audio.enableAudio();audio.setAudioVolume(1);(window as any).__ordinaryVoices=[];});
}

test('ordinary strikes use immediate native audio, cycle cached variations and respect skill identity',async({page})=>{
  await prepare(page);
  const result=await page.evaluate(async()=>{
    const audio=await import('/src/platform/audio.ts');
    for(let i=0;i<4;i++)audio.playSound('attack');
    audio.playSound('attack',undefined,'pierce');
    return (window as any).__ordinaryVoices;
  });
  expect(result).toHaveLength(5);
  expect(result[0].buffer).toBe(result[3].buffer);
  expect(new Set(result.slice(0,3).map((voice:any)=>voice.buffer)).size).toBe(3);
  for(const voice of result){expect(voice.lead).toBeGreaterThan(-20);expect(voice.lead).toBeLessThan(25);}
  expect(result[0].duration).toBeCloseTo(.38,2);expect(result[4].duration).toBeCloseTo(.34,2);
});

test('rapid catch-up replaces old voices and leaves no unbounded ordinary tails',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await prepare(page);
  await page.evaluate(async()=>{const audio=await import('/src/platform/audio.ts');for(let i=0;i<40;i++)audio.playSound('attack');});
  const result=await page.evaluate(()=>(window as any).__ordinaryVoices);
  expect(result).toHaveLength(40);
  expect(result.filter((voice:any)=>!voice.stopped&&!voice.ended).length).toBeLessThanOrEqual(6);
  await expect.poll(()=>page.evaluate(()=>(window as any).__ordinaryVoices.every((voice:any)=>voice.ended))).toBe(true);
  expect(errors).toEqual([]);
});
