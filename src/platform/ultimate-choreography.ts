import type { BattleEvent, CharacterDef } from '../domain/types';
import type { UltimateTheme } from '../domain/ultimates';
import { ultimateFor } from '../domain/ultimates';
import { RABBIT_TIMING, ultimateTimingFor } from './ultimate-timing';

export type UltimateVisual = UltimateTheme | 'clockwork' | 'rabbit-bits';
export function ultimateVisualFor(character: CharacterDef, event?: BattleEvent): UltimateVisual {
  const theme = ultimateFor(character).theme;
  if (['lunette', 'lunette-awakened'].includes(character.id)) return 'rabbit-bits';
  if (event?.clockAction === 'finale' || ['nox','tikka'].includes(character.id)) return 'clockwork';
  // An enemy's offensive boss strike must not look or sound like a party heal.
  return event?.bossStrike && ['bloom', 'aegis', 'dawn'].includes(theme) ? 'eclipse' : theme;
}
/** Shared visual/audio deadlines, relative to the existing damage impact (seconds). */
export const RABBIT_VOLLEY = { rounds: 4, spacing: .27, stagger: .042, finale: (RABBIT_TIMING.damage-RABBIT_TIMING.impact)/1000, echoes: [.18, .36] } as const;
export const rabbitShotTimes = (index: number) => Array.from({length:RABBIT_VOLLEY.rounds},(_,round)=>round*RABBIT_VOLLEY.spacing+index*RABBIT_VOLLEY.stagger);
/** Repeated crossfire, a short breath, then one combined finishing blast. */
export function rabbitBitFrame(index: number, elapsed: number) {
  const hit = (elapsed - RABBIT_TIMING.impact) / 1000;
  const times=[...rabbitShotTimes(index),RABBIT_VOLLEY.finale];
  const fired=times.filter(time=>time<=hit+1e-7);
  const lastShot=fired.at(-1);
  const shotAge=lastShot===undefined?-1:Math.max(0,hit-lastShot);
  const final=lastShot===RABBIT_VOLLEY.finale;
  return {
    summon: clamp01((elapsed - RABBIT_TIMING.effect - index * 65) / 350),
    alpha: clamp01((2.3 - hit) / .4),
    beam: shotAge<0?0:Math.exp(-shotAge*(final?10:33)),
    recoil: shotAge<0||shotAge>.09?0:Math.sin(shotAge/.09*Math.PI),
    shotAge, final, round: Math.max(0,fired.length-1),
    finishCharge: hit>1.08&&hit<RABBIT_VOLLEY.finale?(hit-1.08)/(RABBIT_VOLLEY.finale-1.08):0,
  };
}
export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
/** Presentation time only: hold the moving impact key for 60 ms, never the game state. */
export function ultimateFrame(visual: UltimateVisual, elapsed: number) {
  const timing=ultimateTimingFor(visual);
  const hit = (elapsed - timing.impact) / 1000;
  const hold = !['bloom','aegis','dawn'].includes(visual);
  const action = hold && hit >= 0 ? Math.max(0, hit - .06) : hit;
  return {
    hit, action,
    gather: clamp01((elapsed - timing.effect) / (timing.impact - timing.effect)),
    fade: clamp01((timing.end - elapsed) / (timing.end - timing.tail)),
    travel: clamp01((action + .095) / .095),
    visible: elapsed >= timing.effect && elapsed < timing.end,
  };
}

/** A single finishing whiteout: rise, hold, then reveal the battlefield again. */
export function rabbitWhiteout(elapsed: number): number {
  const age=(elapsed-RABBIT_TIMING.impact)/1000-RABBIT_VOLLEY.finale;
  if(age<.025||age>=.65)return 0;
  if(age<.1)return clamp01((age-.025)/.075);
  if(age<.23)return 1;
  const fade=clamp01((age-.23)/.42);
  return 1-fade*fade*(3-2*fade);
}

/** Depth and movement are authored per robot; never four identical fixed stickers. */
export function rabbitMount(index: number, elapsed: number) {
  const hit=(elapsed-RABBIT_TIMING.impact)/1000;
  const base=[[-.35,-.26,.23],[.33,-.32,.18],[-.32,.29,.26],[.37,.22,.21]][index];
  const deploy=clamp01((elapsed-RABBIT_TIMING.effect-index*65)/350);
  const turn=hit<0?0:Math.sin(Math.min(hit,1.05)*2.2+index)*.055;
  return {x:base[0]+(index%2?1:-1)*.24*(1-deploy)+turn,
    y:base[1]-.09*(1-deploy)+Math.sin(elapsed*.002+index)*.012,
    size:base[2],rotation:(index%2?1:-1)*(.08+.22*(1-deploy))};
}
/** Bounded reactions at every shot, a quiet gap, then a held heavy recoil. */
export function rabbitTargetFrame(elapsed: number) {
  const hit=(elapsed-RABBIT_TIMING.impact)/1000;
  let x=0,y=0,flash=0,shot=-1;
  const times=[0,1,2,3].flatMap(bit=>rabbitShotTimes(bit).map((at,round)=>({at,bit,round}))).sort((a,b)=>a.at-b.at);
  times.forEach((entry,index)=>{
    const age=hit-entry.at;if(age<0)return;shot=index;
    if(age>.11)return;
    const pulse=Math.exp(-age*35),direction=entry.bit%2?1:-1;
    x+=direction*(2.3+entry.round*.55)*pulse*Math.cos(age*45);
    y-=1.1*pulse;flash=Math.max(flash,pulse*.17);
  });
  const finish=hit-RABBIT_VOLLEY.finale;
  if(finish>=0){
    const held=Math.max(0,finish-.055);
    x+=10*Math.exp(-held*8)*Math.cos(held*31);
    y-=3.5*Math.exp(-held*8);flash=Math.max(flash,Math.exp(-held*14)*.6);
  }
  const reveal=clamp01((hit-RABBIT_VOLLEY.finale-.3)/.8);
  const zoom=elapsed<RABBIT_TIMING.effect?1:1+.09*clamp01((elapsed-RABBIT_TIMING.effect)/500)*(1-reveal);
  return {x:Math.max(-12,Math.min(12,x)),y:Math.max(-5,Math.min(5,y)),flash,zoom,shot,finish:finish>=0};
}
