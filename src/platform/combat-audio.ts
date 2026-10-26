import type { SkillTemplate } from '../domain/types';
import type { SoundCue } from './sound-cues';
import { isUltimateSound } from './ultimate-audio';

export const combatFamilies = ['attack','area','pierce','shatter','drain','dawn','heal','guard','barrier'] as const;
export type CombatFamily = typeof combatFamilies[number];
const families: Partial<Record<SkillTemplate, CombatFamily>> = {
  attack:'attack',area:'area',pierce:'pierce',shatter:'shatter',drain:'drain',dawn:'dawn',
  heal:'heal',regen:'heal',mend_pair:'heal',barrier_mend:'heal',cleanse:'heal',guard:'guard',barrier:'barrier',
};
export function combatFamily(kind: SoundCue, skill?: SkillTemplate): CombatFamily | undefined {
  return isUltimateSound(kind) ? undefined : families[(skill ?? kind) as SkillTemplate];
}

/** Short dry foreground sounds: smaller than ultimates, with a clear midrange core. */
export function renderCombatSound(family: CombatFamily, sampleRate: number, variant = 0): Float32Array {
  const duration = {attack:.38,area:.68,pierce:.34,shatter:.58,drain:.62,dawn:.72,heal:.68,guard:.43,barrier:.65}[family];
  const pcm=new Float32Array(Math.ceil(duration*sampleRate));
  const take=((variant%3)+3)%3, pitch=[1,.967,1.032][take];
  const pole=(hz:number)=>1-Math.exp(-2*Math.PI*hz/sampleRate);
  const bassA=pole(160),bodyA=pole(1200),edgeA=pole(4900),floorA=pole(650);
  let seed=0x76b93+combatFamilies.indexOf(family)*7919+take*1103,bass=0,body=0,edge=0,floor=0,phase=0;
  for(let i=0;i<pcm.length;i++){
    const t=i/sampleRate;
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const noise=(seed>>>0)/0x80000000-1;
    bass+=bassA*(noise-bass);body+=bodyA*(noise-body);edge+=edgeA*(noise-edge);floor+=floorA*(noise-floor);
    const crack=edge-floor,thump=body-bass,rise=Math.min(1,t*1600);
    const impact=Math.sin(2*Math.PI*pitch*(115*t+2.4*(1-Math.exp(-t*35))))*Math.exp(-t*24);
    let value=0;
    if(family==='attack'){
      const edgeEnv=Math.exp(-t*42),bodyEnv=Math.exp(-t*17);
      value=rise*(crack*1.6*edgeEnv+thump*1.6*bodyEnv+impact*.31+.08*Math.sin(2*Math.PI*1490*pitch*t)*Math.exp(-t*34));
    }else if(family==='pierce'){
      phase+=2*Math.PI*pitch*(2100-1500*Math.min(1,t/.13))/sampleRate;
      value=rise*(crack*1.5*Math.exp(-t*31)+Math.sin(phase+1.8*Math.sin(phase*1.47))*.17*Math.exp(-t*25)+impact*.13);
    }else if(family==='shatter'){
      for(const [offset,strength] of [[0,1],[.027,.5],[.073,.27]]){
        const age=t-offset;if(age<0)continue;
        value+=(crack*.9+thump*1.7)*strength*Math.min(1,age*2200)*Math.exp(-age*39);
      }
      value+=rise*(impact*.34+.12*Math.sin(2*Math.PI*733*pitch*t)*Math.exp(-t*19));
    }else if(family==='area'||family==='dawn'){
      const env=rise*Math.exp(-t*10);
      value=env*(thump*1.65+crack*.8+.22*Math.sin(2*Math.PI*310*pitch*t)*Math.exp(-t*5));
      if(family==='dawn')value+=.11*Math.sin(2*Math.PI*1240*pitch*t)*(1-Math.exp(-t*80))*Math.exp(-t*14);
    }else if(family==='drain'){
      phase+=2*Math.PI*pitch*(180+720*Math.exp(-t*12))/sampleRate;
      const env=rise*Math.exp(-t*11);
      value=(Math.sin(phase+1.5*Math.sin(phase*1.43))*.22+thump*1.5+crack*.28)*env;
    }else if(family==='heal'){
      const env=(1-Math.exp(-t*65))*Math.exp(-t*8.5);
      value=(.23*Math.sin(2*Math.PI*523*pitch*t)+.12*Math.sin(2*Math.PI*785*pitch*t)+.055*Math.sin(2*Math.PI*1569*pitch*t)+crack*.17)*env;
    }else if(family==='guard'){
      const env=rise;
      value=env*(.26*Math.sin(2*Math.PI*293*pitch*t)*Math.exp(-t*15)+.12*Math.sin(2*Math.PI*547*pitch*t)*Math.exp(-t*20)+.08*Math.sin(2*Math.PI*923*pitch*t)*Math.exp(-t*32)+thump*1.1*Math.exp(-t*30));
    }else{
      const env=(1-Math.exp(-t*130))*Math.exp(-t*9);
      value=(.24*Math.sin(2*Math.PI*440*pitch*t)+.11*Math.sin(2*Math.PI*882*pitch*t)+.06*Math.sin(2*Math.PI*1326*pitch*t)+crack*.2)*env;
    }
    pcm[i]=Math.tanh(value*.9);
  }
  // One quiet reflection keeps a little space without accumulating a long wash.
  const dry=pcm.slice(),offset=Math.round(.047*sampleRate),wet=family==='guard' ? .055 : family==='heal'||family==='barrier' ? .12 : .075;
  for(let i=offset;i<pcm.length;i++)pcm[i]+=dry[i-offset]*wet;
  let peak=0;for(const value of pcm)peak=Math.max(peak,Math.abs(value));
  const target=family==='heal' ? .36 : family==='barrier' ? .42 : family==='dawn'||family==='shatter' ? .6 : .53;
  for(let i=0;i<pcm.length;i++)pcm[i]*=target/Math.max(peak,.001)*Math.min(1,i/(sampleRate*.0008),(pcm.length-1-i)/(sampleRate*.04));
  return pcm;
}
