import { useId } from 'react';
import type { HarvestUpgrade } from '../domain/battle-harvest';
const colors = {
  touch: ['#e5f8ff','#80cae6','#24618f','#102d54'],
  linger: ['#f2e8ff','#c4a3eb','#6b54a7','#32214f'],
  abundance: ['#fff4c7','#e9ca73','#b48233','#62471f'],
  mercy: ['#e7fff1','#9bdcb8','#3f8c72','#183f3d'],
  focus: ['#ffe9e4','#e7a2ab','#a75a7c','#502843'],
} as const;
/** Small vector facets stay crisp in a card, socket and flight without a bitmap frame. */
export function HarvestGem({kind,className=''}:{kind:HarvestUpgrade;className?:string}) {
 const id=useId().replaceAll(':',''),[light,mid,dark,deep]=colors[kind];
 return <svg className={`harvest-gem ${className}`} viewBox="0 0 96 120" aria-hidden="true" focusable="false">
  <defs><linearGradient id={`${id}body`} x1=".1" y1="0" x2=".9" y2="1"><stop stopColor={light}/><stop offset=".4" stopColor={mid}/><stop offset="1" stopColor={deep}/></linearGradient><linearGradient id={`${id}edge`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={light}/><stop offset="1" stopColor={dark}/></linearGradient></defs>
  <path d="M48 5 80 29 74 84 48 114 22 84 16 29Z" fill={`url(#${id}body)`} stroke={light} strokeWidth="1.2"/>
  <path d="M48 5 31 35 16 29Z" fill={light} opacity=".9"/><path d="m48 5 17 30 15-6Z" fill={mid}/>
  <path d="m16 29 15 6 17 31-26 18Z" fill={dark}/><path d="m80 29-15 6-17 31 26 18Z" fill={mid}/>
  <path d="m31 35 17-30 17 30-17 31Z" fill={`url(#${id}edge)`}/><path d="m22 84 26-18 26 18-26 30Z" fill={deep}/>
  <path d="m48 66 10 22-10 26-10-26Z" fill={mid}/><path d="m22 84 16 4 10 26Z" fill={dark}/><path d="m74 84-16 4-10 26Z" fill={light} opacity=".4"/>
  <path d="m16 29 32 37 32-37M22 84l26-18 26 18M31 35h34" fill="none" stroke={light} strokeWidth=".65" opacity=".6"/>
  <path d="m49 12 9 21-10 19-7-20Z" fill="#fff" opacity=".36"/><path d="M66 21v16m-7-8h14" stroke="#fff9e7" strokeWidth="1.3"/>
 </svg>;
}
