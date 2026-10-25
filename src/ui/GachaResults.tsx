import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { tr, localize } from '../locales/i18n';
import type { GachaResult } from '../domain/types';
import { characterById } from '../content';
import { Button, Modal, PortraitArt } from './index';
import { GachaReveal } from './GachaReveal';
import './gacha-results.css';

/** The whole draw is saved before presentation; inspecting a card never performs another draw. */
export function GachaResults({ results, introIndex, reducedMotion, onClose, onReveal }: {
  results: GachaResult[]; introIndex: number; reducedMotion: boolean; onClose: () => void; onReveal: (ssr: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const announced = useRef(false);
  const cue = useRef(onReveal); cue.current = onReveal;
  const hasSSR = results.some(result => characterById(result.characterId).rarity === 'SSR');
  useEffect(() => { if (results.length > 1 && !announced.current) { announced.current = true; cue.current(hasSSR); } }, [results, hasSSR]);
  const index = results.length === 1 ? 0 : selected;
  if (index !== null) {
    const result = results[index]!; const character = characterById(result.characterId);
    return <GachaReveal key={index} character={character} duplicate={result.duplicate} refund={result.refund} introGuarantee={introIndex === index} reducedMotion={reducedMotion} onClose={results.length === 1 ? onClose : () => setSelected(null)} onReveal={() => onReveal(character.rarity === 'SSR')} />;
  }
  const refund = results.reduce((sum, result) => sum + result.refund, 0);
  return <Modal title={tr('10連祈願の結果')} className="gacha-results-modal" onClose={onClose}>
    <div className={`gacha-results${reducedMotion ? ' is-reduced' : ''}`}>
      <header className="gacha-results__heading"><span>DIVINE ENCOUNTER</span><h2>{tr('十の祈りが、結ばれる。')}</h2></header>
      {introIndex >= 0 && <p className="gacha-results__guarantee" role="status">{tr('全ガチャ共通の初回SSR保証を使用しました')}</p>}
      <div className="gacha-results__grid" aria-label={tr('獲得した10体')}>
        {results.map((result, i) => {
          const character = characterById(result.characterId);
          return <Button key={i} variant="secondary" className={`gacha-result gacha-result--${character.rarity.toLowerCase()}`} style={{ '--result-order': i } as CSSProperties} aria-label={tr('{0}：{1} {2}').replace('{0}', String(i + 1)).replace('{1}', character.rarity).replace('{2}', tr(character.name))} onClick={() => setSelected(i)}>
            <span className="gacha-result__portrait"><PortraitArt character={character} face /></span>
            <span className="gacha-result__rarity">{character.rarity}</span>
            <span className="gacha-result__tag">{result.duplicate ? tr('還元 +{0}').replace('{0}', String(result.refund)) : 'NEW'}</span>
            <strong>{localize(character.name)}</strong>
          </Button>;
        })}
      </div>
      <div className="gacha-results__footer"><span>{tr(results.some(result => characterById(result.characterId).speciesId === 'clockwork') ? '新しい仲間 {0}体' : '新しい女神 {0}体').replace('{0}', String(results.filter(result => !result.duplicate).length))}</span><span>{tr('祈願石還元 {0}個').replace('{0}', String(refund))}</span></div>
      <Button size="lg" className="gacha-results__accept" onClick={onClose}>{tr('祈願に戻る')}</Button>
    </div>
  </Modal>;
}
