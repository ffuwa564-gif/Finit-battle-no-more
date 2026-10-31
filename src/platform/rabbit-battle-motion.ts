import { rabbitTargetFrame } from './ultimate-choreography';

/** Presentation only: current recipients, no HP mutations and no queued hit timers. */
export function createRabbitBattleMotion(root: HTMLElement, targetIds: string[], position: () => number) {
  const originals=new Map<HTMLElement,{translate:string;scale:string;filter:string;origin:string;baseFilter:string}>();
  let frame=0;
  const restore=(element:HTMLElement)=>{
    const original=originals.get(element)!;
    for(const [property,value] of [['translate',original.translate],['scale',original.scale],['filter',original.filter],['transform-origin',original.origin]]){
      if(value)element.style.setProperty(property,value);else element.style.removeProperty(property);
    }
    delete element.dataset.rabbitShot;delete element.dataset.rabbitFinish;
  };
  const draw=()=>{
    const state=rabbitTargetFrame(position());
    for(const id of new Set(targetIds)){
      const page=root.querySelector<HTMLElement>(`[data-encounter-scene][data-unit="${CSS.escape(id)}"]`);
      const art=page?.querySelector<HTMLElement>(':scope > .enemy-page-art, :scope > .animated-illustration');
      if(!art)continue;
      if(!originals.has(art))originals.set(art,{translate:art.style.translate,scale:art.style.scale,filter:art.style.filter,origin:art.style.transformOrigin,baseFilter:getComputedStyle(art).filter});
      const original=originals.get(art)!;
      if(document.hidden){restore(art);continue;}
      art.style.translate=`${state.x.toFixed(3)}px ${state.y.toFixed(3)}px`;
      art.style.scale=state.zoom.toFixed(5);art.style.transformOrigin='50% 43%';
      art.style.filter=`${original.baseFilter==='none'?'':original.baseFilter} brightness(${1+state.flash})`;
      art.dataset.rabbitShot=String(state.shot);art.dataset.rabbitFinish=String(state.finish);
    }
    frame=requestAnimationFrame(draw);
  };
  const visibility=()=>{
    cancelAnimationFrame(frame);
    if(document.hidden){for(const element of originals.keys())restore(element);}
    else frame=requestAnimationFrame(draw);
  };
  document.addEventListener('visibilitychange',visibility);visibility();
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);for(const element of originals.keys())restore(element);};
}
