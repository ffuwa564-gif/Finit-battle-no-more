import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { claimCommandFeedback, emitUISound, runUIInteraction } from '../src/ui/interaction';
import { commandSound } from '../src/platform/sound-cues';

describe('one feedback owner per UI gesture', () => {
  let cues: string[];
  beforeEach(() => {
    vi.stubGlobal('window', new EventTarget()); cues = [];
    window.addEventListener('game:ui', event => cues.push((event as CustomEvent).detail.kind));
  });
  afterEach(() => vi.unstubAllGlobals());
  it('keeps normal controls audible and lets commands own their delayed result', async () => {
    runUIInteraction(() => undefined);
    let complete!: () => void;
    const saved = new Promise<void>(resolve => { complete = resolve; });
    runUIInteraction(() => { expect(claimCommandFeedback()).toBe(true); void saved.then(() => cues.push('saved')); });
    expect(cues).toEqual(['confirm']);
    complete(); await saved;
    expect(cues).toEqual(['confirm', 'saved']);
    runUIInteraction(() => undefined, 'select');
    expect(cues).toEqual(['confirm', 'saved', 'select']);
  });
  it('does not debounce rapid distinct gestures or double-play nested and explicit controls', () => {
    runUIInteraction(() => emitUISound('cancel'));
    runUIInteraction(() => { emitUISound('confirm'); claimCommandFeedback(); });
    runUIInteraction(() => runUIInteraction(() => undefined, 'select'));
    runUIInteraction(() => runUIInteraction(() => { claimCommandFeedback(); }));
    runUIInteraction(() => undefined);
    runUIInteraction(() => undefined);
    expect(cues).toEqual(['cancel', 'select', 'confirm', 'confirm']);
  });
  it('restores ownership after a throwing handler and does not leak it into background commands', () => {
    expect(() => runUIInteraction(() => { claimCommandFeedback(); throw new Error('failed'); })).toThrow('failed');
    expect(claimCommandFeedback()).toBe(false);
    runUIInteraction(() => undefined);
    expect(cues).toEqual(['confirm']);
  });
  it('uses the resulting SE volume for BGM and other settings feedback', () => {
    const settings = { bgmVolume: 0, seVolume: 1, reducedMotion: false, speed: 1 as const };
    expect(commandSound({type:'settings',settings:{bgmVolume:0}}, settings)).toBe('confirm');
    expect(commandSound({type:'settings',settings:{bgmVolume:1}}, {...settings,seVolume:0})).toBeNull();
    expect(commandSound({type:'settings',settings:{seVolume:1}}, settings)).toBe('confirm');
    expect(commandSound({type:'equipMemoryGem',characterId:'seris',gemId:null},settings)).toBe('confirm');
    expect(commandSound({type:'replay'},settings)).toBeNull();
  });
});
