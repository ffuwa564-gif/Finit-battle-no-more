import type { BattleEvent, CharacterDef } from '../domain/types';
import type { UltimateTheme } from '../domain/ultimates';
import { ultimateFor } from '../domain/ultimates';
import { RABBIT_TIMING, RABBIT_SEQUENCE, ultimateTimingFor } from './ultimate-timing';

export type UltimateVisual = UltimateTheme | 'clockwork' | 'rabbit-bits';
export function ultimateVisualFor(character: CharacterDef, event?: BattleEvent): UltimateVisual {
  const theme = ultimateFor(character).theme;
  if (['lunette', 'lunette-awakened'].includes(character.id)) return 'rabbit-bits';
  if (event?.clockAction === 'finale' || ['nox','tikka'].includes(character.id)) return 'clockwork';
  // An enemy's offensive boss strike must not look or sound like a party heal.
  return event?.bossStrike && ['bloom', 'aegis', 'dawn'].includes(theme) ? 'eclipse' : theme;
}
/** Shared visual/audio deadlines, relative to the existing damage impact (seconds). */
export const RABBIT_VOLLEY = { rounds: 2, spacing: 1, stagger: .065, finale: (RABBIT_TIMING.damage-RABBIT_TIMING.impact)/1000, echoes: [.18, .36] } as const;
/** All durations are logical seconds, so speed changes retime the complete shot. */
export const RABBIT_FLIGHT = { shot: .075, finale: .18 } as const;
/** Clock faces are the emitters in this original artwork, rather than invented gun barrels. */
export const RABBIT_MUZZLES = [[.716,.62],[.28,.67],[.778,.61],[.475,.575]] as const;
export function rabbitMuzzle(index:number,x:number,y:number,width:number,aspect:number,rotation:number){
  const [u,v]=RABBIT_MUZZLES[index],lx=(u-.5)*width,ly=(v-.5)*width*aspect;
  return {x:x+lx*Math.cos(rotation)-ly*Math.sin(rotation),y:y+lx*Math.sin(rotation)+ly*Math.cos(rotation)};
}
export const rabbitShotTimes = (index: number) => Array.from({length:RABBIT_VOLLEY.rounds},(_,round)=>round*RABBIT_VOLLEY.spacing+index*RABBIT_VOLLEY.stagger);
/** The existing ブオーン and camera share each completed pass, not arbitrary accents. */
export const RABBIT_LOOP_SEMITONES = [0,7] as const;
export const rabbitLoopCues = () => RABBIT_LOOP_SEMITONES.map((semitones,round)=>{
  const ratio=2**(semitones/12);
  return {round,semitones,ratio,at:rabbitShotTimes(3)[round]+RABBIT_FLIGHT.shot+.015,
    duration:.68/ratio,zoom:[.07,.20][round],pan:[2,8][round]};
});
/** Accelerate into the charge peak, then release; later passes move further and faster. */
export function rabbitLoopCamera(elapsed:number){
  const relative=(elapsed-RABBIT_SEQUENCE.fire)/1000;
  const cue=rabbitLoopCues().find(cue=>relative>=cue.at&&relative<cue.at+cue.duration);
  if(!cue)return {zoom:0,x:0,y:0,round:-1,power:0};
  const u=(relative-cue.at)/cue.duration;
  const power=u<.55?(u/.55)**3:(1-(u-.55)/.45)**3;
  return {zoom:cue.zoom*power,x:(cue.round%2?1:-1)*cue.pan*power,y:-cue.pan*.35*power,round:cue.round,power};
}
/** Repeated crossfire, a short breath, then one combined finishing blast. */
export function rabbitBitFrame(index: number, elapsed: number) {
  const hit = (elapsed - RABBIT_TIMING.impact) / 1000;
  const finalLaunch=RABBIT_VOLLEY.finale-RABBIT_FLIGHT.finale;
  const times=[...rabbitShotTimes(index),finalLaunch];
  const fired=times.filter(time=>time<=hit+1e-7);
  const lastShot=fired.at(-1);
  const shotAge=lastShot===undefined?-1:Math.max(0,hit-lastShot);
  const final=lastShot===finalLaunch;
  const flightTime=final?RABBIT_FLIGHT.finale:RABBIT_FLIGHT.shot;
  const impactAge=shotAge<0?-1:Math.abs(shotAge-flightTime)<1e-7?0:shotAge-flightTime;
  const flight=shotAge>=0&&impactAge<0;
  const impact=impactAge>=0?Math.exp(-impactAge*(final?9:25)):0;
  return {
    summon: clamp01((elapsed - RABBIT_SEQUENCE.summon - index * RABBIT_SEQUENCE.summonStep) / RABBIT_SEQUENCE.summonDuration),
    alpha: clamp01((RABBIT_SEQUENCE.tail - elapsed) / 550),
    aim: clamp01((elapsed-RABBIT_SEQUENCE.aim)/650),
    gate: Math.sin(Math.PI*clamp01((elapsed-RABBIT_SEQUENCE.summon-index*RABBIT_SEQUENCE.summonStep)/850)),
    beam: flight?1:impact,
    muzzle:shotAge>=0&&shotAge<.055?Math.exp(-shotAge*40):0,
    flight,travel:shotAge<0?0:clamp01(shotAge/flightTime),impact,impactAge,
    recoil: shotAge<0||shotAge>.09?0:Math.sin(shotAge/.09*Math.PI),
    shotAge, final, round: Math.max(0,fired.length-1),
    finishCharge: elapsed>=RABBIT_SEQUENCE.charge&&elapsed<RABBIT_SEQUENCE.finish-RABBIT_FLIGHT.finale*1000
      ? (elapsed-RABBIT_SEQUENCE.charge)/(RABBIT_SEQUENCE.finish-RABBIT_FLIGHT.finale*1000-RABBIT_SEQUENCE.charge):0,
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
  const deploy=clamp01((elapsed-RABBIT_SEQUENCE.summon-index*RABBIT_SEQUENCE.summonStep)/RABBIT_SEQUENCE.summonDuration);
  const turn=hit<0?0:Math.sin(Math.min(hit,1.05)*2.2+index)*.055;
  return {x:base[0]+(index%2?1:-1)*.24*(1-deploy)+turn,
    y:base[1]-.09*(1-deploy)+Math.sin(elapsed*.002+index)*.012,
    size:base[2],rotation:(index%2?1:-1)*(.08+.22*(1-deploy))};
}
/** Ease into framing, accelerate to fire, pull back to charge, then punch in and reveal. */
function rabbitBaseCameraZoom(elapsed: number): number {
  const easeIn=(v:number)=>clamp01(v)**3;
  const easeOut=(v:number)=>1-(1-clamp01(v))**3;
  if(elapsed<RABBIT_SEQUENCE.summon)return 1;
  if(elapsed<RABBIT_SEQUENCE.aim)return 1+.055*easeOut((elapsed-RABBIT_SEQUENCE.summon)/2000);
  if(elapsed<RABBIT_SEQUENCE.fire)return 1.055+.055*easeIn((elapsed-RABBIT_SEQUENCE.aim)/1000);
  if(elapsed<RABBIT_SEQUENCE.charge)return 1.11+.04*easeIn((elapsed-RABBIT_SEQUENCE.fire)/(RABBIT_SEQUENCE.charge-RABBIT_SEQUENCE.fire));
  if(elapsed<RABBIT_SEQUENCE.charge+240)return 1.15-.13*easeOut((elapsed-RABBIT_SEQUENCE.charge)/240);
  if(elapsed<RABBIT_SEQUENCE.finish)return 1.02+.17*easeIn((elapsed-RABBIT_SEQUENCE.charge-240)/560);
  if(elapsed<RABBIT_SEQUENCE.finish+80)return 1.19+.19*easeOut((elapsed-RABBIT_SEQUENCE.finish)/80);
  return 1.38-.38*easeOut((elapsed-RABBIT_SEQUENCE.finish-80)/900);
}
export function rabbitCameraZoom(elapsed:number):number {
  return rabbitBaseCameraZoom(elapsed)+rabbitLoopCamera(elapsed).zoom;
}
/** Bounded reactions at every shot, a quiet gap, then a held heavy recoil. */
export function rabbitTargetFrame(elapsed: number) {
  const hit=(elapsed-RABBIT_TIMING.impact)/1000;
  let x=0,y=0,flash=0,shot=-1;
  const times=[0,1,2,3].flatMap(bit=>rabbitShotTimes(bit).map((at,round)=>({at,bit,round}))).sort((a,b)=>a.at-b.at);
  times.forEach((entry,index)=>{
    const age=hit-entry.at-RABBIT_FLIGHT.shot;if(age<0)return;shot=index;
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
  const loop=rabbitLoopCamera(elapsed);x+=loop.x;y+=loop.y;
  const zoom=rabbitCameraZoom(elapsed);
  return {x:Math.max(-18,Math.min(18,x)),y:Math.max(-5,Math.min(5,y)),flash,zoom,shot,finish:finish>=0};
}
