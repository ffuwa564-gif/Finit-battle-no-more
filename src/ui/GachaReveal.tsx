import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import type { CharacterDef } from '../domain/types';
import { roleName } from '../content';
import { Button, Modal, CharacterArtwork } from './index';
import './gacha-reveal.css';

export function GachaReveal({ character, reducedMotion, onClose, onReveal, duplicate, refund }: { character: CharacterDef; reducedMotion: boolean; onClose: () => void; onReveal: () => void; duplicate: boolean; refund: number }) {
  const [revealed, setRevealed] = useState(false);
  const announced = useRef(false);
  const announce = useRef(onReveal); announce.current = onReveal;
  const ssr = character.rarity === 'SSR';
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const timer = setTimeout(() => setRevealed(true), reducedMotion || media.matches ? 200 : ssr ? 2400 : 1000);
    return () => clearTimeout(timer);
  }, [reducedMotion, ssr]);
  useEffect(() => { if (revealed && !announced.current) { announced.current = true; announce.current(); } }, [revealed]);
  return <Modal title={revealed ? character.name : '祈願の顕現'} className={`summon-modal summon-modal--${character.rarity.toLowerCase()}`} onClose={onClose}>
    <div className={`gacha-reveal gacha-reveal--${character.rarity.toLowerCase()}${revealed ? ' is-revealed' : ''}${reducedMotion ? ' is-reduced' : ''}`} data-rarity={character.rarity}>
      <div className="gacha-reveal__rays" aria-hidden="true" />
      <div className="gacha-reveal__ring" aria-hidden="true" />
      <div className="gacha-reveal__particles" aria-hidden="true">{Array.from({ length: ssr ? 32 : 12 }, (_, i) => <i key={i} style={{ '--angle': `${i * 137.5}deg`, '--distance': `${100 + i % 7 * 27}px`, '--delay': `${i % 8 * 75}ms` } as CSSProperties} />)}</div>
      {!revealed && <div className="gacha-reveal__invocation"><Sparkles size={40} strokeWidth={1} /><p>{ssr ? '運命の扉が、開く。' : '祈りが、星に届く。'}</p><Button variant="secondary" onClick={() => setRevealed(true)}>演出をスキップ</Button></div>}
      {revealed && <><div className="gacha-reveal__burst" aria-hidden="true" /><CharacterArtwork className="gacha-reveal__art" character={character} reducedMotion={reducedMotion} /><div className="gacha-reveal__result" role="status"><span className="gacha-reveal__rarity">{character.rarity}</span><span className="gacha-reveal__new">{duplicate ? `祈願石 ${refund}個を還元` : 'NEW GODDESS'}</span><p>{character.epithet}</p><h3>{character.name}</h3><small>{roleName(character.role)}</small><Button className="gacha-reveal__accept" onClick={onClose}>{duplicate ? '祈願に戻る' : '女神を迎える'}</Button></div></>}
    </div>
  </Modal>;
}
