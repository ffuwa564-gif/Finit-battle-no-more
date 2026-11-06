import { useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { assetPath } from '../content';
import { tr } from '../locales/i18n';
import { Button, GameImage } from './index';
import './inventory-scene.css';

export function InventoryScene({kind,title,onBack,children}: {kind:'travel-bag'|'craft-desk'|'memory-cabinet';title:string;onBack:()=>void;children:ReactNode}) {
  const [ready,setReady]=useState(false);
  return <section data-art-ready={ready} className={`inventory-scene inventory-scene--${kind}`} aria-label={tr(title)}>
    <GameImage className="inventory-scene__art" src={assetPath(kind)} alt="" draggable={false} fetchPriority="high" onLoad={()=>setReady(true)} onError={()=>setReady(false)} />
    <header className="inventory-scene__heading"><Button variant="icon" aria-label={tr(kind==='travel-bag'?'ホームに戻る':'カバンに戻る')} onClick={onBack}><ArrowLeft size={22}/></Button><h1>{tr(title)}</h1></header>
    {children}
  </section>;
}
export function InventoryHotspot({place,label,count,onClick}: {place:string;label:string;count?:number;onClick:()=>void}) {
  return <Button variant="secondary" className={`inventory-hotspot inventory-hotspot--${place}`} aria-label={tr(label)} onClick={onClick}><span className="inventory-hotspot__label">{tr(label)}{count!==undefined&&<small>{count}</small>}</span></Button>;
}
/** Stable item identity chooses a painted crystal; tier/ownership remain live UI. */
export function CollectedGemArt({id}: {id:string}) {
  const sprites: Record<string,number> = {'shield-break':10,'echo-shard':5,'rewind-thread':6,'clear-tear':0,'pale-ward':4,'hollow-lantern':7,'dream-lace':1,'night-dew':2,'dawn-crown':3,'star-furnace':11,'twin-tide':8,'wick-stone':9,'white-flower-seed':6};
  const index=sprites[id]??0;
  return <span className={`collected-gem-art collected-gem-art--${index}`} aria-hidden="true"><GameImage src={assetPath('memory-gem-atlas')} alt="" draggable={false}/></span>;
}
