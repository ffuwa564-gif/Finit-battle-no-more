import { createContext, type ReactNode } from 'react';
import { assetPath } from '../content';
import spriteCatalog from '../content/inventory-sprites.json';
import { GameImage } from './GameMedia';
import './inventory-children.css';
import './inventory-controls.css';

export const InventoryThemeContext = createContext(false);
export function InventoryTheme({children,className='',controls='illustrated'}:{children:ReactNode;className?:string;controls?:'illustrated'|'plain'}) {return <InventoryThemeContext.Provider value={controls==='illustrated'}><div className={`inventory-theme inventory-theme--${controls} ${className}`}>{children}</div></InventoryThemeContext.Provider>;}

export const inventoryPanels = ['open-folio','parchment-list','material-drawers','inspection-tray','comparison-folio','polishing-mat','refinement-table','craft-blueprint','confirmation-frame','machine-panel','power-panel','portrait-frame'] as const;
export type InventoryPanelKind = typeof inventoryPanels[number];
export type InventorySpriteId = keyof typeof spriteCatalog;
export function InventoryIllustration({kind,className=''}: {kind:InventoryPanelKind;className?:string}) {
  return <GameImage className={`inventory-illustration ${className}`} src={assetPath(`inventory-${kind}`)} alt="" draggable={false} loading="lazy"/>;
}
/** A shared nine-slice frame keeps the ornament intact on long, scrolling pages. */
export function InventoryFrame({kind='parchment-list'}: {kind?:InventoryPanelKind}) {
  const x=[0,.12,.88,1],y=kind==='confirmation-frame'?[0,.28,.91,1]:[0,.18,.91,1];
  return <div className="inventory-frame" data-frame-kind={kind} aria-hidden="true">{Array.from({length:9},(_,index)=>{
    const col=index%3,row=Math.floor(index/3),w=x[col+1]-x[col],h=y[row+1]-y[row];
    return <span key={index}><GameImage src={assetPath(`inventory-${kind}`)} alt="" draggable={false} style={{width:`${100/w}%`,height:`${100/h}%`,left:`${-x[col]/w*100}%`,top:`${-y[row]/h*100}%`}} /></span>;
  })}</div>;
}
export function InventorySprite({id,className=''}: {id:string;className?:string}) {
  const definition=spriteCatalog[id as InventorySpriteId];
  if(!definition)return null;
  const {columns,rows,index,atlas}=definition;
  return <span className={`inventory-sprite ${className}`} data-inventory-item={id} aria-hidden="true"><GameImage src={assetPath(`inventory-${atlas}`)} alt="" draggable={false} loading="lazy" style={{width:`${columns*100}%`,height:`${rows*100}%`,left:`${-(index%columns)*100}%`,top:`${-Math.floor(index/columns)*100}%`}} /></span>;
}
export function InventoryVignette({kind,children,className=''}: {kind:InventoryPanelKind;children?:ReactNode;className?:string}) {
  return <div className={`inventory-vignette inventory-vignette--${kind} ${className}`}><InventoryIllustration kind={kind}/>{children&&<div className="inventory-vignette__content">{children}</div>}</div>;
}
export function InventoryPaper({children,className=''}:{children:ReactNode;className?:string}) {
  return <div className={`inventory-paper ${className}`}>{children}</div>;
}

export function InventoryButtonArt({id}:{id:InventorySpriteId}) {
  const r=spriteCatalog[id];
  return <span className="inventory-button-art" aria-hidden="true"><GameImage src={assetPath(`inventory-${r.atlas}`)} alt="" draggable={false} style={{width:`${r.atlasWidth/r.width*100}%`,height:`${r.atlasHeight/r.height*100}%`,left:`${-r.x/r.width*100}%`,top:`${-r.y/r.height*100}%`}}/></span>;
}
