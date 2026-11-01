import type { BattleEvent, GameCommand, GameSettings } from '../domain/types';

export type SoundCue = 'ultimate-rabbits' | 'ultimate-mechanism' | 'ultimate-stars' | 'ultimate-guard' | 'ultimate-rally' | 'ultimate-strike' | 'ultimate-magic' | 'ultimate-sanctuary' | 'ultimate' | 'confirm' | 'cancel' | 'select' | 'attack' | 'area' | 'heal' | 'guard' | 'buff' | 'debuff' | 'drop' | 'dialogue' | 'wave' | 'defeat' | 'victory' | 'recruit' | 'gacha' | 'purchase' | 'exchange' | 'depart' | 'error';

/** Exhaustive contracts: new actions/events must explicitly select a cue or opt out. */
export const battleSounds: Record<BattleEvent['kind'], SoundCue> = {
  attack: 'attack', area: 'area', heal: 'heal', guard: 'guard', buff: 'buff', debuff: 'debuff', drop: 'drop', dialogue: 'dialogue', wave: 'wave', defeat: 'defeat',
};
export const commandSounds: Record<GameCommand['type'], SoundCue | null> = {
  trackBuild: 'select', applyBuild: 'confirm',
  startGemRefinement: 'exchange', resolveGemRefinement: 'confirm', equipMemoryGem: 'confirm', salvageMemoryGem: 'exchange', lockMemoryGem: 'select', craftMemoryGem: 'recruit',
  commandOrder: 'select', partyOrder: 'select', focusEnemy: 'select',
  crystalRole: 'select', battleFairy: null, battleBloom: null, novelStart: 'select', novelNext: 'select', novelBack: 'select', novelFinish: 'confirm', ultimate: 'select', depart: 'depart', strategy: 'select', round: null, replay: null, potion: 'heal', retreat: 'cancel', claim: 'victory', leaveFailure: 'cancel', buyPotion: 'purchase', recruit: 'recruit', goldRecruit: 'victory', eventRecruit: 'recruit', awaken: 'victory', exchange: 'exchange', party: 'select', drawXR: 'gacha', draw: 'gacha', settings: null,
};

/** Settings feedback uses the resulting SE volume, including BGM-only changes. */
export function commandSound(command: GameCommand, settings: GameSettings): SoundCue | null {
  return command.type === 'settings' ? settings.seVolume > 0 ? 'confirm' : null : commandSounds[command.type];
}
