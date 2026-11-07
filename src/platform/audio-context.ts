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

const mixers=new WeakMap<AudioContext,AudioNode>();
/** Unity below the ceiling; only coincident BGM/SE peaks are softly bounded.
 * Half-gain expands the WaveShaper's input domain to ±2 without hard clipping. */
export function gameAudioOutput(context:AudioContext):AudioNode{
 const cached=mixers.get(context);if(cached)return cached;
 if(typeof context.createWaveShaper!=='function')return context.destination;
 const input=context.createGain(),ceiling=context.createWaveShaper(),curve=new Float32Array(4097);
 for(let i=0;i<curve.length;i++){const x=(i/(curve.length-1)*2-1)*2,a=Math.abs(x);curve[i]=a<=.85?x:Math.sign(x)*(.85+.13*Math.tanh((a-.85)/.13));}
 input.gain.value=.5;ceiling.curve=curve;ceiling.oversample='2x';input.connect(ceiling);ceiling.connect(context.destination);mixers.set(context,input);return input;
}
