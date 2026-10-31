import { RABBIT_VOLLEY, RABBIT_FLIGHT, rabbitShotTimes } from './ultimate-choreography';

/** Pulse/triangle 8-bit crossfire with weighted plasma finisher. Retime deadlines only. */
export function renderRabbitVolley(sampleRate: number, timingScale = 1): Float32Array {
  const scale=Number.isFinite(timingScale)?Math.max(.25,Math.min(4,timingScale)):1;
  const duration=(RABBIT_VOLLEY.finale+RABBIT_VOLLEY.echoes[1])*scale+.36;
  const pcm=new Float32Array(Math.ceil(duration*sampleRate));
  const pole=(hz:number)=>1-Math.exp(-2*Math.PI*hz/sampleRate);
  const loA=pole(170),bodyA=pole(2200),airA=pole(5200);
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
      const onset=1-Math.exp(-age*900);
      // A genuine pulse/triangle chip voice: stepped pitch, sample hold and 8-bit amplitude.
      const held=Math.floor(age*12000)/12000;
      const pitches=[988,740,494,330],step=.018;
      let cycles=0;
      for(let k=0;k<4;k++)cycles+=pitches[k]*Math.max(0,Math.min(step,held-k*step));
      cycles*=2**((shot.bit%2+shot.round*2)/12);
      const phase=cycles%1,pulse=phase<.25?.75:-.25;
      const triangle=1-4*Math.abs(phase-.5);
      const env=onset*Math.exp(-age*47)*Math.max(0,1-age/.09);
      const chip=Math.round((pulse*.8+triangle*.27)*127)/127;
      const weight=Math.sin(2*Math.PI*118*age)*Math.exp(-age*40)*.13;
      sound+=(chip*1.15+weight)*env*(.9+shot.round*.10);
      const contact=age-RABBIT_FLIGHT.shot*scale;
      if(contact>=0&&contact<.08){
        const contactEnv=(1-Math.exp(-contact*900))*Math.exp(-contact*65);
        const digitalNoise=Math.round(grit*15)/15;
        sound+=(digitalNoise*.65+Math.sin(2*Math.PI*196*contact)*.22)*contactEnv;
      }
    }
    // Pressure leaving the four clock emitters precedes the combined landing.
    const departure=t-(finish-RABBIT_FLIGHT.finale*scale);
    if(departure>=0&&departure<RABBIT_FLIGHT.finale*scale){
      const q=departure/(RABBIT_FLIGHT.finale*scale);
      sound+=(grit*1.1+spark*.35)*Math.sin(Math.PI*q)**2;
    }
    // A broad detonation and two darker returns. No UI notes or metallic partials.
    for(const [at,strength] of [[finish,1],[finish+RABBIT_VOLLEY.echoes[0]*scale,.38],[finish+RABBIT_VOLLEY.echoes[1]*scale,.19]]){
      const age=t-at;if(age<0)continue;
      const onset=1-Math.exp(-age*450);
      const phase=2*Math.PI*(68*age+170*.025*(1-Math.exp(-age/.025)));
      const weight=(Math.sin(phase)+.65*Math.sin(phase*2)+.32*Math.sin(phase*3)+.18*Math.sin(phase*5))*.58;
      const thunder=grit*4.6+lo*2.2+spark*.55*Math.exp(-age*30);
      sound+=(weight+thunder)*onset*Math.exp(-age*15)*strength;
    }
    pcm[i]=Math.tanh(sound*.92);
  }
  let peak=.001;for(const x of pcm)peak=Math.max(peak,Math.abs(x));
  for(let i=0;i<pcm.length;i++)pcm[i]*=.83/peak*Math.min(1,i/(sampleRate*.002),(pcm.length-1-i)/(sampleRate*.055));
  return pcm;
}
