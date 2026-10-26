/** Original procedural sound design. No bell melody, media download or random runtime voices. */
export type UltimateSound = 'ultimate' | 'ultimate-strike' | 'ultimate-magic' | 'ultimate-sanctuary';
export const isUltimateSound = (kind: string): kind is UltimateSound => kind === 'ultimate' || kind === 'ultimate-strike' || kind === 'ultimate-magic' || kind === 'ultimate-sanctuary';

export function renderUltimateSound(kind: UltimateSound, sampleRate: number): Float32Array {
  const charge = kind === 'ultimate', sanctuary = kind === 'ultimate-sanctuary';
  const duration = charge ? .82 : 2.1;
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  let seed = 0x51a71, low = 0, slow = 0, phase = 0, lastNoise = 0;
  const bursts = kind === 'ultimate-magic' ? [0, .055, .13, .23, .34] : sanctuary ? [0, .11, .24] : [0, .045, .12, .205];
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const noise = (seed >>> 0) / 0x80000000 - 1;
    low += .075 * (noise - low); slow += .014 * (noise - slow);
    if (charge) {
      phase += 2 * Math.PI * (240 + 2100 * Math.pow(t / duration, 2)) / sampleRate;
      const envelope = Math.sin(Math.PI * t / duration) * .26;
      samples[i] = (Math.sin(phase + 5 * Math.sin(phase * 2.17)) * .42 + (noise - low) * .35) * envelope;
    } else {
      let electricity = 0;
      for (let b = 0; b < bursts.length; b++) {
        const dt = t - bursts[b];
        if (dt < 0 || dt > .16) continue;
        const env = Math.min(1, dt * 1800) * Math.exp(-dt * (sanctuary ? 25 : 37)) / (1 + b * .24);
        // Swept inharmonic FM, sharp noise cracks and their jagged high-frequency edge.
        const carrier = 2 * Math.PI * (2200 * dt - 4900 * dt * dt);
        electricity += env * (.32 * Math.sin(carrier + 8 * Math.sin(carrier * 1.731)) + .7 * (noise - low) + .12 * (noise - lastNoise));
      }
      const boom = Math.sin(2 * Math.PI * (52 * t + 4 * (1 - Math.exp(-25 * t)))) * Math.exp(-t * 5.5);
      const thunder = (slow * 5 + low * 1.2) * Math.exp(-t * 2.4) * Math.min(1, t * 50);
      const air = (noise - low) * Math.exp(-t * 7) * .12;
      const bloom = sanctuary ? Math.sin(2 * Math.PI * 740 * t + Math.sin(2 * Math.PI * 1110 * t)) * Math.exp(-t * 3.5) * .12 : 0;
      samples[i] = Math.tanh(electricity * 1.8 + boom * .65 + thunder * .65 + air + bloom);
    }
    lastNoise = noise;
  }
  if (!charge) {
    // Finite multi-tap reflections: no feedback node or late sounds survive indefinitely.
    const dry = samples.slice();
    for (const [delay, gain] of [[.095,.27],[.173,.18],[.287,.12],[.431,.075],[.613,.04]]) {
      const offset = Math.round(delay * sampleRate);
      for (let i = offset; i < samples.length; i++) samples[i] += dry[i - offset] * gain;
    }
  }
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = (charge ? .24 : .88) / Math.max(peak, .001);
  for (let i = 0; i < samples.length; i++) {
    const edge = Math.min(1, i / (sampleRate * .001), (samples.length - 1 - i) / (sampleRate * .09));
    samples[i] *= gain * edge;
  }
  return samples;
}
