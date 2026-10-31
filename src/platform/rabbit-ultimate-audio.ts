import { RABBIT_TIMING } from './ultimate-timing';
import { renderRabbitVolley } from './rabbit-volley-audio';
import { renderUltimateCharge } from './ultimate-charge-audio';

/** Preserve the actual combat buff recording: no new notes, pitch shift or delay voices. */
export function enhanceRabbitBuff(source:Float32Array):Float32Array {
  return Float32Array.from(source,value=>value*1.15+.12*Math.tanh(value*3));
}
export const RABBIT_BUFF_CUES=[.12,1,1.8,2.45,3.2] as const;
/** The source is a direct offline render of CombatSynth.play('buff'), at this sample rate. */
export function renderRabbitUltimate(sampleRate:number,rate=1,buffSource?:Float32Array):Float32Array {
  const speed=rate===1.25?1.25:1;
  const pcm=new Float32Array(Math.ceil(RABBIT_TIMING.end/1000/speed*sampleRate));
  const add=(voice:Float32Array,at:number,gain:number)=>{const offset=Math.round(at/speed*sampleRate);for(let i=0;i<voice.length&&i+offset<pcm.length;i++)pcm[i+offset]+=voice[i]*gain;};
  add(renderUltimateCharge(sampleRate),0,.55);
  add(renderRabbitVolley(sampleRate,1/speed),RABBIT_TIMING.impact/1000,.55);
  if(buffSource){
    const buff=enhanceRabbitBuff(buffSource);let peak=.001;for(const value of buff)peak=Math.max(peak,Math.abs(value));
    // Keep the original attack, note spacing, register, aura and room tail intact.
    const gain=.52/peak;
    RABBIT_BUFF_CUES.forEach((at,index)=>add(buff,at,gain*(index===4?1.2:.9+index*.06)));
  }
  let peak=.001;for(const value of pcm)peak=Math.max(peak,Math.abs(value));
  for(let i=0;i<pcm.length;i++)pcm[i]*=.83/peak*Math.min(1,i/(sampleRate*.002),(pcm.length-1-i)/(sampleRate*.06));
  return pcm;
}
