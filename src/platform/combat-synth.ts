import { combatFamily, renderCombatSound, type CombatFamily } from './combat-audio';
import type * as Tone from 'tone';
import type { SkillTemplate } from '../domain/types';
import type { SoundCue } from './sound-cues';
import { isUltimateSound, renderUltimateSound, ultimateSounds, type UltimateSound } from './ultimate-audio';

interface CombatScore {
  // Filtered white noise supplies motion, while the membrane supplies the hit.
  sweep?: { from: number; to: number; duration: number; velocity: number };
  impact?: { note: string; velocity: number };
  metal?: { note: string; velocity: number };
  bells?: { notes: string[]; spacing: number; duration: number };
  aura?: { notes: string[]; duration: number };
}
type CombatKey = Exclude<SkillTemplate, 'attack' | 'area' | 'pierce' | 'shatter' | 'drain' | 'dawn' | 'heal' | 'regen' | 'mend_pair' | 'barrier_mend' | 'cleanse' | 'guard' | 'barrier'> | 'wave' | 'defeat';

const attackBoostScore: CombatScore = { bells: { notes: ['F4', 'C5', 'F5', 'A5'], spacing: 0.075, duration: 0.24 }, aura: { notes: ['F3', 'A3', 'C4'], duration: 0.35 } };

/** Exhaustive sound recipes, shared by every character using the same template. */
const scores: Record<CombatKey, CombatScore> = {
  confusion: { sweep: { from: 2100, to: 420, duration: .26, velocity: .4 }, bells: { notes: ['A4', 'Bb4', 'E5', 'Eb5'], spacing: .07, duration: .2 } },
  sleep: { bells: { notes: ['A5', 'F5', 'D5'], spacing: .12, duration: .32 }, aura: { notes: ['D4', 'A4'], duration: .5 } },
  paralysis: { sweep: { from: 7200, to: 1500, duration: .12, velocity: .5 }, metal: { note: 'E6', velocity: .35 }, bells: { notes: ['E5', 'Bb5', 'E6'], spacing: .035, duration: .12 } },
  charm: { bells: { notes: ['F5', 'A5', 'C6', 'E6'], spacing: .09, duration: .25 }, aura: { notes: ['F4', 'A4', 'E5'], duration: .4 } },
  overclock: attackBoostScore,
  jam: { sweep: { from: 4200, to: 220, duration: .24, velocity: .55 }, bells: { notes: ['D5', 'Ab4', 'Eb4', 'D4'], spacing: .065, duration: .18 } },
  buff: attackBoostScore,
  rally: attackBoostScore,
  debuff: { sweep: { from: 4200, to: 220, duration: 0.24, velocity: 0.55 }, bells: { notes: ['D5', 'Ab4', 'Eb4', 'D4'], spacing: 0.065, duration: 0.18 }, aura: { notes: ['D3', 'Ab3'], duration: 0.3 } },
  dispel: { sweep: { from: 6800, to: 500, duration: 0.19, velocity: 0.45 }, metal: { note: 'Eb5', velocity: 0.25 }, bells: { notes: ['A5', 'Eb5', 'D5', 'A4'], spacing: 0.055, duration: 0.15 } },
  wave: { sweep: { from: 250, to: 1800, duration: 0.3, velocity: 0.3 }, impact: { note: 'D2', velocity: 0.45 }, aura: { notes: ['D3', 'F3', 'A3'], duration: 0.48 } },
  defeat: { bells: { notes: ['A4', 'F4', 'D4', 'A3'], spacing: 0.12, duration: 0.25 }, aura: { notes: ['D3', 'F3'], duration: 0.5 } },
};

export interface ScheduledUltimateVoice {
  hasStarted(): boolean;
  cancel(stopActive?: boolean): void;
}
export interface CombatSynth {
  scheduleUltimate(kind: UltimateSound, time: number): ScheduledUltimateVoice;
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
  // Render once per unlocked audio context. Buffer playback avoids monophonic
  // synth scheduling conflicts and gives ultimates a completely separate timbre.
  const context = tone.getContext().rawContext;
  const ultimateBuffers = new Map<UltimateSound, AudioBuffer>();
  for (const kind of ultimateSounds) {
    const pcm = renderUltimateSound(kind, context.sampleRate);
    const buffer = context.createBuffer(1, pcm.length, context.sampleRate);
    buffer.getChannelData(0).set(pcm);
    ultimateBuffers.set(kind, buffer);
  }
  const normalBuffers = new Map<string, AudioBuffer>();
  const variations = new Map<CombatFamily, number>();
  const normalVoices = new Set<{ startsAt: number; source: ReturnType<typeof context.createBufferSource>; envelope: ReturnType<typeof context.createGain> }>();
  const ordinaryBuffer = (family: CombatFamily, variant: number) => {
    const key = `${family}:${variant}`;
    let buffer = normalBuffers.get(key);
    if (!buffer) {
      const pcm = renderCombatSound(family, context.sampleRate, variant);
      buffer = context.createBuffer(1, pcm.length, context.sampleRate);
      buffer.getChannelData(0).set(pcm); normalBuffers.set(key, buffer);
    }
    return buffer;
  };
  ordinaryBuffer('attack', 0);
  const playOrdinary = (family: CombatFamily, time: number) => {
    const variant = variations.get(family) ?? 0;
    variations.set(family, (variant + 1) % 3);
    const buffer = ordinaryBuffer(family, variant);
    // At most six foreground voices; a catch-up burst replaces the oldest one
    // with a tiny fade rather than growing the graph or queuing delayed attacks.
    if (normalVoices.size >= 6) {
      const oldest = normalVoices.values().next().value!;
      const now = context.currentTime;
      if (oldest.startsAt > now) oldest.source.stop();
      else {
        oldest.envelope.gain.setValueAtTime(1, now);
        oldest.envelope.gain.linearRampToValueAtTime(0, now + .008);
        oldest.source.stop(now + .01);
      }
      normalVoices.delete(oldest);
    }
    const source = context.createBufferSource(), envelope = context.createGain();
    source.buffer = buffer; source.connect(envelope); tone.connect(envelope, output);
    const startsAt = Math.max(time, context.currentTime + .003);
    const entry = { source, envelope, startsAt }; normalVoices.add(entry);
    source.onended = () => { normalVoices.delete(entry); source.disconnect(); envelope.disconnect(); };
    source.start(startsAt);
  };
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

  const scheduleUltimate = (kind: UltimateSound, time: number): ScheduledUltimateVoice => {
    const source = context.createBufferSource(), envelope = context.createGain();
    source.buffer = ultimateBuffers.get(kind)!;
    source.connect(envelope); tone.connect(envelope, output);
    let stopped = false;
    source.onended = () => { source.disconnect(); envelope.disconnect(); };
    source.start(time);
    return {
      hasStarted: () => context.currentTime >= time,
      cancel(stopActive = true) {
        if (stopped || (!stopActive && context.currentTime >= time)) return;
        stopped = true;
        const now = context.currentTime;
        if (now < time) source.stop();
        else { envelope.gain.setValueAtTime(1,now); envelope.gain.linearRampToValueAtTime(0,now+.012); source.stop(now+.015); }
      },
    };
  };
  return { scheduleUltimate, play(kind, skill, time) {
    if (isUltimateSound(kind)) { scheduleUltimate(kind, time); return true; }
    const family = combatFamily(kind, skill);
    if (family) { playOrdinary(family, time); return true; }
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
