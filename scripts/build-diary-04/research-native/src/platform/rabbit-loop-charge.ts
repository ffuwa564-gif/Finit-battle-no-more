import { rabbitLoopCues } from './ultimate-choreography';
import { renderUltimateCharge } from './ultimate-charge-audio';

/** Resample the exact familiar charge waveform: its tone and air both rise, no new melody. */
export function renderRabbitLoopCharge(sampleRate:number,round:number,timingScale=1):Float32Array {
  const scale=Number.isFinite(timingScale)?Math.max(.25,Math.min(4,timingScale)):1;
  const cue=rabbitLoopCues()[round],source=renderUltimateCharge(sampleRate,{duration:.68*scale});
  const pcm=new Float32Array(Math.ceil(source.length/cue.ratio));
  for(let i=0;i<pcm.length;i++){
    const at=i*cue.ratio,lo=Math.floor(at),mix=at-lo;
    pcm[i]=((source[lo]??0)*(1-mix)+(source[lo+1]??0)*mix)*1.65*(.95+round*.39);
  }
  pcm[pcm.length-1]=0;return pcm;
}
export function renderRabbitLoopCharges(sampleRate:number,timingScale=1):Float32Array {
  const scale=Number.isFinite(timingScale)?Math.max(.25,Math.min(4,timingScale)):1;
  const cues=rabbitLoopCues(),last=cues.at(-1)!;
  const pcm=new Float32Array(Math.ceil((last.at*scale+last.duration*scale)*sampleRate));
  for(const cue of cues){
    const voice=renderRabbitLoopCharge(sampleRate,cue.round,scale),offset=Math.round(cue.at*scale*sampleRate);
    for(let i=0;i<voice.length&&offset+i<pcm.length;i++)pcm[offset+i]+=voice[i];
  }
  return pcm;
}
