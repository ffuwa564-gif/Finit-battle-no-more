import { combatPcmKeys, renderCombatPcm } from './combat-pcm-scores';

const worker = globalThis as unknown as {
  onmessage: (event: MessageEvent<number>) => void;
  postMessage: (value: [string, Float32Array][], transfer: ArrayBuffer[]) => void;
};
worker.onmessage = ({ data: sampleRate }) => {
  const scores: [string, Float32Array][] = combatPcmKeys.map(key => [key, renderCombatPcm(key, sampleRate)]);
  worker.postMessage(scores, scores.map(([, pcm]) => pcm.buffer as ArrayBuffer));
};
