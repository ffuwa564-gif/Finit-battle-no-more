import { RABBIT_TIMING } from './ultimate-timing';
import { RABBIT_VOLLEY } from './ultimate-choreography';
import { renderRabbitVolley } from './rabbit-volley-audio';
import { renderUltimateCharge } from './ultimate-charge-audio';

/** The familiar ascending buff motif, in a brighter register with rounded harmonics. */
export function renderRabbitBuff(sampleRate:number, pitch=1):Float32Array {
  const pcm=new Float32Array(Math.ceil(.62*sampleRate));
  // Existing buff's F4/C5/F5/A5 motif, transposed -5 in CombatSynth, then up an octave.
  const notes=[523.251,783.991,1046.502,1318.51];
  for(let i=0;i<pcm.length;i++){
    const t=i/sampleRate;let value=0;
    for(let n=0;n<notes.length;n++){
      const age=t-n*.052;if(age<0)continue;
      const env=(1-Math.exp(-age/.012))*Math.exp(-age/.125)*Math.min(1,Math.max(0,(.46-age)/.12));
      const phase=2*Math.PI*notes[n]*pitch*age;
      value+=(Math.sin(phase)+.10*Math.sin(phase*3))*env*.22;
    }
    pcm[i]=value;
  }
  return pcm;
}
export const RABBIT_BUFF_CUES=[.12,.65,1.1,1.75,2.02,2.29,2.56,2.95] as const;
/** One clocked soundtrack owns summon, repeated power-up phrases and the volley. */
export function renderRabbitUltimate(sampleRate:number,rate=1):Float32Array {
  const speed=rate===1.25?1.25:1;
  const pcm=new Float32Array(Math.ceil(RABBIT_TIMING.end/1000/speed*sampleRate));
  const add=(voice:Float32Array,at:number,gain:number)=>{const offset=Math.round(at/speed*sampleRate);for(let i=0;i<voice.length&&i+offset<pcm.length;i++)pcm[i+offset]+=voice[i]*gain;};
  add(renderUltimateCharge(sampleRate),0,.55);
  add(renderRabbitVolley(sampleRate,1/speed),RABBIT_TIMING.impact/1000,.58);
  RABBIT_BUFF_CUES.forEach((at,index)=>{
    const pitch=index<4?1:2**((index-3)/12);
    add(renderRabbitBuff(sampleRate,pitch),at,index<3?1.25:1.05+(index-3)*.11);
  });
  // A broad upper-register bloom coincides with the final whiteout, rather than a bell ping.
  add(renderRabbitBuff(sampleRate,1.5),RABBIT_TIMING.impact/1000+RABBIT_VOLLEY.finale,1.3);
  let peak=.001;for(const value of pcm)peak=Math.max(peak,Math.abs(value));
  for(let i=0;i<pcm.length;i++)pcm[i]*=.83/peak*Math.min(1,i/(sampleRate*.002),(pcm.length-1-i)/(sampleRate*.06));
  return pcm;
}
