/** Rounded synth buff: a low harmonic voice blooms upward, then settles away. */
export function renderProtectionSound(kind: 'guard' | 'barrier', sampleRate: number, variation = 0, options: { duration?: number; peak?: number } = {}): Float32Array {
  const take = ((variation % 3) + 3) % 3;
  const duration = options.duration ?? (kind === 'guard' ? [.74, .78, .82][take] : [.84, .86, .88][take]);
  const pcm = new Float32Array(Math.ceil(duration * sampleRate));
  const root = (kind === 'guard' ? 120 : 140) + take * 5;
  let phase = 0, twinPhase = 0, filtered = 0, rounded = 0;
  for (let i = 0; i < pcm.length; i++) {
    const t = i / sampleRate, age = t / duration;
    // Smooth upward scoop supplies the "bwooom" vowel; only harmonic partials
    // follow the fundamental, with no inharmonic bell/FM or noise transient.
    const frequency = root * (.68 + .64 * (1 - Math.exp(-t / .065)) - .25 * age);
    phase += 2 * Math.PI * frequency / sampleRate;
    twinPhase += 2 * Math.PI * frequency * 1.006 / sampleRate;
    const voice = Math.sin(phase) + .28 * Math.sin(2 * phase) + .12 * Math.sin(3 * phase) + .045 * Math.sin(4 * phase) + .22 * Math.sin(twinPhase);
    const cutoff = 380 + 850 * Math.sin(Math.PI * Math.min(1, age));
    const pole = 1 - Math.exp(-2 * Math.PI * cutoff / sampleRate);
    filtered += pole * (voice - filtered); rounded += pole * (filtered - rounded);
    const bloom = Math.sin(Math.min(1, t / .075) * Math.PI / 2) ** 2;
    const release = Math.cos(Math.min(1, Math.max(0, (age - .22) / .78)) * Math.PI / 2) ** 2;
    pcm[i] = rounded * bloom * release;
  }
  let peak = .001;
  for (const sample of pcm) peak = Math.max(peak, Math.abs(sample));
  const level = options.peak ?? .56;
  for (let i = 0; i < pcm.length; i++) pcm[i] *= level / peak * Math.min(1, i / (sampleRate * .008), (pcm.length - 1 - i) / (sampleRate * .02));
  return pcm;
}
