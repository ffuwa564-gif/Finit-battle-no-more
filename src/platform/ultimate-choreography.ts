import type { BattleEvent, CharacterDef } from '../domain/types';
import type { UltimateTheme } from '../domain/ultimates';
import { ultimateFor } from '../domain/ultimates';
import { ULTIMATE_TIMING } from './ultimate-timing';

export type UltimateVisual = UltimateTheme | 'clockwork' | 'rabbit-bits';
export function ultimateVisualFor(character: CharacterDef, event?: BattleEvent): UltimateVisual {
  const theme = ultimateFor(character).theme;
  if (['lunette', 'lunette-awakened'].includes(character.id)) return 'rabbit-bits';
  if (event?.clockAction === 'finale' || ['nox','tikka'].includes(character.id)) return 'clockwork';
  // An enemy's offensive boss strike must not look or sound like a party heal.
  return event?.bossStrike && ['bloom', 'aegis', 'dawn'].includes(theme) ? 'eclipse' : theme;
}
/** Summon, lock, four distinct shots, then dismiss; never extra combat actions. */
export function rabbitBitFrame(index: number, elapsed: number) {
  const hit = (elapsed - ULTIMATE_TIMING.impact) / 1000;
  const shotAge = hit - index * .045;
  return {
    summon: clamp01((elapsed - ULTIMATE_TIMING.effect - index * 35) / 250),
    alpha: clamp01((1.05 - hit) / .35),
    beam: shotAge < 0 ? 0 : Math.exp(-shotAge * 6),
    recoil: shotAge < 0 || shotAge > .18 ? 0 : Math.sin(shotAge / .18 * Math.PI),
  };
}
export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
/** Presentation time only: hold the moving impact key for 60 ms, never the game state. */
export function ultimateFrame(visual: UltimateVisual, elapsed: number) {
  const hit = (elapsed - ULTIMATE_TIMING.impact) / 1000;
  const hold = !['bloom','aegis','dawn'].includes(visual);
  const action = hold && hit >= 0 ? Math.max(0, hit - .06) : hit;
  return {
    hit, action,
    gather: clamp01((elapsed - ULTIMATE_TIMING.effect) / (ULTIMATE_TIMING.impact - ULTIMATE_TIMING.effect)),
    fade: clamp01((ULTIMATE_TIMING.end - elapsed) / (ULTIMATE_TIMING.end - ULTIMATE_TIMING.tail)),
    travel: clamp01((action + .095) / .095),
    visible: elapsed >= ULTIMATE_TIMING.effect && elapsed < ULTIMATE_TIMING.end,
  };
}
