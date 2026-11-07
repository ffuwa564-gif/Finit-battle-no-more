import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BattleEvent } from '../domain/types';
import { MaterialIcon } from './index';

/** Flights outlive their replay event: an area kill must not wait for four bag animations. */
export function HuntMaterialFlights({event,reducedMotion=false}:{event?:BattleEvent;reducedMotion?:boolean}) {
  const [flights,setFlights]=useState<BattleEvent[]>([]),last=useRef<string|undefined>(undefined);
  useEffect(()=>{
    if(!event?.huntKill||last.current===event.id)return;last.current=event.id;
    setFlights(xs=>[...xs,event].slice(-8));
  },[event]);
  return <>{flights.map(e=><HuntFlight key={e.id} event={e} reduced={reducedMotion} onDone={()=>setFlights(xs=>xs.filter(x=>x.id!==e.id))}/>)}</>;
}
function HuntFlight({event,reduced,onDone}:{event:BattleEvent;reduced:boolean;onDone:()=>void}){
  const node=useRef<HTMLDivElement>(null),done=useRef(onDone);done.current=onDone;
  useLayoutEffect(()=>{
    const el=node.current!,a=el.getBoundingClientRect(),bag=document.querySelector('[data-bag]')?.getBoundingClientRect();
    const actor=document.querySelector(`[data-unit="${event.actorId}"]`)?.getBoundingClientRect();
    const x=actor?actor.left+actor.width/2-a.left:0,y=actor?actor.top+actor.height*.65-a.top:0;
    const duration=980;
    const animation=el.animate(reduced?[{opacity:1},{opacity:0}]:[
      {transform:`translate(${x}px,${y-32}px) scale(.35)`,opacity:0,offset:0},
      {transform:`translate(${x}px,${y}px) scale(${event.rarity==='common'?1:1.4})`,opacity:1,offset:.28},
      {transform:`translate(${x}px,${y}px) scale(1)`,opacity:1,offset:.52},
      {transform:`translate(${bag?bag.left-a.left+10:0}px,${bag?bag.top-a.top:0}px) scale(.2)`,opacity:0,offset:1},
    ],{duration,easing:'ease-in',fill:'forwards'});
    const timer=setTimeout(()=>done.current(),duration+20);return()=>{clearTimeout(timer);animation.cancel();};
  },[event,reduced]);
  return <div ref={node} aria-hidden="true" data-hunt-flight className={`material-flight rarity-${event.rarity}`}><MaterialIcon rarity={event.rarity??'common'}/></div>;
}
