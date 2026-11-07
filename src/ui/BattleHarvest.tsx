import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronDown, ChevronUp, Hand, Hourglass, Leaf, HeartPulse, Sun } from 'lucide-react';
import type { Battle, GameCommand } from '../domain/types';
import { harvestUpgradeText, harvestSockets, nextHarvestAid, type HarvestUpgrade } from '../domain/battle-harvest';
import { industryItem } from '../domain/industry';
import { ROUGH_NAMES } from '../domain/gem-polishing';
import { tr, useLanguage } from '../locales/i18n';
import { Button, InventorySprite } from './index';
import { createGamePortal } from './GamePortal';
import { HarvestGem } from './HarvestGem';
import './battle-harvest.css';
const icons = { touch: Hand, linger: Hourglass, abundance: Leaf, mercy: HeartPulse, focus: Sun };
const cardEffects: Record<HarvestUpgrade,string> = { touch:'回収の進み +1', linger:'回収物が長く残る', abundance:'素材の獲得数 +1', mercy:'回復の回収で連鎖', focus:'回復・援護を強化' };
const positions = [[7,18],[93,18],[7,62],[93,62]];
type Flight = {kind:HarvestUpgrade;slot:number;x:number;y:number;dx:number;dy:number;pending:boolean};
export function BattleHarvest({ battle, command, reducedMotion=false }: { battle: Battle; command: (c: GameCommand) => Promise<boolean>; reducedMotion?:boolean }) {
  const lang = useLanguage(), s = battle.harvest;
  const queued = useRef(0), chain = useRef(Promise.resolve());
  const socketsRef = useRef<(HTMLSpanElement|null)[]>([]);
  const [flash,setFlash] = useState<string>(),[expanded,setExpanded] = useState(true),[choosing,setChoosing]=useState(false);
  const [candidate,setCandidate]=useState<{id:string;upgrade:HarvestUpgrade;from:DOMRect}>();
  const [flight,setFlight]=useState<Flight>(),[landed,setLanded]=useState<number>();
  const [systemReduced,setSystemReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const reduced=reducedMotion||systemReduced;
  useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setSystemReduced(q.matches);q.addEventListener('change',update);return()=>q.removeEventListener('change',update);},[]);
  useEffect(()=>{setExpanded(true);setCandidate(undefined);},[s?.choice?.id]);
  useEffect(()=>{if(!flash)return;const t=setTimeout(()=>setFlash(undefined),160);return()=>clearTimeout(t);},[flash]);
  useEffect(()=>{
    if(!flight||flight.pending)return;
    if(reduced){setFlight(undefined);return;}
    const finish=()=>{setLanded(flight.slot);setFlight(undefined);};
    const timer=setTimeout(finish,680);
    window.addEventListener('resize',finish);window.addEventListener('scroll',finish,true);
    return()=>{clearTimeout(timer);window.removeEventListener('resize',finish);window.removeEventListener('scroll',finish,true);};
  },[flight,reduced]);
  useEffect(()=>{if(landed===undefined)return;const t=setTimeout(()=>setLanded(undefined),650);return()=>clearTimeout(t);},[landed]);
  if(!s)return null;
  const sockets=harvestSockets(s);
  const send=(c:GameCommand)=>{
    if(queued.current>=4)return;queued.current++;
    chain.current=chain.current.catch(()=>{}).then(async()=>{try{await command(c);}finally{queued.current--;}});
  };
  const commit=async(id:string,upgrade:HarvestUpgrade,slot:number,from:DOMRect)=>{
    if(choosing)return;
    const to=socketsRef.current[slot]?.getBoundingClientRect();if(!to)return;
    from=document.querySelector(`[data-harvest-upgrade="${upgrade}"] .harvest-card__art`)?.getBoundingClientRect()??from;
    const motion:Flight={kind:upgrade,slot,x:from.x+from.width/2,y:from.y+from.height/2,dx:to.x+to.width/2-from.x-from.width/2,dy:to.y+to.height/2-from.y-from.height/2,pending:true};
    setChoosing(true);if(!reduced)setFlight(motion);
    try{
      if(await command({type:'harvestChoose',battleId:battle.id,choiceId:id,upgrade,slot})){
        setCandidate(undefined);setExpanded(false);
        if(reduced)setLanded(slot);else setFlight({...motion,pending:false});
      }else setFlight(undefined);
    }finally{setChoosing(false);}
  };
  const pick=(upgrade:HarvestUpgrade,button:HTMLButtonElement)=>{
    if(!s.choice)return;
    const from=(button.querySelector('.harvest-card__art')??button).getBoundingClientRect();
    if(sockets.length<3)void commit(s.choice.id,upgrade,sockets.length,from);
    else setCandidate({id:s.choice.id,upgrade,from});
  };
  return <div className="battle-harvest" data-guide="battle-harvest" data-reduced={reduced} aria-label={tr('戦場の回収')}>
    {s.offers.map(o=>{
      const name=o.kind==='gem'?tr(ROUGH_NAMES[o.gem!.promise]):o.kind==='material'?industryItem(o.itemId!)!.name[lang]:tr(o.kind==='heal'?'癒しの雫':'援護の結晶');
      const sprite=o.kind==='gem'?`rough-${o.gem!.promise}`:o.kind==='material'?o.itemId!:'healing-potion';
      const remaining=Math.ceil((o.required-o.hits)/(1+s.upgrades.touch));
      return <Button key={o.id} variant="secondary" className={`harvest-drop harvest-drop--${o.kind}${flash===o.id?' is-tapped':''}`} data-harvest-id={o.id} data-slot={o.slot}
        style={{left:`${positions[o.slot][0]}%`,top:`${positions[o.slot][1]}%`,'--drift-delay':`${-o.slot*.8}s`} as CSSProperties}
        aria-label={tr('{0}：あと{1}回で回収').replace('{0}',name).replace('{1}',String(remaining))}
        title={['heal','strike'].includes(o.kind)&&s.aids.length>=3?tr('援護の待機枠がいっぱいです'):name}
        disabled={['heal','strike'].includes(o.kind)&&s.aids.length>=3}
        onClick={()=>{setFlash(o.id);send({type:'harvestTap',battleId:battle.id,offerId:o.id});}}>
        <span className="harvest-drop__art">{o.kind==='strike'?<HarvestGem kind="touch"/>:<InventorySprite id={sprite}/>}</span>
        <span className="harvest-drop__hits">{remaining}</span>
        <span className="harvest-drop__life" style={{width:`${Math.min(100,(o.expires-s.beat)/(o.kind==='gem'?18:10)*100)}%`}}/>
        {o.kind==='material'&&<small>×{o.amount}</small>}
      </Button>;
    })}
    {s.choice&&expanded&&<section className="harvest-card-panel" data-replacing={!!candidate} aria-label={tr('この探索の三択強化')}>
      <header><span><small>EXPEDITION</small><strong>{tr('探索の強化')}</strong></span><Button variant="icon" aria-label={tr('カードをたたむ')} onClick={()=>{setExpanded(false);setCandidate(undefined);}}><ChevronDown/></Button></header>
      <div className="harvest-cards">
        {s.choice.options.map((upgrade,index)=>{const Icon=icons[upgrade],selected=candidate?.upgrade===upgrade;return <Button key={s.choice!.id+upgrade} variant="secondary" selected={selected} disabled={choosing}
          className={`harvest-choice harvest-card harvest-card--${upgrade}`} data-harvest-upgrade={upgrade}
          aria-label={`${tr(harvestUpgradeText[upgrade].name)}：${tr(harvestUpgradeText[upgrade].description)}`} title={tr(harvestUpgradeText[upgrade].description)}
          onClick={event=>pick(upgrade,event.currentTarget)}>
          <span className="harvest-card__index">0{index+1}</span><span className="harvest-card__art"><HarvestGem kind={upgrade}/></span>
          <strong>{tr(harvestUpgradeText[upgrade].name)}</strong><span className="harvest-card__effect"><Icon aria-hidden="true"/>{tr(cardEffects[upgrade])}</span>
          <span className="harvest-card__select">{tr(selected?'選択中':'選ぶ')} <ChevronUp aria-hidden="true"/></span>
        </Button>;})}
      </div>
      <footer>{tr(candidate?'入れ替える枠を選んでください':'この探索だけ有効')}</footer>
    </section>}
    <div className="harvest-choices harvest-sockets" role="group" aria-label={tr('探索の宝石スロット')} data-awaiting={!!candidate} data-offer={!!s.choice}>
      {[0,1,2].map(i=>{const gem=sockets[i],pending=flight?.slot===i&&!reduced;return <span key={i} className="harvest-socket-anchor" ref={el=>{socketsRef.current[i]=el;}}><Button variant="secondary" disabled={choosing||!candidate&&!s.choice}
        className={`harvest-socket${gem?' is-filled':''}${landed===i?' is-landed':''}`} data-harvest-socket={i} data-upgrade={gem??'empty'}
        aria-label={candidate?tr('第{0}枠にセット').replace('{0}',String(i+1)):gem?`${i+1}：${tr(harvestUpgradeText[gem].name)}`:tr('空き枠 {0}').replace('{0}',String(i+1))}
        title={gem?tr(harvestUpgradeText[gem].description):tr('空き枠')}
        onClick={event=>{
          // Painted sockets are close together. Route touch edges to the nearest
          // visual center, even where their generous 44px hit areas overlap.
          const target=event.detail===0?i:socketsRef.current.reduce((best,el,index)=>{
            const r=el?.getBoundingClientRect(),b=socketsRef.current[best]?.getBoundingClientRect();
            return r&&(!b||Math.abs(event.clientX-r.x-r.width/2)<Math.abs(event.clientX-b.x-b.width/2))?index:best;
          },i);
          if(candidate)void commit(candidate.id,candidate.upgrade,target,candidate.from);else setExpanded(true);
        }}>

        <span className="harvest-socket__number">{['Ⅰ','Ⅱ','Ⅲ'][i]}</span><span className={`harvest-socket__gem${pending?' is-in-flight':''}`}>{gem&&<HarvestGem kind={gem}/>}</span>
      </Button></span>;})}
      {s.choice&&<progress className="harvest-choice-life" aria-label={tr('三択の残り時間')} max={18} value={s.choice.expires-s.beat}/>}
    </div>
    {s.aids.length>0&&<span className="harvest-aids" role="status" title={tr('回収した援護は次の指示待ちで発動')}>✦ {s.aids.length}</span>}
    {flight&&!flight.pending&&!reduced&&createGamePortal(<div key={`${flight.kind}:${flight.slot}`} className="harvest-gem-flight" aria-hidden="true" style={{left:flight.x,top:flight.y,'--flight-x':`${flight.dx}px`,'--flight-y':`${flight.dy}px`} as CSSProperties}><HarvestGem kind={flight.kind}/></div>,document.body)}
  </div>;
}
export function HarvestSummary({ battle }: { battle: Battle }) {
  const lang = useLanguage(), s = battle.harvest;
  if (!s || battle.phase !== 'reward' || !s.gems.length && !Object.values(s.materials).some(n=>n>0)) return null;
  return <section className="harvest-summary" aria-label={tr('追加回収の報酬')}><h3>{tr('追加回収')}</h3>
    <div>{Object.entries(s.materials).filter(([,n]) => n>0).map(([id,n]) => <span key={id}><InventorySprite id={id}/>{industryItem(id)!.name[lang]} ×{n}</span>)}
      {s.gems.map(g => <span key={g.id}><InventorySprite id={`rough-${g.promise}`}/>{tr(ROUGH_NAMES[g.promise])}</span>)}</div>
    <small>{tr('獲得を確定するとカバンに入ります。')}</small>
  </section>;
}

