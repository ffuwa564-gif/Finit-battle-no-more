import{test,expect}from'@playwright/test';
test.use({locale:'ja-JP',viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
test('a first unlock timeout never disposes the BGM device when synth initialization retries',async({page})=>{
 await page.addInitScript(()=>{
  const w=window as any;w.blockInitialAudio=true;w.initialDevices=[];w.initialCues=[];window.addEventListener('game:se',e=>w.initialCues.push((e as CustomEvent).detail.kind));
  const Native=window.AudioContext,resume=AudioContext.prototype.resume,getState=Object.getOwnPropertyDescriptor(BaseAudioContext.prototype,'state')!.get!;
  window.AudioContext=new Proxy(Native,{construct(T,args){const c=Reflect.construct(T,args);void c.suspend();Object.defineProperty(c,'state',{get:()=>w.blockInitialAudio?'interrupted':getState.call(c)});w.initialDevices.push(c);return c;}});
  AudioContext.prototype.resume=function(){return w.blockInitialAudio?new Promise<void>(()=>{}):resume.call(this);};
 });
 await page.goto('/#settings');await page.locator('.title-screen__start').click();await page.waitForTimeout(1800);
 expect(await page.evaluate(()=>(window as any).initialDevices.length)).toBe(1);
 await page.evaluate(()=>(window as any).blockInitialAudio=false);await page.getByRole('button',{name:'物語をスキップ',exact:true}).click();await page.getByRole('button',{name:'スキップして進む',exact:true}).click();
 await page.getByRole('group',{name:'BGM音量',exact:true}).getByRole('button',{name:'25%',exact:true}).click();
 await page.evaluate(async()=>{const a=await import('/src/platform/audio.ts');await a.enableAudio();a.playSound('confirm');});
 await expect.poll(()=>page.evaluate(()=>(window as any).initialCues.includes('confirm'))).toBe(true);
 expect(await page.evaluate(()=>(window as any).initialDevices.length)).toBe(1);
 expect(await page.evaluate(()=>(window as any).initialDevices[0].state)).toBe('running');
});
