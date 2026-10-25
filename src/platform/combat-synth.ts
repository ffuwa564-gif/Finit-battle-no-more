import type * as Tone from 'tone';
import type { SkillTemplate } from '../domain/types';
import type { SoundCue } from './sound-cues';

interface CombatScore {
  // Filtered white noise supplies motion, while the membrane supplies the hit.
  sweep?: { from: number; to: number; duration: number; velocity: number };
  impact?: { note: string; velocity: number };
  metal?: { note: string; velocity: number };
  bells?: { notes: string[]; spacing: number; duration: number };
  aura?: { notes: string[]; duration: number };
}
type CombatKey = 'ultimate' | SkillTemplate | 'wave' | 'defeat';

const attackBoostScore: CombatScore = { bells: { notes: ['F4', 'C5', 'F5', 'A5'], spacing: 0.075, duration: 0.24 }, aura: { notes: ['F3', 'A3', 'C4'], duration: 0.35 } };

/** Exhaustive sound recipes, shared by every character using the same template. */
const scores: Record<CombatKey, CombatScore> = {
  ultimate: { sweep: { from: 300, to: 8000, duration: .55, velocity: .65 }, impact: { note: 'D1', velocity: .9 }, metal: { note: 'A4', velocity: .35 }, bells: { notes: ['D4', 'A4', 'D5', 'F5', 'A5', 'D6'], spacing: .13, duration: .4 }, aura: { notes: ['D3', 'F3', 'A3', 'D4'], duration: .8 } },
  confusion: { sweep: { from: 2100, to: 420, duration: .26, velocity: .4 }, bells: { notes: ['A4', 'Bb4', 'E5', 'Eb5'], spacing: .07, duration: .2 } },
  sleep: { bells: { notes: ['A5', 'F5', 'D5'], spacing: .12, duration: .32 }, aura: { notes: ['D4', 'A4'], duration: .5 } },
  paralysis: { sweep: { from: 7200, to: 1500, duration: .12, velocity: .5 }, metal: { note: 'E6', velocity: .35 }, bells: { notes: ['E5', 'Bb5', 'E6'], spacing: .035, duration: .12 } },
  charm: { bells: { notes: ['F5', 'A5', 'C6', 'E6'], spacing: .09, duration: .25 }, aura: { notes: ['F4', 'A4', 'E5'], duration: .4 } },
  attack: { sweep: { from: 6200, to: 650, duration: 0.12, velocity: 0.8 }, impact: { note: 'D2', velocity: 0.85 }, metal: { note: 'A4', velocity: 0.3 } },
  area: { sweep: { from: 350, to: 4400, duration: 0.28, velocity: 0.9 }, impact: { note: 'C2', velocity: 0.95 }, bells: { notes: ['D4', 'A4', 'D5', 'F5'], spacing: 0.055, duration: 0.3 }, aura: { notes: ['D3', 'A3', 'F4'], duration: 0.36 } },
  heal: { bells: { notes: ['D5', 'A5', 'F6', 'A6'], spacing: 0.085, duration: 0.32 }, aura: { notes: ['D4', 'F4', 'A4'], duration: 0.4 } },
  guard: { impact: { note: 'A2', velocity: 0.65 }, metal: { note: 'D4', velocity: 0.55 }, aura: { notes: ['D3', 'A3', 'D4'], duration: 0.3 } },
  overclock: attackBoostScore,
  barrier_mend: { bells: { notes: ['D5', 'A5', 'F6', 'A6'], spacing: .085, duration: .32 }, aura: { notes: ['D4', 'F4', 'A4'], duration: .4 } },
  jam: { sweep: { from: 4200, to: 220, duration: .24, velocity: .55 }, bells: { notes: ['D5', 'Ab4', 'Eb4', 'D4'], spacing: .065, duration: .18 } },
  buff: attackBoostScore,
  rally: attackBoostScore,
  debuff: { sweep: { from: 4200, to: 220, duration: 0.24, velocity: 0.55 }, bells: { notes: ['D5', 'Ab4', 'Eb4', 'D4'], spacing: 0.065, duration: 0.18 }, aura: { notes: ['D3', 'Ab3'], duration: 0.3 } },
  pierce: { sweep: { from: 900, to: 8500, duration: 0.09, velocity: 0.7 }, impact: { note: 'E2', velocity: 0.85 }, metal: { note: 'D5', velocity: 0.5 }, bells: { notes: ['A5', 'D6'], spacing: 0.035, duration: 0.12 } },
  drain: { sweep: { from: 2400, to: 350, duration: 0.2, velocity: 0.55 }, impact: { note: 'D2', velocity: 0.65 }, bells: { notes: ['D4', 'Ab4', 'A4', 'D5'], spacing: 0.065, duration: 0.22 }, aura: { notes: ['D3', 'A3'], duration: 0.35 } },
  regen: { bells: { notes: ['A4', 'D5', 'F5', 'A5', 'D6'], spacing: 0.095, duration: 0.28 }, aura: { notes: ['D4', 'A4'], duration: 0.5 } },
  barrier: { metal: { note: 'A4', velocity: 0.4 }, bells: { notes: ['D5', 'A5', 'D6'], spacing: 0.06, duration: 0.35 }, aura: { notes: ['D3', 'A3', 'D4'], duration: 0.48 } },
  cleanse: { sweep: { from: 1400, to: 6000, duration: 0.16, velocity: 0.25 }, bells: { notes: ['A5', 'D6', 'F6', 'A6'], spacing: 0.07, duration: 0.27 }, aura: { notes: ['D4', 'F4', 'A4'], duration: 0.34 } },
  mend_pair: { bells: { notes: ['D5', 'F5', 'A5', 'C6', 'D6', 'F6'], spacing: 0.06, duration: 0.3 }, aura: { notes: ['D4', 'F4', 'C5'], duration: 0.4 } },
  shatter: { sweep: { from: 8000, to: 950, duration: 0.18, velocity: 0.9 }, impact: { note: 'C2', velocity: 0.95 }, metal: { note: 'F5', velocity: 0.65 }, bells: { notes: ['D6', 'A5', 'F5'], spacing: 0.045, duration: 0.13 } },
  dispel: { sweep: { from: 6800, to: 500, duration: 0.19, velocity: 0.45 }, metal: { note: 'Eb5', velocity: 0.25 }, bells: { notes: ['A5', 'Eb5', 'D5', 'A4'], spacing: 0.055, duration: 0.15 } },
  dawn: { sweep: { from: 650, to: 7500, duration: 0.2, velocity: 0.85 }, impact: { note: 'D2', velocity: 1 }, metal: { note: 'D5', velocity: 0.45 }, bells: { notes: ['D5', 'A5', 'D6', 'F6', 'A6'], spacing: 0.055, duration: 0.3 }, aura: { notes: ['D3', 'A3', 'D4', 'F4'], duration: 0.42 } },
  wave: { sweep: { from: 250, to: 1800, duration: 0.3, velocity: 0.3 }, impact: { note: 'D2', velocity: 0.45 }, aura: { notes: ['D3', 'F3', 'A3'], duration: 0.48 } },
  defeat: { bells: { notes: ['A4', 'F4', 'D4', 'A3'], spacing: 0.12, duration: 0.25 }, aura: { notes: ['D3', 'F3'], duration: 0.5 } },
};

