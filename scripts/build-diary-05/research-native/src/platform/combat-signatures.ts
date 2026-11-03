import type { SkillTemplate } from '../domain/types';
import type { SoundCue } from './sound-cues';
import { isUltimateSound } from './ultimate-audio';

export const combatSignatures = ['blade', 'thunder', 'mechanism'] as const;
export type CombatSignature = typeof combatSignatures[number];
const offensive = new Set<SkillTemplate>(['attack', 'pierce', 'area', 'shatter', 'drain', 'dawn']);

/** One approved electrical timbre for every ordinary damaging action. */
export function combatSignature(kind: SoundCue, skill?: SkillTemplate): CombatSignature | undefined {
  if (isUltimateSound(kind)) return;
  const action = skill ?? kind;
  if (action === 'paralysis' || offensive.has(action as SkillTemplate)) return 'thunder';
}

export const signatureDuration: Record<CombatSignature, number> = { blade: .58, thunder: .68, mechanism: .46 };

/** Three related performances of each weapon, not three different materials. */
export function renderCombatSignature(signature: CombatSignature, sampleRate: number, variation = 0): Float32Array {
  const take = ((variation % 3) + 3) % 3;
  const pcm = new Float32Array(Math.ceil(sampleRate * signatureDuration[signature]));
  let seed = 0x83b71 + combatSignatures.indexOf(signature) * 6211 + take * 1973;
  const pole = (hz: number) => 1 - Math.exp(-2 * Math.PI * hz / sampleRate);
  const rates = [pole(210), pole(1000), pole(3900), pole(7600)];
  const bands = [0, 0, 0, 0];
  const decay = [1, .94, 1.07][take];
  const env = (t: number, rate: number) => t < 0 ? 0 : Math.min(1, t * 3000) * Math.exp(-t * rate * decay);
  const sin = (hz: number, t: number) => Math.sin(2 * Math.PI * hz * t);
  let sweep = 0, electric = 0;
  for (let i = 0; i < pcm.length; i++) {
    const t = i / sampleRate;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const noise = (seed >>> 0) / 0x80000000 - 1;
    for (let b = 0; b < bands.length; b++) bands[b] += rates[b] * (noise - bands[b]);
    const body = bands[1] - bands[0], edge = bands[2] - bands[1], air = bands[3] - bands[2];
    let value = 0;
    if (signature === 'blade') {
      // Cutting edge at contact, moving friction, then sparse non-harmonic steel.
      sweep += 2 * Math.PI * (720 + 2600 * Math.exp(-t * 33)) / sampleRate;
      value = (edge * 1.8 + air * .25) * env(t, 65);
      value += (edge * .9 + .2 * Math.sin(sweep + 1.3 * sin(173, t))) * env(t, 15);
      value += (.42 * sin(347, t) + .23 * sin(925, t) + .11 * sin(1843, t)) * env(t, 10);
      value += body * 1.1 * env(t, 19);
      const scrape = t - (.021 + take * .003);
      value += edge * .55 * env(scrape, 36);
    } else if (signature === 'thunder') {
      // Broadband crack, a changing electrical spectrum, and irregular after-arcs.
      electric += 2 * Math.PI * (310 + 2100 * Math.exp(-t * 27)) / sampleRate;
      value = (edge * 2 + air * .45) * env(t, 85);
      value += .26 * Math.sin(electric + 7 * Math.exp(-t * 22) * Math.sin(electric * 1.414)) * env(t, 12);
      value += (body * 2.4 + .44 * Math.tanh(1.8 * sin(168, t))) * env(t, 8);
      for (const [delay, level] of [[.034 + take * .003, .38], [.091 - take * .004, .17], [.157 + take * .005, .07]]) {
        const age = t - delay;
        value += (edge * 2 + air * .4) * env(age, 105) * level;
      }
    } else {
      // One dry pneumatic shot. Small latch/recoil details are not a burst of hits.
      const phase = 2 * Math.PI * (195 * t + 4.8 * (1 - Math.exp(-t * 85)));
      value = (body * 2.1 + edge * 1.6) * env(t, 36);
      value += .52 * Math.tanh(1.8 * Math.sin(phase)) * env(t, 16);
      value += air * .55 * env(t, 32);
      const recoil = t - (.023 + take * .002);
      value += (.12 * sin(811, recoil) + .07 * sin(1537, recoil) + edge * .35) * env(recoil, 65);
    }
    // No common pitched body or full-patch saturation: keep the contact transient.
    pcm[i] = value;
  }
  let peak = 0;
  for (const value of pcm) peak = Math.max(peak, Math.abs(value));
  const level = { blade: .68, thunder: .72, mechanism: .69 }[signature];
  for (let i = 0; i < pcm.length; i++) pcm[i] *= level / Math.max(peak, .001) * Math.min(1, i / (sampleRate * .0007), (pcm.length - i - 1) / (sampleRate * .035));
  return pcm;
}
