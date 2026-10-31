import { RABBIT_FLIGHT, RABBIT_VOLLEY, rabbitShotTimes } from './ultimate-choreography';

/** One soft clock-bell flourish after each four-hit pass; only the motif rises. */
export const RABBIT_CHIME_BASES = [659.255,739.989,830.609,987.767] as const;
export const rabbitChimeTimes = () => Array.from({length:RABBIT_VOLLEY.rounds},(_,round)=>
  rabbitShotTimes(3)[round]+RABBIT_FLIGHT.shot+.015);
export function renderRabbitVolleyChimes(sampleRate:number,timingScale=1):Float32Array {
  const scale=Number.isFinite(timingScale)?Math.max(.25,Math.min(4,timingScale)):1;
  const cues=rabbitChimeTimes(),duration=cues.at(-1)!*scale+.21;
  const pcm=new Float32Array(Math.ceil(duration*sampleRate));
  cues.forEach((at,round)=>{
    const offset=Math.round(at*scale*sampleRate),length=Math.ceil(.21*sampleRate);
    for(let i=0;i<length&&offset+i<pcm.length;i++){
      const t=i/sampleRate;let value=0;
      for(let note=0;note<3;note++){
        const age=t-note*.028;if(age<0)continue;
        const phase=2*Math.PI*RABBIT_CHIME_BASES[round]*[1,1.25,1.5][note]*age;
        const env=(1-Math.exp(-age*1100))*Math.exp(-age*27);
        value+=(Math.sin(phase)+.24*Math.sin(phase*2)*Math.exp(-age*12)+.055*Math.sin(phase*3)*Math.exp(-age*25))*env;
      }
      pcm[offset+i]+=value*.22*Math.min(1,(length-1-i)/(sampleRate*.012));
    }
  });
  return pcm;
}
