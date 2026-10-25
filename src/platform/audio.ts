import type * as ToneTypes from 'tone';
import type { SoundCue } from './sound-cues';
import type { Rarity, SkillTemplate } from '../domain/types';
import { createCombatSynth, type CombatSynth } from './combat-synth';

let Tone: typeof import('tone') | undefined;
let gain: ToneTypes.Gain | undefined;
let voice: ToneTypes.PolySynth | undefined;
let combat: CombatSynth | undefined;
let limiter: ToneTypes.Limiter | undefined;
let lastCueAt = 0;
const pending: { kind: SoundCue; rarity?: Rarity; skill?: SkillTemplate; at: number }[] = [];
let browserContext: AudioContext | undefined;
let active = false;
let volume = 1;
let enabling: Promise<void> | undefined;

/** Only called in a trusted pointer/key gesture. Audio failure never blocks play. */
export async function enableAudio(): Promise<void> {
  if (active && browserContext?.state === 'running') return;
  if (enabling) return enabling;
  enabling = (async () => {
    try {
      // Unlock a native context synchronously in the gesture before downloading Tone.
      // This preserves Safari's gesture requirement while keeping the synth out of
      // the initial home-screen bundle.
      if (!browserContext || browserContext.state === 'closed') browserContext = new window.AudioContext();
      const unlocked = browserContext.resume().catch(() => undefined);
      const tone = await import('tone');
      await unlocked;
      if (!Tone) { Tone = tone; tone.setContext(browserContext); }
      await tone.start();
      if (!gain) {
        gain = new tone.Gain(volume * 0.9).connect(limiter = new tone.Limiter(-2).toDestination());
        voice = new tone.PolySynth(tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.008, decay: 0.16, sustain: 0.08, release: 0.45 },
          volume: -3,
        }).connect(gain);
      }
      if (!combat) combat = await createCombatSynth(tone, gain);
      active = tone.getContext().state === 'running';
      if (active) {
        const queued = pending.splice(0).filter(cue => performance.now() - cue.at < 2000);
        for (const cue of queued) playSound(cue.kind, cue.rarity, cue.skill);
      }
    } catch {
      active = false;
    } finally {
      enabling = undefined;
    }
  })();
  return enabling;
}

export function setAudioVolume(next: number): void {
  volume = Number.isFinite(next) ? Math.max(0, Math.min(1, next)) : 0;
  if (volume === 0) pending.length = 0;
  gain?.gain.rampTo(volume * 0.9, 0.05);
}

/** The sole synth dispatcher. It accepts game events, never character-specific code. */
export function playSound(kind: SoundCue, rarity?: Rarity, skill?: SkillTemplate): void {
  if (volume === 0) return;
  if (!active || !voice || !gain || !Tone || Tone.getContext().state !== 'running') {
    if (enabling) { pending.push({ kind, rarity, skill, at: performance.now() }); if (pending.length > 8) pending.shift(); }
    return;
  }
  try {
    const now = Math.max(Tone.now() + 0.015, lastCueAt + 0.045);
    lastCueAt = now;
    const notes = (sequence: string[], spacing = 0.07, duration = 0.19, velocity = 0.5) => {
      sequence.forEach((note, index) => voice?.triggerAttackRelease(note, duration, now + index * spacing, velocity));
    };
    if (!combat?.play(kind, skill, now)) switch (kind) {
      case 'confirm': notes(['D5', 'A5'], 0.035, 0.085, 0.42); break;
      case 'cancel': notes(['A4', 'D4'], 0.035, 0.085, 0.42); break;
      case 'heal': notes(['D4', 'F4', 'A4', 'D5'], 0.08, 0.3, 0.42); break;
      case 'guard': notes(['D3', 'A3'], 0.045, 0.16, 0.55); break;
      case 'buff': notes(['F4', 'A4', 'C5'], 0.06, 0.2, 0.45); break;
      case 'debuff': notes(['D4', 'Ab3', 'D3'], 0.06, 0.22, 0.45); break;
      case 'drop':
        if (rarity === 'epic') notes(['D5', 'F5', 'A5', 'C6', 'E6', 'A6'], 0.075, 0.5, 0.48);
        else if (rarity === 'rare') notes(['D5', 'F5', 'A5', 'D6'], 0.08, 0.4, 0.43);
        else notes(['A5'], 0, 0.11, 0.25);
        break;
      case 'gacha': notes(['D4', 'A4', 'D5', 'F5', 'A5', 'D6'], 0.1, 0.45, 0.5); break;
      case 'wave': notes(['D3', 'F3', 'A3'], 0.09, 0.35, 0.35); break;
      case 'defeat': notes(['A3', 'F3', 'D3'], 0.14, 0.4, 0.35); break;
      case 'recruit': notes(['F4', 'A4', 'D5', 'F5'], 0.09, 0.35, 0.48); break;
      case 'select': notes(['A4', 'E5'], 0.045, 0.1, 0.4); break;
      case 'dialogue': notes(['D4', 'A4'], 0.12, 0.22, 0.3); break;
      case 'purchase': notes(['A5', 'D6', 'F6'], 0.06, 0.18, 0.45); break;
      case 'exchange': notes(['F4', 'C5', 'F5'], 0.08, 0.23, 0.48); break;
      case 'depart': notes(['D3', 'A3', 'D4', 'A4'], 0.09, 0.3, 0.52); break;
      case 'victory': notes(['D4', 'F4', 'A4', 'D5', 'A5', 'D6'], 0.1, 0.5, 0.55); break;
      case 'error': notes(['Eb4', 'D4'], 0.1, 0.16, 0.42); break;
      case 'area': notes(['D3', 'A3', 'D4'], 0.035, 0.16, 0.4); break;
      case 'attack': notes(['A3', 'D3'], 0.025, 0.075, 0.38); break;
      default: notes(['D5'], 0, 0.07, 0.2);
    }
    window.dispatchEvent(new CustomEvent('game:se', { detail: { kind, rarity, skill } }));
  } catch {
    // Concurrent browser suspension/rapid catch-up may reject synth scheduling.
    // Saved game results and replay cursors must still progress normally.
  }
}
