import { RABBIT_VOLLEY, RABBIT_FLIGHT, rabbitShotTimes } from './ultimate-choreography';

/** Original layered plasma weapon. Stretch deadlines, never the individual transients. */
export function renderRabbitVolley(sampleRate: number, timingScale = 1, flavor: 'electric' | 'pressure' = 'electric'): Float32Array {
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
      const onset=1-Math.exp(-age*700);
      const variant=1+(shot.bit-1.5)*.035+(shot.round-1.5)*.018;
      // Dry electrical crack plus a harmonically rich low-mid punch. No long "pew" glide.
      const phase=2*Math.PI*variant*(155*age+330*.009*(1-Math.exp(-age/.009)));
      const plasma=Math.sin(phase)+.3*Math.sin(phase*2);
      const bodyPhase=2*Math.PI*(95*age+90*.016*(1-Math.exp(-age/.016)));
      const punch=Math.sin(bodyPhase)+.5*Math.sin(bodyPhase*2)+.24*Math.sin(bodyPhase*4);
      const core=plasma*(flavor==='electric'?.15:.04)*Math.exp(-age*55)+punch*.52*Math.exp(-age*29);
      const crack=grit*3.9*Math.exp(-age*65)+spark*.42*Math.exp(-age*145);
      const pressure=lo*1.8*Math.exp(-age*30);
      sound+=(core+crack+pressure)*onset*(.85+shot.round*.05);
      // A separate short flight and contact, rather than one repeated UI-like note.
      const travel=age-.008;
      if(travel>0&&travel<.045)sound+=spark*.38*Math.sin(Math.PI*travel/.045)*(1-travel/.045);
      const contact=age-RABBIT_FLIGHT.shot*scale;
      if(contact>0){
        const env=(1-Math.exp(-contact*850))*Math.exp(-contact*36);
        const thud=Math.sin(2*Math.PI*132*contact)+.48*Math.sin(2*Math.PI*264*contact)+.18*Math.sin(2*Math.PI*528*contact);
        sound+=(grit*3.4+lo*1.3+thud*.6)*env;
        const slap=contact-.018;
        if(slap>0)sound+=grit*.65*(1-Math.exp(-slap*700))*Math.exp(-slap*48);
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
