import type * as ToneTypes from 'tone';
import type { Rarity } from '../domain/types';

let Tone: typeof import('tone') | undefined;
let gain: ToneTypes.Gain | undefined;
let voice: ToneTypes.PolySynth | undefined;
let noise: ToneTypes.NoiseSynth | undefined;
let browserContext: AudioContext | undefined;
let active = false;
let volume = 0.55;
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
        gain = new tone.Gain(volume * 0.18).toDestination();
        voice = new tone.PolySynth(tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.008, decay: 0.16, sustain: 0.08, release: 0.45 },
          volume: -8,
        }).connect(gain);
        noise = new tone.NoiseSynth({
          noise: { type: 'pink' },
          envelope: { attack: 0.002, decay: 0.09, sustain: 0, release: 0.06 },
          volume: -20,
        }).connect(gain);
      }
      active = tone.getContext().state === 'running';
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
  gain?.gain.rampTo(volume * 0.18, 0.05);
}

/** The sole synth dispatcher. It accepts game events, never character-specific code. */
export function playSound(kind: string, rarity?: Rarity): void {
  if (!active || !voice || !gain || !Tone || volume === 0 || Tone.getContext().state !== 'running') return;
  try {
    const now = Tone.now() + 0.015;
    const notes = (sequence: string[], spacing = 0.07, duration = 0.19, velocity = 0.5) => {
      sequence.forEach((note, index) => voice?.triggerAttackRelease(note, duration, now + index * spacing, velocity));
    };
    switch (kind) {
      case 'ui':
      case 'confirm': notes(['D5', 'A5'], 0.035, 0.055, 0.22); break;
      case 'cancel': notes(['A4', 'D4'], 0.035, 0.055, 0.22); break;
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
      case 'dialogue': break;
      case 'area': noise?.triggerAttackRelease(0.1, now, 0.35); notes(['D3', 'A3', 'D4'], 0.035, 0.16, 0.4); break;
      case 'attack':
      case 'skill': noise?.triggerAttackRelease(0.055, now, 0.3); notes(['A3', 'D3'], 0.025, 0.075, 0.38); break;
      default: notes(['D5'], 0, 0.07, 0.2);
    }
  } catch {
    // Concurrent browser suspension/rapid catch-up may reject synth scheduling.
    // Saved game results and replay cursors must still progress normally.
  }
}
