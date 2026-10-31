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
/** Shared visual/audio deadlines, relative to the existing damage impact (seconds). */
export const RABBIT_VOLLEY = { rounds: 4, spacing: .21, stagger: .035, finale: 1.05, echoes: [.17, .34] } as const;
export const rabbitShotTimes = (index: number) => Array.from({length:RABBIT_VOLLEY.rounds},(_,round)=>round*RABBIT_VOLLEY.spacing+index*RABBIT_VOLLEY.stagger);
/** Repeated crossfire, a short breath, then one combined finishing blast. */
export function rabbitBitFrame(index: number, elapsed: number) {
  const hit = (elapsed - ULTIMATE_TIMING.impact) / 1000;
  const times=[...rabbitShotTimes(index),RABBIT_VOLLEY.finale];
  const fired=times.filter(time=>time<=hit+1e-7);
  const lastShot=fired.at(-1);
  const shotAge=lastShot===undefined?-1:Math.max(0,hit-lastShot);
  const final=lastShot===RABBIT_VOLLEY.finale;
  return {
    summon: clamp01((elapsed - ULTIMATE_TIMING.effect - index * 35) / 250),
    alpha: clamp01((1.65 - hit) / .3),
    beam: shotAge<0?0:Math.exp(-shotAge*(final?10:33)),
    recoil: shotAge<0||shotAge>.09?0:Math.sin(shotAge/.09*Math.PI),
    shotAge, final, round: Math.max(0,fired.length-1),
    finishCharge: hit>.78&&hit<RABBIT_VOLLEY.finale?(hit-.78)/(RABBIT_VOLLEY.finale-.78):0,
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
