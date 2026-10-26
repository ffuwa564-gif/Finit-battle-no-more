import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import ffprobe from '@ffprobe-installer/ffprobe';
import { content } from '../src/content';
import { ultimateEffectAssets, ultimateEffectIds } from '../src/content/ultimate-effects';
import { ultimateFor } from '../src/domain/ultimates';
import { ULTIMATE_TIMING, UltimateClock } from '../src/platform/ultimate-timing';

describe('dedicated ultimate media', () => {
  it('assigns every character a matching clip and a registered first-frame poster', () => {
    for (const character of content.characters) {
      const effect = content.assets.find(asset => asset.id === ultimateEffectIds[ultimateFor(character).theme])!;
      expect(effect.kind).toBe('video');
      expect(content.assets.find(asset => asset.id === effect.posterId)).toMatchObject({ width: 540, height: 540 });
    }
  });
  it.each(ultimateEffectAssets)('$id is a short silent mobile-compatible clip', asset => {
    const probe = spawnSync(ffprobe.path, ['-v','error','-show_streams','-show_format','-of','json',`public/${asset.path}`], { encoding: 'utf8' });
    expect(probe.status, probe.stderr).toBe(0);
    const result = JSON.parse(probe.stdout);
    expect(result.streams).toHaveLength(1);
    expect(result.streams[0]).toMatchObject({ codec_name: 'h264', profile: 'Constrained Baseline', width: 540, height: 540, pix_fmt: 'yuv420p', r_frame_rate: '24/1' });
    expect(Number(result.format.duration)).toBeGreaterThanOrEqual(2.35);
    expect(Number(result.format.duration)).toBeLessThan(2.5);
    expect(Number(result.format.size)).toBeLessThan(1024 * 1024);
  });
  it('rounds fractional timer delays up so a ready video cannot miss its start gate', () => {
    const clock = new UltimateClock(); clock.sync('one', 1, 1000);
    const delay = clock.delay(ULTIMATE_TIMING.effect, 1000.25);
    expect(delay).toBe(900);
    expect(clock.position(1000.25 + delay)).toBeGreaterThanOrEqual(ULTIMATE_TIMING.effect);
  });
  it('keeps the impact shared by sound, video and numbers when speed changes', () => {
    const clock = new UltimateClock();
    clock.sync('one', 1, 1000);
    clock.sync('one', 2, 1400);
    expect(clock.position(1400)).toBe(400);
    expect(clock.delay(ULTIMATE_TIMING.effect, 1400)).toBe(400);
    expect(clock.delay(ULTIMATE_TIMING.impact, 1400)).toBe(1000);
    expect(clock.delay(ULTIMATE_TIMING.end, 1400)).toBe(2560);
    clock.sync('one', 1, 2400);
    expect(clock.position(2400)).toBe(1650);
    expect(clock.delay(ULTIMATE_TIMING.impact, 2400)).toBe(0);
    clock.sync('two', 2, 5000);
    expect(clock.position(5000)).toBe(0);
    expect(clock.delay(ULTIMATE_TIMING.end, 5000)).toBe(2880);
  });
});
