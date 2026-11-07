import{test,expect}from'@playwright/test';import{enterGame}from'./boot';import{installDecodedMusicMeter}from'./audio-fixture';
test.use({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',hasTouch:true,isMobile:true});
test('real downloaded tracks decode and produce native PCM output without falling back to the media resampler',async({page},info)=>{
 await page.addInitScript(installDecodedMusicMeter,-1);await page.goto('/#settings');await enterGame(page);const tracks=[];
 for(const scene of ['home','normalBattle','boss','novel']as const){
  await page.evaluate(async scene=>(await import('/src/platform/bgm.ts')).configureBgm(scene,.4),scene);
  await expect.poll(()=>page.evaluate(async()=>{const s=(await import('/src/platform/bgm.ts')).getBgmPlaybackState();return s.backend==='pcm'&&s.playing;}),{timeout:20000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>{const meter=(window as any).musicMeter as AnalyserNode;const data=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((n,v)=>n+v*v,0)/data.length);}),{timeout:15000}).toBeGreaterThan(.00001);
  tracks.push(await page.evaluate(async()=>(await import('/src/platform/bgm.ts')).getBgmPlaybackState()));
 }
 await info.attach('native-music-tracks.json',{body:JSON.stringify(tracks),contentType:'application/json'});await expect(page.locator('audio[data-bgm]')).toHaveCount(0);
});
