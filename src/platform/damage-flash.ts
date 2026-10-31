import type { HpChange } from './combat-feedback';

/** A local translucent red tint; never covers unrelated cards, HUD or commands. */
export function flashDamage(root: HTMLElement, changes: HpChange[], reducedMotion: boolean): () => void {
  if(reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden)return ()=>{};
  const active: {node:HTMLElement;animation:Animation}[]=[];
  for(const change of changes){
    if(change.amount>=0)continue;
    const selector=change.side==='party'?'.party-unit': '[data-encounter-scene]';
    const panel=root.querySelector<HTMLElement>(`${selector}[data-unit="${CSS.escape(change.unitId)}"]`);
    if(!panel)continue;
    const node=document.createElement('span');node.className='damage-panel-flash';node.setAttribute('aria-hidden','true');panel.appendChild(node);
    const animation=node.animate([{opacity:0},{opacity:.55,offset:.12},{opacity:0}],{duration:180,easing:'ease-out'});
    animation.onfinish=()=>node.remove();active.push({node,animation});
  }
  return()=>{for(const {node,animation} of active){animation.cancel();node.remove();}};
}