export interface CombatSynth {
  play(kind: SoundCue, skill: SkillTemplate | undefined, time: number): boolean;
}

export async function createCombatSynth(tone: typeof Tone, output: Tone.Gain): Promise<CombatSynth> {
  // A single reusable graph: no new oscillators/effects per action. Dry transients
  // remain clear in mono; both effect returns pass through the shared SE volume.
  const bus = new tone.Gain(1.05).connect(output);
  const room = new tone.Reverb({ decay: 1.05, preDelay: 0.012, wet: 1 });
  const roomReturn = new tone.Gain(0.16).connect(output);
  bus.connect(room); room.connect(roomReturn);
  const echo = new tone.FeedbackDelay({ delayTime: 0.105, feedback: 0.17, wet: 0.18 }).connect(bus);
  const airFilter = new tone.Filter({ type: 'bandpass', frequency: 1800, Q: 0.8 }).connect(bus);
  const air = new tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.003, decay: 0.16, sustain: 0, release: 0.08 }, volume: -5 }).connect(airFilter);
  const hit = new tone.MembraneSynth({ pitchDecay: 0.028, octaves: 3, envelope: { attack: 0.002, decay: 0.18, sustain: 0, release: 0.08 }, volume: -3 }).connect(bus);
  const metal = new tone.MetalSynth({ harmonicity: 5.1, modulationIndex: 12, resonance: 2600, octaves: 1, envelope: { attack: 0.001, decay: 0.085, sustain: 0, release: 0.06 }, volume: -14 }).connect(bus);
  type VoiceSlot = { voice: Tone.Synth | Tone.FMSynth; freeAt: number };
  const bells: VoiceSlot[] = Array.from({ length: 6 }, () => ({ freeAt: 0, voice: new tone.FMSynth({ harmonicity: 3.01, modulationIndex: 5, envelope: { attack: 0.003, decay: 0.2, sustain: 0, release: 0.3 }, modulationEnvelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.15 }, volume: -3 }).connect(echo) }));
  const aura: VoiceSlot[] = Array.from({ length: 4 }, () => ({ freeAt: 0, voice: new tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.025, decay: 0.2, sustain: 0.12, release: 0.32 }, volume: -10 }).connect(bus) }));
  const note = (pool: VoiceSlot[], pitch: string, duration: number, time: number, velocity: number) => {
    const slot = pool.find(candidate => candidate.freeAt <= time);
    // Protect phones during catch-up bursts: omit an overlapping ornament rather
    // than growing the graph, stealing a foreground hit, or queuing long delays.
    if (!slot) return;
    slot.freeAt = time + duration + 0.35;
    slot.voice.triggerAttackRelease(pitch, duration, time, velocity);
  };
  await room.ready;

  return { play(kind, skill, time) {
    const key = skill ?? kind;
    if (!Object.hasOwn(scores, key)) return false;
    const score = scores[key as CombatKey];
    const intensity = skill ? 1 : 0.72;
    if (score.sweep) {
      const { from, to, duration, velocity } = score.sweep;
      // New foreground sweeps replace filter automation, never allocate a new filter.
      airFilter.frequency.cancelScheduledValues(time);
      airFilter.frequency.setValueAtTime(from, time);
      airFilter.frequency.exponentialRampToValueAtTime(to, time + duration);
      air.triggerAttackRelease(duration, time, velocity * intensity);
    }
    if (score.impact) hit.triggerAttackRelease(score.impact.note, 0.12, time + 0.035, score.impact.velocity * intensity);
    if (score.metal) metal.triggerAttackRelease(score.metal.note, 0.045, time + 0.055, score.metal.velocity * intensity);
    if (score.bells) {
      const { notes, spacing, duration } = score.bells;
      notes.forEach((pitch, index) => note(bells, pitch, duration, time + 0.07 + index * spacing, 0.8 * intensity));
    }
    if (score.aura) for (const pitch of score.aura.notes) note(aura, pitch, score.aura.duration, time + 0.025, 0.65 * intensity);
    return true;
  } };
}
