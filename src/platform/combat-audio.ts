import type { SkillTemplate } from '../domain/types';
import type { SoundCue } from './sound-cues';
import { isUltimateSound } from './ultimate-audio';

export const combatFamilies = ['attack','area','pierce','shatter','drain','dawn','heal','guard','barrier'] as const;
export type CombatFamily = typeof combatFamilies[number];
const families: Partial<Record<SkillTemplate, CombatFamily>> = {
  attack:'attack',area:'area',pierce:'pierce',shatter:'shatter',drain:'drain',dawn:'dawn',
  guard:'guard',barrier:'barrier',
};
export function combatFamily(kind: SoundCue, skill?: SkillTemplate): CombatFamily | undefined {
  return isUltimateSound(kind) ? undefined : families[(skill ?? kind) as SkillTemplate];
}

type Material = 'cut'|'hammer'|'crunch'|'lance'|'spark'|'iron'|'stone'|'glass'|'blast'|'roll'|'swell'|'suction'|'pulse'|'grain'|'bell'|'air'|'wood'|'soft';
interface Take { name: string; material: Material; duration: number; tone: number; weight: number }
/** Different sound events and materials; no micro-pitch substitutes for variation. */
export const combatTakes: Record<CombatFamily, readonly [Take,Take,Take]> = {
  attack:[
    {name:'一閃',material:'cut',duration:.64,tone:240,weight:.65},
    {name:'重打',material:'hammer',duration:.78,tone:145,weight:1},
    {name:'破裂',material:'crunch',duration:.72,tone:330,weight:.8},
  ],
  pierce:[
    {name:'鋼の刺突',material:'lance',duration:.52,tone:430,weight:.7},
    {name:'放電する貫通',material:'spark',duration:.68,tone:690,weight:.65},
    {name:'装甲への刺突',material:'iron',duration:.62,tone:290,weight:.9},
  ],
  shatter:[
    {name:'砕裂',material:'crunch',duration:.72,tone:280,weight:1},
    {name:'岩砕き',material:'stone',duration:.84,tone:165,weight:1.1},
    {name:'結晶破砕',material:'glass',duration:.8,tone:870,weight:.7},
  ],
  area:[
    {name:'爆発',material:'blast',duration:.82,tone:195,weight:1},
    {name:'重なる衝撃波',material:'roll',duration:.88,tone:260,weight:.9},
    {name:'奔流',material:'swell',duration:.86,tone:390,weight:.85},
  ],
  drain:[
    {name:'吸引',material:'suction',duration:.72,tone:420,weight:.65},
    {name:'脈動',material:'pulse',duration:.78,tone:225,weight:.85},
    {name:'侵食',material:'grain',duration:.8,tone:510,weight:.7},
  ],
  dawn:[
    {name:'光の炸裂',material:'blast',duration:.8,tone:510,weight:.85},
    {name:'光線',material:'lance',duration:.7,tone:840,weight:.75},
    {name:'陽光の波',material:'swell',duration:.88,tone:620,weight:.8},
  ],
  heal:[
    {name:'鐘の癒し',material:'bell',duration:.78,tone:523,weight:.15},
    {name:'癒しの風',material:'air',duration:.84,tone:660,weight:.1},
    {name:'清水',material:'soft',duration:.82,tone:785,weight:.12},
  ],
  guard:[
    {name:'鉄盾',material:'iron',duration:.62,tone:265,weight:.8},
    {name:'木盾',material:'wood',duration:.56,tone:390,weight:.75},
    {name:'石壁',material:'stone',duration:.76,tone:180,weight:1},
  ],
  barrier:[
    {name:'結晶の壁',material:'glass',duration:.8,tone:740,weight:.25},
    {name:'柔らかな結界',material:'soft',duration:.84,tone:440,weight:.2},
    {name:'脈動する結界',material:'pulse',duration:.8,tone:350,weight:.25},
  ],
};
export const combatTake = (family: CombatFamily, variant: number) => combatTakes[family][((variant%3)+3)%3];

