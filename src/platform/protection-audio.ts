import { renderUltimateCharge } from './ultimate-charge-audio';

/** Reuse the actual ultimate opening sound, with ordinary protection volume. */
export function renderProtectionSound(_kind: 'guard' | 'barrier', sampleRate: number, variation = 0, options: { duration?: number; peak?: number } = {}): Float32Array {
  const take = ((variation % 3) + 3) % 3;
  return renderUltimateCharge(sampleRate, {
    duration: options.duration,
    peak: options.peak ?? [.5, .485, .47][take],
  });
}
