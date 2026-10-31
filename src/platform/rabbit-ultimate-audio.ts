import { renderRabbitLoopCharges } from './rabbit-loop-charge';
import { RABBIT_TIMING, RABBIT_SEQUENCE } from './ultimate-timing';
import { renderRabbitVolley } from './rabbit-volley-audio';
import { renderUltimateCharge } from './ultimate-charge-audio';

/** The user's “buff” is this existing pre-ultimate ブオーン, never buff-skill notes. */
export function enhanceRabbitCharge(source: Float32Array): Float32Array {
  return Float32Array.from(source, value => value * 1.65);
}
// Gate opening uses the opening charge. The final pass charge itself launches the heavy bolts.
export const RABBIT_CHARGE_CUES = [(RABBIT_SEQUENCE.summon-680)/1000] as const;

/** Soft air/pressure materialization; no pitched arpeggio or metallic ringing. */
function summonAir(sampleRate: number): Float32Array {
  const pcm=new Float32Array(Math.ceil(.3*sampleRate));let seed=0x713f,low=0;
  const a=1-Math.exp(-2*Math.PI*1900/sampleRate);
  for(let i=0;i<pcm.length;i++){
    const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    low+=a*((seed>>>0)/0x80000000-1-low);
    const env=Math.sin(Math.PI*t/.3)**2*Math.exp(-t*8);
    pcm[i]=(low*.65+Math.sin(2*Math.PI*(160*t+75*.04*(1-Math.exp(-t/.04))))*.12)*env;
  }
  return pcm;
}
/** Command → summon → silent aiming → volley → charge → combined blast → reveal. */
export function renderRabbitUltimate(sampleRate: number, rate=1): Float32Array {
  const speed=rate===1.25?1.25:1;
  const pcm=new Float32Array(Math.ceil(RABBIT_TIMING.end*sampleRate/(1000*speed)));
  const add=(voice:Float32Array,at:number,gain:number)=>{
    const offset=Math.round(at/speed*sampleRate);
    for(let i=0;i<voice.length&&i+offset<pcm.length;i++)pcm[i+offset]+=voice[i]*gain;
  };
  const charge=enhanceRabbitCharge(renderUltimateCharge(sampleRate,{duration:.68/speed}));
  add(charge,RABBIT_CHARGE_CUES[0],.85);
  const arrival=summonAir(sampleRate);
  for(let bit=0;bit<4;bit++)add(arrival,
    (RABBIT_SEQUENCE.summon+bit*RABBIT_SEQUENCE.summonStep+220)/1000,.9);
  // Chip-style shots; the last rising charge resolves directly into the heavy launch.
  add(renderRabbitVolley(sampleRate,1/speed),RABBIT_TIMING.impact/1000,.72);
  add(renderRabbitLoopCharges(sampleRate,1/speed),RABBIT_TIMING.impact/1000,1);
  let peak=.001;for(const value of pcm)peak=Math.max(peak,Math.abs(value));
  for(let i=0;i<pcm.length;i++)pcm[i]*=.83/peak*Math.min(1,i/(sampleRate*.002),(pcm.length-1-i)/(sampleRate*.06));
  return pcm;
}
