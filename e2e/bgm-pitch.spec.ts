import {fulfillAudioFixture,installDecodedMusicMeter} from './audio-fixture';
import {test,expect,type Page} from '@playwright/test';
import {enterGame} from './boot';
test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
function tone(rate:number){
 const count=rate*8,wav=Buffer.alloc(44+count*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*2,40);
 for(let i=0;i<count;i++)wav.writeInt16LE(Math.round(Math.sin(2*Math.PI*375*i/rate)*8192),44+i*2);return wav;
}
async function pitch(page:Page){return page.evaluate(()=>{
 const meter=(window as any).musicMeter as AnalyserNode|undefined;if(!meter||meter.context.state!=='running')return 0;
 const data=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(data);const crossings:number[]=[];
 for(let i=1;i<data.length;i++)if(data[i-1]<0&&data[i]>=0)crossings.push(i-1-data[i-1]/(data[i]-data[i-1]));
 return crossings.length<3?0:(crossings.length-1)*meter.context.sampleRate/(crossings.at(-1)!-crossings[0]);
});}
async function stablePitch(page:Page,label:string){await test.step(label,async()=>{await expect.poll(()=>pitch(page)).toBeGreaterThan(373);await expect.poll(()=>pitch(page)).toBeLessThan(377);});}
test('one native clock preserves BGM pitch through SE, different source rates, speed settings, background and closed-context recovery',async({page})=>{
 await page.route('**/audio/*.mp3',route=>fulfillAudioFixture(route,tone(route.request().url().includes('organ')?48000:44100)));
 await page.addInitScript(()=>{
  const w=window as any;w.deviceContexts=[];
  const Native=window.AudioContext;window.AudioContext=new Proxy(Native,{construct(Target,args){const ctx=Reflect.construct(Target,args);w.deviceContexts.push(ctx);return ctx;}});
 });
 await page.addInitScript(installDecodedMusicMeter,8);
 await page.goto('/#settings');await enterGame(page);
 await page.evaluate(async()=>{const audio=await import('/src/platform/audio.ts');await audio.enableAudio();audio.playSound('confirm');});
 await stablePitch(page,'initial music and effects');expect(await page.evaluate(()=>(window as any).deviceContexts.filter((c:AudioContext)=>c.state!=='closed').length)).toBe(1);
 const initialContexts=await page.evaluate(()=>(window as any).deviceContexts.length);expect(initialContexts).toBe(1);
 await page.getByRole('button',{name:'×2',exact:true}).click();await stablePitch(page,'double animation speed');
 await page.getByRole('button',{name:'×1',exact:true}).click();await stablePitch(page,'normal animation speed');
 const state=()=>page.evaluate(async()=>(await import('/src/platform/bgm.ts')).getBgmPlaybackState());
 expect((await state()).backend).toBe('pcm');await expect(page.locator('audio[data-bgm]')).toHaveCount(0);
 await page.evaluate(async()=>{const{configureBgm}=await import('/src/platform/bgm.ts');for(const scene of ['novel','boss','home'] as const)configureBgm(scene,.5);});await stablePitch(page,'track source changes');
 // Remain idle through a complete loop: this also covers the reported no-input case.
 const continuity=await page.evaluate(async()=>{
  await new Promise(r=>setTimeout(r,160));const meter=(window as any).musicMeter as AnalyserNode,data=new Float32Array(meter.fftSize),levels:number[]=[];
  const block=setTimeout(()=>{const end=performance.now()+160;while(performance.now()<end){/* Simulate a busy UI, without pausing the audio engine. */}},4000);
  await new Promise<void>(resolve=>{const timer=setInterval(()=>{meter.getFloatTimeDomainData(data);levels.push(Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length));},20);setTimeout(()=>{clearInterval(timer);clearTimeout(block);resolve();},8500);});
  const sorted=[...levels].sort((a,b)=>a-b);return {min:sorted[0],median:sorted[Math.floor(sorted.length/2)],samples:levels.length};
 });expect(continuity.samples).toBeGreaterThan(100);expect(continuity.min/continuity.median).toBeGreaterThan(.9);await stablePitch(page,'idle through a native loop with a blocked UI');
 await page.evaluate(async()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));await (window as any).musicContext.suspend();});
 await expect.poll(async()=>(await state()).playing).toBe(false);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await stablePitch(page,'foreground recovery');
 expect(await page.evaluate(()=>(window as any).deviceContexts.filter((c:AudioContext)=>c.state!=='closed').length)).toBe(1);
 // A replacement clock must resume the decoded track at the same position.
 const prior=(await state()).position;
 await page.evaluate(async()=>{await (window as any).musicContext.close();});
 await page.getByRole('group',{name:'BGM音量',exact:true}).getByRole('button',{name:'25%',exact:true}).click();
 await stablePitch(page,'closed-context recovery');expect(((await state()).position-prior+8)%8).toBeLessThan(1);
 expect(await page.evaluate(()=>(window as any).deviceContexts.length)).toBe(initialContexts+1);
 expect(await page.evaluate(()=>(window as any).deviceContexts.filter((c:AudioContext)=>c.state!=='closed').length)).toBe(1);
 await page.evaluate(async()=>{const{disposeBgm}=await import('/src/platform/bgm.ts');disposeBgm();});
 expect(await page.evaluate(()=>(window as any).deviceContexts.at(-1).state)).toBe('running');
});
