import { RABBIT_TIMING } from './ultimate-timing';
import { renderRabbitVolley } from './rabbit-volley-audio';
import { renderUltimateCharge } from './ultimate-charge-audio';

/** User's "buff sound" means the existing pre-ultimate ブオーン, not the buff skill. */
export function enhanceRabbitCharge(source:Float32Array):Float32Array {
  return Float32Array.from(source,value=>value*1.65);
}
export const RABBIT_CHARGE_CUES=[0,.9,1.8,2.55] as const;
/** Reuse the exact existing charge waveform at readable intervals, including the final wind-up. */
export function renderRabbitUltimate(sampleRate:number,rate=1):Float32Array {
  const speed=rate===1.25?1.25:1;
  const pcm=new Float32Array(Math.ceil(RABBIT_TIMING.end/1000/speed*sampleRate));
  const add=(voice:Float32Array,at:number,gain:number)=>{const offset=Math.round(at/speed*sampleRate);for(let i=0;i<voice.length&&i+offset<pcm.length;i++)pcm[i+offset]+=voice[i]*gain;};
  const charge=enhanceRabbitCharge(renderUltimateCharge(sampleRate));
  RABBIT_CHARGE_CUES.forEach((at,index)=>add(charge,at,index===3?1.12:1));
  add(renderRabbitVolley(sampleRate,1/speed),RABBIT_TIMING.impact/1000,.55);
  let peak=.001;for(const value of pcm)peak=Math.max(peak,Math.abs(value));
  for(let i=0;i<pcm.length;i++)pcm[i]*=.83/peak*Math.min(1,i/(sampleRate*.002),(pcm.length-1-i)/(sampleRate*.06));
  return pcm;
}
