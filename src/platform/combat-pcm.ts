import { combatPcmKeys, renderCombatPcm } from './combat-pcm-scores';

export async function prepareCombatPcm(sampleRate: number): Promise<Map<string, Float32Array>> {
  try {
    return await new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./combat-pcm.worker.ts', import.meta.url), { type: 'module' });
      const finish = () => { clearTimeout(timeout); worker.terminate(); };
      const timeout = setTimeout(() => { finish(); reject(new Error('Combat PCM worker timed out')); }, 15000);
      worker.onmessage = (event: MessageEvent<[string, Float32Array][]>) => {
        finish(); resolve(new Map(event.data));
      };
      worker.onerror = event => { event.preventDefault(); finish(); reject(new Error('Combat PCM worker unavailable')); };
      worker.onmessageerror = () => { finish(); reject(new Error('Combat PCM transfer failed')); };
      worker.postMessage(sampleRate);
    });
  } catch {
    // Restrictive embeds/older browsers retain every sound. Yield between scores
    // instead of doing the entire soundtrack in one main-thread long task.
    const pcm = new Map<string, Float32Array>();
    for (const key of combatPcmKeys) {
      await new Promise(resolve => setTimeout(resolve, 0));
      pcm.set(key, renderCombatPcm(key, sampleRate));
    }
    return pcm;
  }
}
