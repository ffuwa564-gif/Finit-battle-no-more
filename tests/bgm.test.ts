import { afterEach, describe, expect, it, vi } from 'vitest';
import { bgmTracks, configureBgm, disposeBgm, getBgmScene, refreshBgm, unlockBgm } from '../src/platform/bgm';
import { content } from '../src/content';
import { applyCommand, createInitialSave } from '../src/application/game';

afterEach(() => { disposeBgm(); vi.unstubAllGlobals(); });

describe('BGM scene transitions', () => {
  it('keeps boss music through replay, plays clear only at rewards, and returns home on failure or claim', () => {
    const save = createInitialSave(content, 42);
    const battle = applyCommand(save, { type: 'depart', dungeonId: content.dungeons[0].id, potions: 0 }, content).battle!;
    expect(getBgmScene(battle)).toBe('battle');
    const boss = { ...battle.initialUnits.find(unit => unit.side === 'enemy')!, boss: true, hp: 0 };
    const final = { ...battle, initialUnits: [boss], units: [boss], phase: 'playing' as const, nextPhase: 'reward' as const };
    expect(getBgmScene(final)).toBe('boss');
    expect(getBgmScene(final, { bossMusic: 'japanese' })).toBe('japaneseBoss');
    expect(getBgmScene(battle, { bossMusic: 'japanese' })).toBe('battle');
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

  it('changes source on transitions, preserves playback during updates, and resumes the requested scene after mute or hiding', () => {
    const audio = {
      hidden: false, loop: false, preload: '', dataset: {} as Record<string, string>, src: '', volume: 0, paused: true,
      play: vi.fn(() => { audio.paused = false; return Promise.resolve(); }),
      pause: vi.fn(() => { audio.paused = true; }), load: vi.fn(), removeAttribute: vi.fn(), remove: vi.fn(),
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
    expect(audio.volume).toBe(0.7);
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
    expect(audio.volume).toBe(0.25);
    configureBgm('novel', 0);
    expect(audio.paused).toBe(true);
    configureBgm('home', 0.25);
    expect(audio.src).toContain(bgmTracks.home.file);
    expect(audio.volume).toBe(0.25);
  });
});