/** Only the ready boundary advances automatically. Replay keeps its existing cadence.
 * No saved timer, background catch-up, repeated NEXT, or per-frame persistence. */
export function useBattleAuto(battle: Battle, busy: boolean, blocked: boolean, targetId: string | undefined, command: (c: GameCommand) => Promise<boolean>) {
  const [auto, setAuto] = useState(false), latest = useRef({battle,busy,blocked,targetId,command,auto});
  latest.current = {battle,busy,blocked,targetId,command,auto};
  useEffect(() => { setAuto(false); }, [battle.id]);
  useEffect(() => {
    let key = '', readyAt = 0, inFlight = false;
    const timer = setInterval(() => {
      const p = latest.current, b = p.battle;
      if (b.phase !== 'ready' || document.hidden || p.blocked || document.querySelector('[role="dialog"],.command-dial,.fairy-guide')) { key=''; return; }
      const checkpoint = `${b.id}:${b.wave}:${b.round}:${b.events.at(-1)?.id ?? ''}`;
      if (checkpoint !== key) { key = checkpoint; readyAt = performance.now(); }
      if (inFlight || p.busy) return;
      const pending = b.pendingPotionId ? {type:'potion' as const,unitId:b.pendingPotionId,battleId:b.id} : nextHarvestAid(b) >= 0 ? {type:'harvestAid' as const,battleId:b.id} : undefined;
      if (!pending && (!p.auto || performance.now()-readyAt<1200)) return;
      const action: GameCommand = pending ?? {type:'round',battleId:b.id,targetId:p.targetId};
      inFlight=true;
      void p.command(action).then(ok => { if (!ok) setAuto(false); }).finally(() => { inFlight=false; });
    },100);
    return () => clearInterval(timer);
  }, [battle.id]);
  return {auto,setAuto};
}
