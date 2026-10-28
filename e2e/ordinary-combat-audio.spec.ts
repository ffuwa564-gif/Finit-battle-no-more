import { test, expect, type Page } from '@playwright/test';
import { enterGame } from './boot';

async function prepare(page:Page){
  await page.addInitScript(()=>{
    const ids=new WeakMap<AudioBuffer,number>();let next=0;
    (window as any).__ordinaryVoices=[];
    const start=AudioBufferSourceNode.prototype.start,stop=AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start=function(...args:any[]){
      if(this.buffer&&!this.loop&&this.buffer.duration>.25&&this.buffer.duration<.9){
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
  for(const voice of result)expect(voice.duration).toBeCloseTo(.68,2);
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

test('healing aliases use the soft prayer synth instead of combat PCM',async({page})=>{
  await prepare(page);
  const voices=await page.evaluate(async()=>{
    const audio=await import('/src/platform/audio.ts');
    for(const skill of ['heal','regen','mend_pair','cleanse'] as const){
      audio.playSound('heal',undefined,skill);
      await new Promise(resolve=>setTimeout(resolve,650));
    }
    return (window as any).__ordinaryVoices;
  });
  expect(voices).toHaveLength(0);
});

test('soft support effects remain audible through the actual master output',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    (window as any).__supportMeters=[];
    const original=AudioNode.prototype.connect;
    AudioNode.prototype.connect=function(destination:AudioNode|AudioParam,...args:number[]){
      if(destination instanceof AudioDestinationNode&&this.context instanceof AudioContext){
        const meter=this.context.createAnalyser();meter.fftSize=2048;
        original.call(this,meter);(window as any).__supportMeters.push(meter);
      }
      return (original as Function).call(this,destination,...args);
    } as typeof AudioNode.prototype.connect;
  });
  await prepare(page);
  const rms=()=>page.evaluate(()=>Math.max(0,...(window as any).__supportMeters.map((meter:AnalyserNode)=>{
    const data=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(data);
    return Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length);
  })));
  await expect.poll(rms).toBeLessThan(.0001);
  for(const skill of ['guard','barrier','buff','dispel'] as const){
    await page.evaluate(async skill=>{const audio=await import('/src/platform/audio.ts');audio.playSound('guard',undefined,skill);},skill);
    await expect.poll(rms,{timeout:3000,intervals:[20,30,50]}).toBeGreaterThan(.001);
    await expect.poll(rms,{timeout:4000,intervals:[100]}).toBeLessThan(.0001);
  }
  expect(errors).toEqual([]);
});

test('each combatant advances her own thunder takes independently',async({page})=>{
  await prepare(page);
  const voices=await page.evaluate(async()=>{
    const audio=await import('/src/platform/audio.ts');
    for(const actor of ['party:seris','enemy:wolf','party:seris','enemy:wolf','party:seris'])audio.playSound('attack',undefined,undefined,actor);
    return (window as any).__ordinaryVoices;
  });
  expect(voices).toHaveLength(5);
  expect(voices[0].buffer).toBe(voices[1].buffer);
  expect(voices[2].buffer).toBe(voices[3].buffer);
  expect(new Set([voices[0].buffer,voices[2].buffer,voices[4].buffer]).size).toBe(3);
  expect(voices.every((voice:any)=>Math.abs(voice.duration-.68)<.001)).toBe(true);
});

test('weapon signatures keep their identity across takes and use immediate native playback',async({page})=>{
  await prepare(page);
  const voices=await page.evaluate(async()=>{
    const audio=await import('/src/platform/audio.ts');
    for(const signature of ['blade','thunder','mechanism'] as const){
      for(let i=0;i<4;i++)audio.playSound('attack',undefined,'attack',`test:${signature}`,signature);
    }
    // Real status skill reaches the electrical patch without an explicit override.
    audio.playSound('debuff',undefined,'paralysis','status:test');
    return (window as any).__ordinaryVoices;
  });
  expect(voices).toHaveLength(13);
  for(const [offset,duration] of [[0,.58],[4,.68],[8,.46]]){
    expect(new Set(voices.slice(offset,offset+3).map((v:any)=>v.buffer)).size).toBe(3);
    expect(voices[offset].buffer).toBe(voices[offset+3].buffer);
    for(const voice of voices.slice(offset,offset+4)){
      expect(voice.duration).toBeCloseTo(duration,3);
      expect(voice.lead).toBeGreaterThan(-20);expect(voice.lead).toBeLessThan(25);
    }
  }
  expect(voices[12].duration).toBeCloseTo(.68,3);
});

test('real battle replay uses approved thunder for both Seris and Lunette',async({page})=>{
  await prepare(page);
  await page.evaluate(async()=>{
    const {content}=await import('/src/content/index.ts');
    const {createBattle,advanceReplay}=await import('/src/domain/engine.ts');
    const {loadSave,persistSave}=await import('/src/platform/save.ts');
    const previous=(await loadSave())!,save=structuredClone(previous);
    const party=['seris','lunette','liora','elaine'];
    save.ownedIds=[...new Set([...save.ownedIds,...party])];save.partyIds=party;save.leaderId='seris';
    let battle=createBattle(content,party,'seris','silent-cathedral',0,42,'signature-replay');
    while(battle.phase==='playing')battle=advanceReplay(battle,content);
    for(const unit of battle.units){
      if(unit.side==='enemy'){unit.hp=unit.maxHp=100000;unit.attack=0;unit.speed=0;}
      else unit.speed=unit.characterId==='seris'?100:unit.characterId==='lunette'?99:1;
    }
    save.battle=battle;save.settings.speed=2;save.settings.bgmVolume=0;save.revision=previous.revision+1;
    await persistSave(save,previous.revision);
  });
  await page.reload();await enterGame(page);
  await page.evaluate(()=>{
    (window as any).__signatureCues=[];
    window.addEventListener('game:se',event=>(window as any).__signatureCues.push((event as CustomEvent).detail));
  });
  await page.getByRole('button',{name:'ラウンドを進める',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__signatureCues.filter((cue:any)=>cue.variationKey==='party:lunette'&&cue.signature==='thunder').length),{timeout:15000}).toBeGreaterThan(0);
  const result=await page.evaluate(()=>({cues:(window as any).__signatureCues,voices:(window as any).__ordinaryVoices}));
  expect(result.cues).toEqual(expect.arrayContaining([
    expect.objectContaining({variationKey:'party:seris',signature:'thunder'}),
    expect.objectContaining({variationKey:'party:lunette',signature:'thunder'}),
  ]));
  expect(result.voices.filter((voice:any)=>Math.abs(voice.duration-.68)<.001).length).toBeGreaterThanOrEqual(2);
});
