/** BGM and synths use one device clock. Independent contexts can renegotiate
 * iOS's output sample rate while music is playing. Let the device choose its
 * native rate, then resample every source into that same context. */
type AudioOwner = 'music' | 'effects';
let shared: AudioContext | undefined;
const owners = new Set<AudioOwner>();
export function acquireGameAudioContext(owner: AudioOwner): AudioContext {
  if (!shared || shared.state === 'closed') {
    shared = new window.AudioContext({ latencyHint: 'interactive' });
    owners.clear();
  }
  owners.add(owner);
  return shared;
}
/** Disposing music must not tear down the sound-effect graph. */
export function releaseGameAudioContext(owner: AudioOwner, context: AudioContext): void {
  if (context !== shared) return;
  owners.delete(owner);
  if (owners.size) return;
  shared = undefined;
  if (context.state !== 'closed') void context.close().catch(() => undefined);
}
