import { RABBIT_VOLLEY, RABBIT_FLIGHT, rabbitShotTimes } from './ultimate-choreography';

/** A round electronic projectile with a small chip edge, not a four-note UI bleep. */
export function renderRabbitShot(sampleRate:number,bit=0,round=0):Float32Array {
  const pcm=new Float32Array(Math.ceil(.16*sampleRate));
  const ratio=2**(((bit-1.5)*.06+round*.18)/12);
  const lowA=1-Math.exp(-2*Math.PI*3400/sampleRate),dcA=1-Math.exp(-2*Math.PI*45/sampleRate);
  let low=0,dc=0;
  for(let i=0;i<pcm.length;i++){
    const t=i/sampleRate;
    // Integrate the pitch sweep continuously through the full release.
    const cycles=ratio*(310*t+410*.008*(1-Math.exp(-t/.008))),phase=cycles%1;
    const triangle=1-4*Math.abs(phase-.5);
    const chip=Math.round((phase<.5?1:-1)*63)/63;
    const body=Math.sin(2*Math.PI*(155*t+90*.012*(1-Math.exp(-t/.012))));
    const envelope=(1-Math.exp(-t*650))*Math.exp(-t*26)*Math.max(0,Math.min(1,(.11-t)/.025));
    const voice=(triangle*.66+chip*.16+body*.30)*envelope;
    low+=lowA*(voice-low);dc+=dcA*(low-dc);
    pcm[i]=(low-dc)*Math.min(1,(pcm.length-1-i)/(sampleRate*.015));
  }
  return pcm;
}
/** A separate rounded landing body, so fast playback never detaches sound from damage. */
export function renderRabbitContact(sampleRate:number):Float32Array {
  const pcm=new Float32Array(Math.ceil(.08*sampleRate));
  for(let i=0;i<pcm.length;i++){
    const t=i/sampleRate;
    pcm[i]=Math.sin(2*Math.PI*238*t)*(1-Math.exp(-t*1100))*Math.exp(-t*65)*.20*Math.min(1,(pcm.length-1-i)/(sampleRate*.01));
  }
  return pcm;
}
/** One original blast is reused by every repeat, including its exact pressure/noise contour. */
export function renderRabbitFinisher(sampleRate:number):Float32Array {
  const pcm=new Float32Array(Math.ceil(.29*sampleRate));let seed=0x719cdf,lo=0,body=0,air=0;
  const pole=(hz:number)=>1-Math.exp(-2*Math.PI*hz/sampleRate);
  const loA=pole(170),bodyA=pole(2200),airA=pole(5200);
  for(let i=0;i<pcm.length;i++){
    const age=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const noise=(seed>>>0)/0x80000000-1;lo+=loA*(noise-lo);body+=bodyA*(noise-body);air+=airA*(noise-air);
    const phase=2*Math.PI*(68*age+170*.025*(1-Math.exp(-age/.025)));
    const weight=(Math.sin(phase)+.65*Math.sin(phase*2)+.32*Math.sin(phase*3)+.18*Math.sin(phase*5))*.58;
    const pressure=(body-lo)*4.6+lo*2.2+(air-body)*.55*Math.exp(-age*30);
    const envelope=(1-Math.exp(-age*450))*Math.exp(-age*15);
    pcm[i]=Math.tanh((weight+pressure)*envelope*.92)*Math.min(1,(pcm.length-1-i)/(sampleRate*.035));
  }
  return pcm;
}
export const RABBIT_ECHO_GAINS = [.70,.48,.30] as const;
/** Repeat the source with progressively softer highs, retaining the audible midrange body. */
export function renderRabbitEcho(sampleRate:number,source:Float32Array,index:number):Float32Array {
  const pcm=new Float32Array(source.length),a=1-Math.exp(-2*Math.PI*[4200,3400,2700][index]/sampleRate);
  let low=0;
  for(let i=0;i<pcm.length;i++){low+=a*(source[i]-low);pcm[i]=low*RABBIT_ECHO_GAINS[index]*Math.min(1,(pcm.length-1-i)/(sampleRate*.008));}
  return pcm;
}
/** Native attack waveforms; speed changes move contact and echo deadlines, not their pitch. */
export function renderRabbitVolley(sampleRate:number,timingScale=1):Float32Array {
  const scale=Number.isFinite(timingScale)?Math.max(.25,Math.min(4,timingScale)):1;
  const duration=(RABBIT_VOLLEY.finale+RABBIT_VOLLEY.echoes.at(-1)!)*scale+.36;
  const pcm=new Float32Array(Math.ceil(duration*sampleRate));
  const add=(voice:Float32Array,at:number,gain=1)=>{
    const offset=Math.round(at*sampleRate);
    for(let i=0;i<voice.length&&offset+i<pcm.length;i++)pcm[offset+i]+=voice[i]*gain;
  };
  const contact=renderRabbitContact(sampleRate);
  for(let bit=0;bit<4;bit++)for(const [round,at] of rabbitShotTimes(bit).entries()){
    add(renderRabbitShot(sampleRate,bit,round),at*scale,1.25);
    add(contact,(at+RABBIT_FLIGHT.shot)*scale,1.25);
  }
  const finish=RABBIT_VOLLEY.finale*scale,blast=renderRabbitFinisher(sampleRate);
  // Brief rounded departure pressure before the four heavy bodies land.
  const flight=new Float32Array(Math.ceil(RABBIT_FLIGHT.finale*scale*sampleRate));
  for(let i=0;i<flight.length;i++){const u=i/flight.length,t=i/sampleRate;flight[i]=Math.sin(2*Math.PI*(210*t+90*t*t))*.16*Math.sin(Math.PI*u)**2;}
  add(flight,finish-RABBIT_FLIGHT.finale*scale);
  add(blast,finish);
  for(const [index,delay] of RABBIT_VOLLEY.echoes.entries())add(renderRabbitEcho(sampleRate,blast,index),finish+delay*scale);
  let peak=.001;for(const x of pcm)peak=Math.max(peak,Math.abs(x));
  for(let i=0;i<pcm.length;i++)pcm[i]*=.83/peak*Math.min(1,i/(sampleRate*.002),(pcm.length-1-i)/(sampleRate*.055));
  return pcm;
}
