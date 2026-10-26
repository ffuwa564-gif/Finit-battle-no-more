import { test, expect } from '@playwright/test';
import { enterGame } from './boot';

test('native buffered scheduling has no Tone lookahead delay and pending voices cancel', async ({page}) => {
  await page.addInitScript(() => {
    (window as any).__voices=[];(window as any).__sounds=[];
    const start=AudioBufferSourceNode.prototype.start,stop=AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start=function(...args:any[]) {
      if(this.buffer && this.buffer.duration<1.8 && this.buffer.duration>.6 && !this.loop) {
        const record={at:performance.now(),due:performance.now()+1000*(args[0]-this.context.currentTime),lead:1000*(args[0]-this.context.currentTime),stopped:false};
        (this as any).__record=record;(window as any).__voices.push(record);
      }
      return start.apply(this,args as any);
    };
    AudioBufferSourceNode.prototype.stop=function(...args:any[]){if((this as any).__record)(this as any).__record.stopped=true;return stop.apply(this,args as any);};
    window.addEventListener('game:se',event=>(window as any).__sounds.push((event as CustomEvent).detail.kind));
  });
  await page.goto('/#settings');await enterGame(page);
  await page.evaluate(async()=>{const audio=await import('/src/platform/audio.ts');await audio.enableAudio();audio.setAudioVolume(1);});
  await page.waitForTimeout(300);
  const immediate=await page.evaluate(async()=>{
    const audio=await import('/src/platform/audio.ts');(window as any).__voices=[];
    audio.playSound('ultimate-strike');return (window as any).__voices;
  });
  expect(immediate).toHaveLength(1);expect(immediate[0].lead).toBeGreaterThan(-20);expect(immediate[0].lead).toBeLessThan(20);
  const scheduled=await page.evaluate(async()=>{
    const audio=await import('/src/platform/audio.ts');(window as any).__voices=[];(window as any).__sounds=[];
    const voice=audio.scheduleUltimateSound('ultimate-magic',400)!;
    const result=(window as any).__voices[0];voice.cancel();return result;
  });
  expect(scheduled.lead).toBeGreaterThan(380);expect(scheduled.lead).toBeLessThanOrEqual(405);expect(scheduled.stopped).toBe(true);
  await page.waitForTimeout(500);
  expect(await page.evaluate(()=>(window as any).__sounds)).not.toContain('ultimate-magic');
});
