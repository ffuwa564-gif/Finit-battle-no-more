import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { combatSignature, combatSignatures, renderCombatSignature, signatureDuration } from '../src/platform/combat-signatures';

describe('stable ordinary weapon signatures', () => {
  const character = (id: string) => content.characters.find(c => c.id === id)!;
  it('selects by weapon and actual action, keeping support and ultimates separate', () => {
    expect(combatSignature('attack', 'pierce', character('seris'))).toBe('blade');
    expect(combatSignature('attack', 'attack', character('nox'))).toBe('blade');
    for (const id of ['lunette', 'lunette-awakened', 'tikka', 'vespera']) {
      expect(combatSignature('area', 'area', character(id))).toBe('mechanism');
      expect(combatSignature('heal', 'heal', character(id))).toBeUndefined();
      expect(combatSignature('guard', 'barrier', character(id))).toBeUndefined();
      expect(combatSignature('buff', 'overclock', character(id))).toBeUndefined();
      expect(combatSignature('ultimate-strike', 'attack', character(id))).toBeUndefined();
    }
    expect(combatSignature('debuff', 'paralysis', character('hollow-keeper'))).toBe('thunder');
    expect(combatSignature('attack', 'attack', character('pale-wolf'))).toBeUndefined();
  });
  it.each([22050, 44100, 48000])('keeps all performances bounded and pop-free at %i Hz', rate => {
    for (const signature of combatSignatures) for (let take = 0; take < 3; take++) {
      const pcm = renderCombatSignature(signature, rate, take);
      let peak = 0, sum = 0;
      for (const value of pcm) { expect(Number.isFinite(value)).toBe(true); peak = Math.max(peak, Math.abs(value)); sum += value * value; }
      expect(peak).toBeGreaterThan(.6); expect(peak).toBeLessThanOrEqual(.721);
      expect(Math.sqrt(sum / pcm.length)).toBeGreaterThan(.02);
      expect(pcm.length / rate).toBeCloseTo(signatureDuration[signature], 4);
      expect(Math.abs(pcm[0])).toBe(0); expect(Math.abs(pcm[pcm.length - 1])).toBe(0);
    }
  });
  it('keeps a weapon’s duration while varying its performance, with a short foreground contact', () => {
    for (const signature of combatSignatures) {
      const a = renderCombatSignature(signature, 44100), b = renderCombatSignature(signature, 44100, 1);
      expect(a.length).toBe(b.length); expect(a).not.toEqual(b);
      expect(a).toEqual(renderCombatSignature(signature, 44100, 3));
      const energy = (start: number, end: number) => a.slice(Math.round(start * 44100), Math.round(end * 44100)).reduce((sum, x) => sum + x * x, 0);
      expect(energy(0, .12)).toBeGreaterThan(energy(.12, .4) * 2);
    }
  });
});
