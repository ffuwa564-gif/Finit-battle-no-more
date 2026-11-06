import {fulfillAudioFixture} from './audio-fixture';
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
  const create=AudioContext.prototype.createMediaElementSource;
  AudioContext.prototype.createMediaElementSource=function(element){
   const source=create.call(this,element),connect=source.connect.bind(source),context=this;
   source.connect=function(destination,...args:any[]){
    if(destination instanceof GainNode){const meter=context.createAnalyser();meter.fftSize=4096;destination.connect(meter);w.musicMeter=meter;w.musicContext=context;}
    return (connect as Function)(destination,...args);
   } as typeof source.connect;return source;
  };
 });
 await page.goto('/#settings');await enterGame(page);
 await page.evaluate(async()=>{const audio=await import('/src/platform/audio.ts');await audio.enableAudio();audio.playSound('confirm');});
 await stablePitch(page,'initial music and effects');expect(await page.evaluate(()=>(window as any).deviceContexts.filter((c:AudioContext)=>c.state!=='closed').length)).toBe(1);
 const initialContexts=await page.evaluate(()=>(window as any).deviceContexts.length);expect(initialContexts).toBe(1);
 await page.getByRole('button',{name:'×2',exact:true}).click();await stablePitch(page,'double animation speed');
 await page.getByRole('button',{name:'×1',exact:true}).click();await stablePitch(page,'normal animation speed');
 const music=page.locator('audio[data-bgm]');await expect(music).toHaveCount(1);
 // Browser/media-control rate drift must be corrected without reloading the track.
 const position=await music.evaluate((el:HTMLAudioElement)=>{el.defaultPlaybackRate=1.08;el.playbackRate=1.08;el.preservesPitch=false;return el.currentTime;});
 await expect(music).toHaveJSProperty('playbackRate',1);await expect(music).toHaveJSProperty('defaultPlaybackRate',1);await expect(music).toHaveJSProperty('preservesPitch',true);await stablePitch(page,'restored media rate');
 expect(await music.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThanOrEqual(position);
 await page.evaluate(async()=>{const{configureBgm}=await import('/src/platform/bgm.ts');for(const scene of ['novel','boss','home'] as const)configureBgm(scene,.5);});await stablePitch(page,'track source changes');
 // Remain idle through a complete loop: this also covers the reported no-input case.
 await page.waitForTimeout(8500);await stablePitch(page,'idle through a loop');
 await page.evaluate(async()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));await (window as any).musicContext.suspend();});
 await expect(music).toHaveJSProperty('paused',true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await stablePitch(page,'foreground recovery');
 expect(await page.evaluate(()=>(window as any).deviceContexts.filter((c:AudioContext)=>c.state!=='closed').length)).toBe(1);
 // Closing a shared context must rebind a fresh media element, never duplicate it.
 await music.evaluate((el:HTMLAudioElement)=>{el.currentTime=1;});
 await page.evaluate(async()=>{await (window as any).musicContext.close();});
 await page.getByRole('group',{name:'BGM音量',exact:true}).getByRole('button',{name:'25%',exact:true}).click();
 await expect(music).toHaveCount(1);await stablePitch(page,'closed-context recovery');await expect.poll(()=>music.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThanOrEqual(.9);
 expect(await page.evaluate(()=>(window as any).deviceContexts.length)).toBe(initialContexts+1);
 expect(await page.evaluate(()=>(window as any).deviceContexts.filter((c:AudioContext)=>c.state!=='closed').length)).toBe(1);
 await page.evaluate(async()=>{const{disposeBgm}=await import('/src/platform/bgm.ts');disposeBgm();});
 expect(await page.evaluate(()=>(window as any).deviceContexts.at(-1).state)).toBe('running');
});
