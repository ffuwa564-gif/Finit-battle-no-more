import { combatFamilies, renderCombatSound } from './combat-audio';
import { combatSignatures, renderCombatSignature } from './combat-signatures';
import { renderRabbitUltimate } from './rabbit-ultimate-audio';
import { renderUltimateSound, ultimateSounds } from './ultimate-audio';

export const combatPcmKeys = [
  ...ultimateSounds, 'rabbit:1.25',
  ...[...combatFamilies, ...combatSignatures].flatMap(family => [0, 1, 2].map(variant => `${family}:${variant}`)),
] as const;

/** The very same authored synthesis, at the actual output context's sample rate. */
export function renderCombatPcm(key: string, sampleRate: number): Float32Array {
  if (key === 'rabbit:1.25') return renderRabbitUltimate(sampleRate, 1.25);
  if (ultimateSounds.includes(key as typeof ultimateSounds[number])) return renderUltimateSound(key as typeof ultimateSounds[number], sampleRate);
  const [family, variant] = key.split(':');
  if (combatSignatures.includes(family as typeof combatSignatures[number])) return renderCombatSignature(family as typeof combatSignatures[number], sampleRate, Number(variant));
  if (combatFamilies.includes(family as typeof combatFamilies[number])) return renderCombatSound(family as typeof combatFamilies[number], sampleRate, Number(variant));
  throw new Error(`Unknown combat PCM: ${key}`);
}

