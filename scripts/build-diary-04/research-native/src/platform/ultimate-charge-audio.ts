/** The shared "ブオーン" played at the start of every ultimate cut-in. */
export function renderUltimateCharge(sampleRate: number, options: { duration?: number; peak?: number } = {}): Float32Array {
  const duration = options.duration ?? .68;
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  const pole = (hz: number) => 1 - Math.exp(-2 * Math.PI * hz / sampleRate);
  const airA = pole(5900), floorA = pole(580);
  let seed = 0x51a71, air = 0, floor = 0, phase = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const noise = (seed >>> 0) / 0x80000000 - 1;
    air += airA * (noise - air); floor += floorA * (noise - floor);
    phase += 2 * Math.PI * (220 + 1300 * (t / duration) ** 2) / sampleRate;
    const sound = ((air - floor) * .7 + Math.sin(phase + 1.2 * Math.sin(phase * 1.41)) * .2) * Math.sin(Math.PI * t / duration) ** 2;
    samples[i] = Math.tanh(sound * .9);
  }
  let peak = .001;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = (options.peak ?? .23) / peak;
  for (let i = 0; i < samples.length; i++) samples[i] *= gain * Math.min(1, i / (sampleRate * .001), (samples.length - 1 - i) / (sampleRate * .08));
  return samples;
}
