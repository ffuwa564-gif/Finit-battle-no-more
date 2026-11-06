import { afterEach, describe, expect, it, vi } from 'vitest';
import { bgmTracks, createBgmDucker, configureBgm, disposeBgm, getBgmScene, refreshBgm, unlockBgm } from '../src/platform/bgm';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';
import { advanceReplay, createBattle } from '../src/domain/engine';

afterEach(() => { disposeBgm(); vi.unstubAllGlobals(); });

describe('BGM scene transitions', () => {
  it.each([
    { userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 },
    { userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 },
  ])('controls native music gain when iOS ignores element volume: $platform', navigator => {
    const param = { value: 1, setValueAtTime: vi.fn((value: number) => { param.value = value; }) };
    const gain = { gain: param, connect: vi.fn(), disconnect: vi.fn() };
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const context = { addEventListener: vi.fn(), removeEventListener: vi.fn(), state: 'suspended', currentTime: 1, destination: {}, createGain: vi.fn(() => gain), createMediaElementSource: vi.fn(() => source), resume: vi.fn(async () => { context.state = 'running'; }), close: vi.fn(async () => { context.state = 'closed'; }) };
    const audio = { hidden: false, loop: false, preload: '', dataset: {} as Record<string,string>, src: '', paused: true,
      get volume() { return 1; }, set volume(_value: number) {},
      play: vi.fn(async () => { audio.paused = false; }), pause: vi.fn(() => { audio.paused = true; }), load: vi.fn(), removeAttribute: vi.fn(), remove: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal('navigator', navigator);
    vi.stubGlobal('window', { AudioContext: vi.fn(function () { return context; }) });
    vi.stubGlobal('document', { hidden: false, createElement: () => audio, body: { append: vi.fn() } });
    configureBgm('home', .25); unlockBgm();
    expect(param.value).toBe(.125); expect(audio.volume).toBe(1);
    expect(source.connect).toHaveBeenCalledWith(gain); expect(gain.connect).toHaveBeenCalledWith(context.destination);
    const loads = audio.load.mock.calls.length;
    configureBgm('home', 1); expect(param.value).toBe(.5); expect(audio.load).toHaveBeenCalledTimes(loads);
    const duck = createBgmDucker(); duck.set(.08); expect(param.value).toBeCloseTo(.04);
    configureBgm('boss', .5); expect(param.value).toBeCloseTo(.02);
    duck.dispose(); expect(param.value).toBe(.25);
    configureBgm('boss', 0); expect(param.value).toBe(0); expect(audio.paused).toBe(true);
    configureBgm('boss', .25); expect(param.value).toBe(.125); expect(audio.paused).toBe(false);
    context.state = 'suspended'; refreshBgm(); expect(context.state).toBe('running');
    expect(context.createMediaElementSource).toHaveBeenCalledTimes(1);
    disposeBgm(); expect(source.disconnect).toHaveBeenCalled(); expect(context.close).toHaveBeenCalled();
  });
  it('starts new games at 50% music without changing the sound-effect default', () => {
    expect(createInitialSave(content,42).settings).toMatchObject({bgmVolume:.5,seVolume:1});
  });
  it('uses Fjord throughout every normal dungeon approach, while keeping event and boss tracks', () => {
    const save = createInitialSave(content, 42);
    const normal = content.dungeons.filter(d => d.published && (d.kind ?? 'normal') === 'normal');
    expect(normal.length).toBeGreaterThanOrEqual(36);
    for (const dungeon of normal) {
      let battle = createBattle(content, save.partyIds, save.leaderId, dungeon.id, 0, 42, `fjord-${dungeon.id}`);
      for (let wave = 0; wave < dungeon.waves.length; wave++) {
        const hasBoss = battle.initialUnits.some(unit => unit.side === 'enemy' && unit.boss);
        const expected = hasBoss ? dungeon.bossMusic === 'clock' ? 'clockBoss' : dungeon.bossMusic === 'japanese' ? 'japaneseBoss' : 'boss' : 'normalBattle';
        expect(getBgmScene(battle, dungeon), `${dungeon.id} wave ${wave}`).toBe(expected);
        expect(getBgmScene({ ...battle, phase: 'ready' }, dungeon)).toBe(expected);
        expect(getBgmScene({ ...battle, phase: 'reward' }, dungeon)).toBe('clear');
        expect(getBgmScene({ ...battle, phase: 'failed' }, dungeon)).toBe('home');
        if (wave + 1 < dungeon.waves.length) battle = advanceReplay({ ...battle, phase: 'playing', nextPhase: 'wave', cursor: battle.events.length }, content);
      }
    }
    const event = content.dungeons.find(d => d.id === 'kuzuha-beginner')!;
    const eventBattle = createBattle(content, save.partyIds, save.leaderId, event.id, 0, 42, 'event-approach');
    expect(getBgmScene(eventBattle, event)).toBe('battle');
  });
  it('uses the dedicated clock track for the actual clock trial, including its final replay', () => {
    const save = createInitialSave(content, 42);
    const clock = content.dungeons.find(d => d.id === 'frozen-dawn-clock')!;
    const battle = createBattle(content, save.partyIds, save.leaderId, clock.id, 0, 42, 'clock-music');
    expect(getBgmScene(battle, clock)).toBe('clockBoss');
    expect(getBgmScene({ ...battle, phase: 'ready' }, clock)).toBe('clockBoss');
    expect(getBgmScene({ ...battle, initialUnits: battle.initialUnits.map(unit => ({ ...unit, hp: 0 })), phase: 'playing' }, clock)).toBe('clockBoss');
    expect(getBgmScene({ ...battle, phase: 'reward' }, clock)).toBe('clear');
    expect(getBgmScene({ ...battle, phase: 'failed' }, clock)).toBe('home');
    expect(getBgmScene(null, clock)).toBe('home');
    expect(getBgmScene(battle, clock, true)).toBe('novel');
    expect(getBgmScene(battle)).toBe('boss');
    const clockStages=content.dungeons.filter(d=>d.bossMusic==='clock');
    const towerClocks=content.dungeons.filter(d=>d.towerFloor&&d.bossClock);
    expect(clockStages.map(d=>d.id)).toEqual([clock.id,...towerClocks.map(d=>d.id)]);
    expect(towerClocks.length).toBeGreaterThanOrEqual(1);
    for(const stage of towerClocks){
      expect(stage.waves.at(-1)![0]!.characterId).toBe('chrona');
      const approach=createBattle(content,save.partyIds,save.leaderId,stage.id,0,42,'tower-clock-'+stage.id);
      if(stage.waves.length>1)expect(getBgmScene(approach,stage)).toBe('normalBattle');
      let finale=approach;
      for(let wave=1;wave<stage.waves.length;wave++)finale=advanceReplay({...finale,phase:'playing',nextPhase:'wave',cursor:finale.events.length},content);
      expect(getBgmScene(finale,stage)).toBe('clockBoss');
    }
  });
  it('keeps boss music through replay, plays clear only at rewards, and returns home on failure or claim', () => {
    const save = createInitialSave(content, 42);
    const battle = applyCommand(save, { type: 'depart', dungeonId: content.dungeons[0].id, potions: 0 }, content).battle!;
    expect(getBgmScene(battle)).toBe('battle');
    const boss = { ...battle.initialUnits.find(unit => unit.side === 'enemy')!, boss: true, hp: 0 };
    const final = { ...battle, initialUnits: [boss], units: [boss], phase: 'playing' as const, nextPhase: 'reward' as const };
    expect(getBgmScene(final)).toBe('boss');
    expect(getBgmScene(final, { bossMusic: 'japanese' })).toBe('japaneseBoss');
    expect(getBgmScene(battle, { kind: 'event', bossMusic: 'japanese' })).toBe('battle');
    expect(getBgmScene({ ...final, phase: 'reward' }, { bossMusic: 'japanese' })).toBe('clear');
    expect(content.dungeons.filter(d => d.eventId === 'evening-nine-tails').every(d => d.bossMusic === 'japanese')).toBe(true);
    expect(getBgmScene({ ...final, phase: 'ready' })).toBe('boss');
    expect(getBgmScene({ ...final, phase: 'reward' })).toBe('clear');
    expect(getBgmScene({ ...final, phase: 'failed' })).toBe('home');
    expect(getBgmScene(null)).toBe('home');
    expect(getBgmScene(undefined)).toBe('home');
    expect(getBgmScene(null, undefined, true)).toBe('novel');
    expect(getBgmScene({ ...final, phase: 'reward' }, undefined, true)).toBe('novel');
    expect(getBgmScene(null, undefined, false)).toBe('home');
  });

  it('temporarily lowers music without losing the user volume, source or playback position',()=>{
    const audio={hidden:false,loop:false,preload:'',dataset:{} as Record<string,string>,src:'',volume:0,paused:true,
      play:vi.fn(()=>{audio.paused=false;return Promise.resolve();}),pause:vi.fn(),load:vi.fn(),removeAttribute:vi.fn(),remove:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn()};
    vi.stubGlobal('document',{hidden:false,createElement:()=>audio,body:{append:vi.fn()}});
    configureBgm('clockBoss',.4);unlockBgm();const loads=audio.load.mock.calls.length;
    const duck=createBgmDucker();duck.set(.08);expect(audio.volume).toBeCloseTo(.016);
    configureBgm('clockBoss',.7);expect(audio.volume).toBeCloseTo(.028);expect(audio.load).toHaveBeenCalledTimes(loads);
    duck.dispose();expect(audio.volume).toBe(.35);
    const muted=createBgmDucker();muted.set(.08);configureBgm('clockBoss',0);muted.dispose();expect(audio.volume).toBe(0);
  });
  it('changes source on transitions, preserves playback during updates, and resumes the requested scene after mute or hiding', () => {
    const audio = {
      hidden: false, loop: false, preload: '', dataset: {} as Record<string, string>, src: '', volume: 0, paused: true,
      play: vi.fn(() => { audio.paused = false; return Promise.resolve(); }),
      pause: vi.fn(() => { audio.paused = true; }), load: vi.fn(), removeAttribute: vi.fn(), remove: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(),
    };
    const document = { hidden: false, createElement: vi.fn(() => audio), body: { append: vi.fn() } };
    vi.stubGlobal('document', document);
    configureBgm('battle', 0.4);
    expect(document.createElement).not.toHaveBeenCalled();
    unlockBgm();
    expect(audio.src).toContain(bgmTracks.battle.file);
    configureBgm('boss', 0.4);
    expect(audio.src).toContain(bgmTracks.boss.file);
    const loads = audio.load.mock.calls.length;
    configureBgm('boss', 0.7);
    expect(audio.load).toHaveBeenCalledTimes(loads);
    expect(audio.volume).toBe(0.35);
    configureBgm('clockBoss', 0.7);
    expect(audio.src).toContain(bgmTracks.clockBoss.file);
    const clockLoads = audio.load.mock.calls.length;
    configureBgm('clockBoss', 0.7);
    expect(audio.load).toHaveBeenCalledTimes(clockLoads);
    configureBgm('clear', 0);
    expect(audio.paused).toBe(true);
    configureBgm('clear', 0.4);
    expect(audio.src).toContain(bgmTracks.clear.file);
    expect(audio.loop).toBe(true);
    document.hidden = true; refreshBgm();
    expect(audio.paused).toBe(true);
    document.hidden = false; refreshBgm();
    expect(audio.paused).toBe(false);
    configureBgm('home', 0.4);
    expect(audio.src).toContain(bgmTracks.home.file);
    configureBgm('novel', 0.25);
    expect(audio.src).toContain(bgmTracks.novel.file);
    const storyLoads = audio.load.mock.calls.length;
    configureBgm('novel', 0.25);
    expect(audio.load).toHaveBeenCalledTimes(storyLoads);
    expect(audio.volume).toBe(0.125);
    configureBgm('novel', 0);
    expect(audio.paused).toBe(true);
    configureBgm('home', 0.25);
    expect(audio.src).toContain(bgmTracks.home.file);
    expect(audio.volume).toBe(0.125);
  });
});

it('rebinds a closed music device at the same position, ignoring stale metadata and retaining the saved mix', async () => {
  class Stream extends EventTarget {
    hidden=false;loop=false;preload='';dataset:Record<string,string>={};src='';volume=1;paused=true;currentTime=0;duration=120;defaultPlaybackRate=1;playbackRate=1;preservesPitch=true;
    play=vi.fn(async()=>{this.paused=false;});pause=vi.fn(()=>{this.paused=true;});load=vi.fn();remove=vi.fn();removeAttribute=vi.fn(()=>{this.src='';});
  }
  class Device extends EventTarget {
    state='running';currentTime=0;destination={};
    gain={gain:{value:1,setValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()};
    createGain=vi.fn(()=>this.gain);createMediaElementSource=vi.fn(()=>({connect:vi.fn(),disconnect:vi.fn()}));resume=vi.fn(async()=>{this.state='running';});
    close=vi.fn(async()=>{this.state='closed';this.dispatchEvent(new Event('statechange'));});
  }
  const devices:Device[]=[],streams:Stream[]=[];
  vi.stubGlobal('navigator',{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5});
  vi.stubGlobal('window',{AudioContext:vi.fn(function(){const device=new Device();devices.push(device);return device;})});
  vi.stubGlobal('document',{hidden:false,createElement:()=>{const stream=new Stream();streams.push(stream);return stream;},body:{append:vi.fn()}});
  configureBgm('home',.4);unlockBgm();const duck=createBgmDucker();duck.set(.1);streams[0].currentTime=120;
  expect(streams[0].loop).toBe(false);streams[0].dispatchEvent(new Event('ended'));expect(streams[0].currentTime).toBe(0);expect(streams[0].play).toHaveBeenCalledTimes(2);
  streams[0].currentTime=37.25;
  await devices[0].close();expect(streams).toHaveLength(2);expect(devices).toHaveLength(2);
  streams[0].dispatchEvent(new Event('loadedmetadata'));streams[1].dispatchEvent(new Event('loadedmetadata'));
  expect(streams[1].currentTime).toBe(37.25);expect(streams[1].src).toContain(bgmTracks.home.file);expect(devices[1].gain.gain.value).toBeCloseTo(.02);
  expect(streams[0].remove).toHaveBeenCalledTimes(1);expect(streams[1].paused).toBe(false);duck.dispose();
});
