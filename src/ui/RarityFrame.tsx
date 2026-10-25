import type { CharacterDef } from '../domain/types';
import './rarity-frame.css';

/** Decoration sits above the artwork without resizing or intercepting it. */
export function RarityFrame({ rarity }: { rarity: CharacterDef['rarity'] }) {
  return <span className={`rarity-frame rarity-frame--${rarity}`} aria-hidden="true">
    {['tl', 'tr', 'br', 'bl'].map(corner => <svg key={corner} className={`rarity-frame__corner rarity-frame__corner--${corner}`} viewBox="0 0 32 32" fill="none">
      <path d="M2 25V2H25" />
      {rarity !== 'R' && <><path d="M6 19V6H19M2 13Q13 13 13 2" /><path d="m9 5 4 4-4 4-4-4Z" className="rarity-frame__gem" /></>}
      {(rarity === 'SSR' || rarity === 'XR') && <path d="M3 24q6-2 5-7m16-14q-2 6-7 5M14 14l4-2 2 2-2 4Z" />}
    </svg>)}
    {(rarity === 'SSR' || rarity === 'XR') && <span className="rarity-frame__crown">◆</span>}
  </span>;
}
