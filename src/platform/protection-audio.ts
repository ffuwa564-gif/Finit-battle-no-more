/** Unpitched cloth/air protection: no bells, oscillators or resonant partials. */
export function renderProtectionSound(kind: 'guard' | 'barrier', sampleRate: number, variation = 0, options: { duration?: number; peak?: number } = {}): Float32Array {
  const take = ((variation % 3) + 3) % 3;
  const duration = options.duration ?? (kind === 'guard' ? [.62, .56, .76][take] : [.8, .84, .8][take]);
  const pcm = new Float32Array(Math.ceil(duration * sampleRate));
  const pole = (hz: number) => 1 - Math.exp(-2 * Math.PI * hz / sampleRate);
  const bodyRate = pole(kind === 'guard' ? 620 : 850 + take * 90), floorRate = pole(100), cloudRate = pole(1500);
  let seed = 0x42b35 + take * 7919 + (kind === 'guard' ? 0 : 257), body = 0, floor = 0, cloud = 0, smooth = 0, rounded = 0;
  const smoothing = pole(kind === 'guard' ? 1100 : 1300);
  for (let i = 0; i < pcm.length; i++) {
    const t = i / sampleRate, age = t / duration;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const noise = (seed >>> 0) / 0x80000000 - 1;
    body += bodyRate * (noise - body); floor += floorRate * (noise - floor); cloud += cloudRate * (noise - cloud);
    const warm = body - floor, air = cloud - body;
    const bloom = 1 - Math.exp(-t / (kind === 'guard' ? .013 : .045));
    const envelope = bloom * Math.exp(-age * (kind === 'guard' ? 8 : 5));
    const value = (warm + air * (kind === 'guard' ? .08 : .24)) * envelope;
    smooth += smoothing * (value - smooth);
    rounded += smoothing * (smooth - rounded);
    pcm[i] = rounded;
  }
  let peak = .001;
  for (const sample of pcm) peak = Math.max(peak, Math.abs(sample));
  const level = options.peak ?? (kind === 'guard' ? .34 : .28);
  for (let i = 0; i < pcm.length; i++) pcm[i] *= level / peak * Math.min(1, i / (sampleRate * .012), (pcm.length - 1 - i) / (sampleRate * .05));
  return pcm;
}
