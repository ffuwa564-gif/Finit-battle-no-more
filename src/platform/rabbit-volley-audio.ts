import { RABBIT_VOLLEY, rabbitShotTimes } from './ultimate-choreography';

/** Original layered plasma weapon. Stretch deadlines, never the individual transients. */
export function renderRabbitVolley(sampleRate: number, timingScale = 1): Float32Array {
  const scale=Number.isFinite(timingScale)?Math.max(.25,Math.min(4,timingScale)):1;
  const duration=(RABBIT_VOLLEY.finale+RABBIT_VOLLEY.echoes[1])*scale+.36;
  const pcm=new Float32Array(Math.ceil(duration*sampleRate));
  const pole=(hz:number)=>1-Math.exp(-2*Math.PI*hz/sampleRate);
  const loA=pole(140),bodyA=pole(1600),airA=pole(4800);
  let lo=0,body=0,air=0,seed=0x719cdf;
  const shots=[0,1,2,3].flatMap(bit=>rabbitShotTimes(bit).map((at,round)=>({at:at*scale,bit,round})));
  const finish=RABBIT_VOLLEY.finale*scale;
  for(let i=0;i<pcm.length;i++){
    const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const n=(seed>>>0)/0x80000000-1;
    lo+=loA*(n-lo);body+=bodyA*(n-body);air+=airA*(n-air);
    const grit=body-lo,spark=air-body;
    let sound=0;
    for(const shot of shots){
      const age=t-shot.at;if(age<0||age>.2)continue;
      const onset=1-Math.exp(-age*700);
      const variant=1+(shot.bit-1.5)*.035+(shot.round-1.5)*.018;
      // Falling electrical pitch with harmonic weight audible on phone speakers.
      const phase=2*Math.PI*variant*(190*age+790*.018*(1-Math.exp(-age/.018)));
      const plasma=(Math.sin(phase)+.34*Math.sin(phase*2)+.14*Math.sin(phase*3));
      const punch=Math.sin(2*Math.PI*(105*age+115*.012*(1-Math.exp(-age/.012))));
      const core=plasma*.29*Math.exp(-age*27)+punch*.25*Math.exp(-age*34);
      const pressure=grit*2.6*Math.exp(-age*31)+spark*.32*Math.exp(-age*100);
      sound+=(core+pressure)*onset*(.88+shot.round*.05);
    }
    // A broad detonation and two darker returns. No UI notes or metallic partials.
    for(const [at,strength] of [[finish,1],[finish+RABBIT_VOLLEY.echoes[0]*scale,.38],[finish+RABBIT_VOLLEY.echoes[1]*scale,.19]]){
      const age=t-at;if(age<0)continue;
      const onset=1-Math.exp(-age*450);
      const phase=2*Math.PI*(68*age+170*.025*(1-Math.exp(-age/.025)));
      const weight=(Math.sin(phase)+.48*Math.sin(phase*2)+.2*Math.sin(phase*3))*.42;
      const thunder=grit*3.7+lo*1.8+spark*.65*Math.exp(-age*30);
      sound+=(weight+thunder)*onset*Math.exp(-age*15)*strength;
    }
    pcm[i]=Math.tanh(sound*.92);
  }
  let peak=.001;for(const x of pcm)peak=Math.max(peak,Math.abs(x));
  for(let i=0;i<pcm.length;i++)pcm[i]*=.83/peak*Math.min(1,i/(sampleRate*.002),(pcm.length-1-i)/(sampleRate*.055));
  return pcm;
}
