import type { Battle, BattleFairies } from './types';

export const FAIRY_CHANCE = .18;
export const FAIRY_CHARGE = 15;
export const FAIRY_STAY = 3;
export function clearBattleFairy(battle: Battle): void { if (battle.fairies) delete battle.fairies.visitor; }
/** Separate deterministic stream; reloading and off-turn actions never reroll visitors. */
export function offerBattleFairy(battle: Battle): void {
  if (battle.phase !== 'ready' || battle.round < 2) return;
  let seed = 2166136261;
  for (const char of `fairy:${battle.id}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  const state = battle.fairies ??= { seed, checked: '' };
  const checkpoint = `${battle.wave}:${battle.round}`;
  if (state.checked === checkpoint) return;
  state.checked = checkpoint;
  if (state.visitor && (state.visitor.wave !== battle.wave || battle.round >= state.visitor.round + FAIRY_STAY)) {
    delete state.visitor;
    return; // A farewell gets a quiet turn before the next arrival.
  }
  if (state.visitor) return;
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  if (state.seed / 4294967296 >= FAIRY_CHANCE) return;
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  state.visitor = { id: `${battle.id}:fairy:${checkpoint}`, side: state.seed % 2 ? 'left' : 'right', wave: battle.wave, round: battle.round };
}
export function validBattleFairies(value: unknown, battle: Pick<Battle, 'id' | 'wave' | 'round' | 'phase'>): boolean {
  if (!value || typeof value !== 'object') return false;
  const state = value as BattleFairies;
  if (!Number.isSafeInteger(state.seed) || state.seed < 0 || state.seed > 0xffffffff || typeof state.checked !== 'string' || !/^\d+:\d+$/.test(state.checked)) return false;
  const [wave, round] = state.checked.split(':').map(Number);
  if (wave > battle.wave || wave < 0 || round < 2 || (wave === battle.wave && round > battle.round)) return false;
  const v = state.visitor;
  if (v === undefined) return true;
  return !!v && typeof v === 'object' && ['left', 'right'].includes(v.side)
    && Number.isSafeInteger(v.wave) && v.wave === battle.wave && Number.isSafeInteger(v.round) && v.round >= 2 && v.round <= battle.round
    && battle.round <= v.round + FAIRY_STAY && (battle.phase !== 'ready' || battle.round < v.round + FAIRY_STAY)
    && wave === v.wave && round >= v.round
    && v.id === `${battle.id}:fairy:${v.wave}:${v.round}` && ['ready', 'playing'].includes(battle.phase);
}
