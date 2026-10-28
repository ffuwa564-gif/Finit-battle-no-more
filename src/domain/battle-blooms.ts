import type { Battle, BattleBlooms } from './types';

export const BLOOM_CHANCE = .4;
export const BLOOM_HEAL_PERCENT = 18;

/** A separate stream: decoration never rerolls combat, drops or rare encounters. */
function initialBlooms(battle: Battle): BattleBlooms {
  let seed = 2166136261;
  for (const char of battle.id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return { seed, checked: '', growth: 0 };
}
export function clearBattleBloom(battle: Battle): void {
  if (battle.blooms?.flower) { delete battle.blooms.flower; battle.blooms.growth = 0; }
}
/** Called at a saved decision boundary, never by a timer or component mount. */
export function offerBattleBloom(battle: Battle): void {
  if (battle.phase !== 'ready' || battle.round < 2) return;
  const state = battle.blooms ??= initialBlooms(battle);
  const checkpoint = `${battle.wave}:${battle.round}`;
  if (state.checked === checkpoint) return;
  state.checked = checkpoint;
  delete state.flower;
  state.growth = Math.min(3, (state.growth ?? 0) + 1);
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  if (state.seed / 4294967296 >= BLOOM_CHANCE && state.growth < 3) return;
  state.growth = 3;
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  const wounded = battle.units.some(unit => unit.side === 'party' && unit.hp > 0 && unit.hp < unit.maxHp);
  state.flower = { id: `${battle.id}:flower:${checkpoint}`, kind: wounded && state.seed % 2 === 0 ? 'heal' : 'strike', wave: battle.wave, round: battle.round };
}

export function validBattleBlooms(value: unknown, battle: Pick<Battle, 'id' | 'wave' | 'round' | 'phase'>): boolean {
  if (!value || typeof value !== 'object') return false;
  const state = value as BattleBlooms;
  if (!Number.isSafeInteger(state.seed) || state.seed < 0 || state.seed > 0xffffffff || typeof state.checked !== 'string' || !/^\d+:\d+$/.test(state.checked)) return false;
  if (state.growth !== undefined && (!Number.isSafeInteger(state.growth) || state.growth < 0 || state.growth > 3)) return false;
  const flower = state.flower;
  if (flower === undefined) return true;
  return !!flower && typeof flower === 'object' && ['heal', 'strike'].includes(flower.kind)
    && Number.isSafeInteger(flower.wave) && Number.isSafeInteger(flower.round)
    && flower.wave === battle.wave && flower.round === battle.round && flower.round >= 2
    && (state.growth === undefined || state.growth === 3)
    && state.checked === `${flower.wave}:${flower.round}`
    && flower.id === `${battle.id}:flower:${state.checked}` && battle.phase === 'ready';
}