/** Weight comes from a sustained low-mid collision and harmonics, not sub-bass alone. */
export function renderCombatSound(family: CombatFamily, sampleRate: number, variant = 0): Float32Array {
  const take=combatTake(family,variant),{duration,tone,weight,material}=take;
  const pcm=new Float32Array(Math.ceil(duration*sampleRate));
  const pole=(hz:number)=>1-Math.exp(-2*Math.PI*hz/sampleRate);
  const lowA=pole(140),bodyA=pole(1100),edgeA=pole(4200),airA=pole(7200),floorA=pole(620);
  let seed=0x76b93+combatFamilies.indexOf(family)*7919+((variant%3)+3)%3*1103,low=0,body=0,edge=0,air=0,floor=0,phase=0;
  const gentle=family==='heal'||family==='barrier';
  for(let i=0;i<pcm.length;i++){
    const t=i/sampleRate;
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const noise=(seed>>>0)/0x80000000-1;
    low+=lowA*(noise-low);body+=bodyA*(noise-body);edge+=edgeA*(noise-edge);air+=airA*(noise-air);floor+=floorA*(noise-floor);
    const grit=body-low,crack=edge-floor,hiss=air-edge,rise=Math.min(1,t*1400);
    const pitch=(frequency:number,age=t)=>Math.sin(2*Math.PI*frequency*age);
    const env=(age:number,rate:number)=>age<0?0:Math.min(1,age*1800)*Math.exp(-age*rate);
    // The common collision has audible 200–1,000 Hz harmonics; fragments are quieter
    // aftermaths of the same hit, not extra damage events.
    const bodyEnv=rise*Math.exp(-t*(gentle?12:7.5));
    let value=(grit*1.5+.22*pitch(205)+.12*pitch(410)+.08*pitch(675))*bodyEnv*weight;
    if(material==='cut'){
      phase+=2*Math.PI*(1350+1800*Math.exp(-t*17))/sampleRate;
      value+=crack*1.3*env(t,25)+.16*Math.sin(phase+1.1*Math.sin(phase*1.57))*env(t,16)+hiss*.4*env(t,18);
    }else if(material==='hammer'){
      const p=2*Math.PI*(tone*t+2.8*(1-Math.exp(-t*24)));
      value+=rise*(.48*Math.tanh(1.5*Math.sin(p))+.18*pitch(tone*3))*Math.exp(-t*7.5)+crack*.8*env(t,55);
      value+=grit*.9*env(t-.028,15);
    }else if(material==='crunch'||material==='stone'){
      const fragments=material==='stone'?[[0,1],[.045,.52],[.12,.26],[.21,.1]]:[[0,1],[.025,.6],[.083,.34],[.145,.16]];
      for(const [delay,strength] of fragments){const age=t-delay;value+=(grit*2+crack*(material==='stone' ? .45 : .95))*env(age,material==='stone'?17:28)*strength;}
      value+=.27*pitch(tone)*env(t,9)+.11*pitch(tone*2.37)*env(t,16);
    }else if(material==='lance'){
      phase+=2*Math.PI*(tone+1600*Math.exp(-t*14))/sampleRate;
      value+=.26*Math.sin(phase+2.2*Math.exp(-t*11)*Math.sin(phase*1.43))*env(t,12)+crack*.9*env(t,35);
    }else if(material==='spark'){
      for(const [delay,strength] of [[0,1],[.041,.5],[.107,.28]]){
        const age=t-delay;if(age<0)continue;const p=2*Math.PI*(tone*age+18*(1-Math.exp(-age*18)));
        value+=(.23*Math.sin(p+5*Math.exp(-age*22)*Math.sin(p*1.413))+crack*1.3)*env(age,32)*strength;
      }
    }else if(material==='iron'||material==='wood'||material==='glass'||material==='bell'){
      const glass=material==='glass'||material==='bell',wood=material==='wood';
      const ratios=wood?[1,1.51,2.12]:glass?[1,2.76,4.07]:[1,1.93,3.17];
      const fall=wood?22:glass?5.5:10;
      for(let partial=0;partial<3;partial++)value+=.23/(1+partial*.8)*pitch(tone*ratios[partial])*env(t,fall+partial*3);
      value+=(wood?grit*1.9:crack*.9)*env(t,wood?32:45)*(material==='bell' ? .08 : 1);
    }else if(material==='blast'||material==='roll'){
      const delays=material==='roll'?[0,.075,.17]:[0];
      for(let b=0;b<delays.length;b++){const age=t-delays[b];value+=(grit*2+crack*.7+.22*pitch(tone,age))*env(age,material==='roll'?11:7)/(1+b*.7);}
    }else if(material==='swell'||material==='air'){
      const attack=material==='air'?32:100,level=(1-Math.exp(-t*attack))*Math.exp(-t*(material==='air'?5:7));
      value+=(crack*(material==='air' ? .7 : 1.5)+hiss*.35+.15*pitch(tone)+.06*pitch(tone*2))*level;
    }else if(material==='suction'||material==='grain'){
      phase+=2*Math.PI*(110+tone*Math.exp(-t*5))/sampleRate;
      const gate=material==='grain' ? .55+.45*Math.sin(2*Math.PI*37*t)**2:1;
      value+=(.27*Math.sin(phase+2*Math.sin(phase*1.71))+grit*1.3+crack*.4)*env(t,6)*gate;
    }else if(material==='pulse'){
      const level=(.55+.45*Math.cos(2*Math.PI*9*t)**2)*env(t,6);
      value+=(.27*pitch(tone)+.12*pitch(tone*2)+grit*.9)*level;
    }else{
      const level=(1-Math.exp(-t*38))*Math.exp(-t*5.5);
      value+=(.25*pitch(tone)+.14*pitch(tone*1.5)+.06*pitch(tone*3)+crack*.15)*level;
    }
    // Parallel saturation thickens the body without flattening the bright attack.
    pcm[i]=Math.tanh(value*1.35);
  }
  const dry=pcm.slice(),offset=Math.round((material==='hammer' ? .061 : .043)*sampleRate),wet=gentle ? .16 : material==='stone' ? .13 : .08;
  for(let i=offset;i<pcm.length;i++)pcm[i]+=dry[i-offset]*wet;
  let peak=0;for(const value of pcm)peak=Math.max(peak,Math.abs(value));
  const target=family==='heal' ? .48 : family==='barrier' ? .54 : family==='shatter'||family==='area' ? .74 : .7;
  for(let i=0;i<pcm.length;i++)pcm[i]*=target/Math.max(peak,.001)*Math.min(1,i/(sampleRate*.0008),(pcm.length-1-i)/(sampleRate*.045));
  return pcm;
}
