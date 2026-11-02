import type { LegacyWaveOmens } from './types';

// Read-only compatibility for saves made before exploration choices were removed.
const legacyChoices = ['bell', 'thread', 'ash', 'mirror', 'key', 'feather'];
const legacyRecipes = [
  { id: 'returning-voices', needs: ['bell', 'thread'] },
  { id: 'unseen-edge', needs: ['ash', 'mirror'] },
  { id: 'winged-door', needs: ['key', 'feather'] },
  { id: 'forgotten-offering', needs: ['bell', 'mirror', 'key'] },
];

export function validLegacyOmens(value: unknown, battle: { wave: number; phase: string; nextPhase: string; cursor: number; events: unknown[] }): value is LegacyWaveOmens {
  if (!value || typeof value !== 'object') return false;
  const state = value as LegacyWaveOmens;
  const known = (id: unknown) => legacyChoices.includes(id as string);
  if (!Array.isArray(state.picks) || state.picks.length > battle.wave + 1 || !state.picks.every(known) || !Array.isArray(state.activated) || new Set(state.activated).size !== state.activated.length) return false;
  const expected = legacyRecipes.filter(recipe => recipe.needs.every(id => state.picks.includes(id))).map(recipe => recipe.id);
  if (state.activated.length !== expected.length || !expected.every(id => state.activated.includes(id))) return false;
  if (state.pending !== undefined && (!Array.isArray(state.pending) || state.pending.length !== 3 || new Set(state.pending).size !== 3 || !state.pending.every(known) || state.picks.length !== battle.wave || battle.phase !== 'playing' || battle.cursor !== battle.events.length || !['wave', 'reward'].includes(battle.nextPhase))) return false;
  if (state.picks.length < battle.wave || (battle.phase === 'reward' && state.picks.length !== battle.wave + 1)) return false;
  return true;
}
