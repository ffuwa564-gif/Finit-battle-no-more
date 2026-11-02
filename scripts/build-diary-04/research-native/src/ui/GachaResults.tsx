import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Moon, Sparkles } from 'lucide-react';
import { tr, localize } from '../locales/i18n';
import type { GachaResult } from '../domain/types';
import { characterById } from '../content';
import { Button, Modal, PortraitArt } from './index';
import { emitUISound } from './interaction';
import { GachaReveal } from './GachaReveal';
import './gacha-results.css';

/** Results are already saved; every phase below is presentation only. */
export function GachaResults({ results, introIndex, reducedMotion, onClose, onReveal }: {
  results: GachaResult[]; introIndex: number; reducedMotion: boolean; onClose: () => void; onReveal: (ssr: boolean) => void;
}) {
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const quiet = reducedMotion || systemReduced;
  const [phase, setPhase] = useState<'invocation' | 'cards'>(() => quiet ? 'cards' : 'invocation');
  const [visible, setVisible] = useState(() => quiet ? results.length : 0);
  const [skipped, setSkipped] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const announced = useRef(false);
  const cue = useRef(onReveal); cue.current = onReveal;
  const hasSSR = results.some(result => ['SSR', 'XR'].includes(characterById(result.characterId).rarity));
  const complete = visible >= results.length;
  const skip = () => { setSkipped(true); setSelected(null); setVisible(results.length); setPhase('cards'); };
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setSystemReduced(media.matches);
    media.addEventListener('change', change); return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => { if (quiet) { setVisible(results.length); setPhase('cards'); } }, [quiet, results.length]);
  useEffect(() => {
    if (results.length > 1 && !announced.current) { announced.current = true; cue.current(quiet && hasSSR); }
  }, [results.length, hasSSR, quiet]);
  useEffect(() => {
    if (results.length < 2 || quiet || phase !== 'invocation') return;
    const timer = setTimeout(() => setPhase('cards'), 2200);
    return () => clearTimeout(timer);
  }, [results.length, quiet, phase]);
  useEffect(() => {
    if (results.length < 2 || quiet || phase !== 'cards' || complete || selected !== null) return;
    const rarity = characterById(results[visible].characterId).rarity;
    const timer = setTimeout(() => {
      setVisible(visible + 1);
      if (rarity === 'SSR' || rarity === 'XR') setSelected(visible);
      else emitUISound('select');
    }, rarity === 'SSR' || rarity === 'XR' ? 900 : rarity === 'SR' ? 450 : 240);
    return () => clearTimeout(timer);
  }, [results, quiet, phase, complete, selected, visible]);
  const index = results.length === 1 ? 0 : selected;
  if (index !== null) {
    const result = results[index]!; const character = characterById(result.characterId);
    return <GachaReveal key={index} character={character} duplicate={result.duplicate} refund={result.refund} introGuarantee={introIndex === index} currency={result.currency} reducedMotion={quiet} onClose={results.length === 1 ? onClose : () => setSelected(null)} onSkipAll={results.length > 1 ? skip : undefined} onReveal={() => onReveal(character.rarity === 'SSR' || character.rarity === 'XR')} />;
  }
  const refund = results.reduce((sum, result) => sum + result.refund, 0);
  return <Modal title={tr('10連祈願の結果')} className="gacha-results-modal" onClose={onClose}>
    <div className={`gacha-results${quiet || skipped ? ' is-reduced' : ''}${hasSSR ? ' has-gold' : ''}`} data-stage={phase}>
      <header className="gacha-results__heading"><span>DIVINE ENCOUNTER</span><h2>{tr('十の祈りが、結ばれる。')}</h2></header>
      {phase === 'invocation' ? <div className="gacha-ritual" aria-label={tr('十の祈りを紡いでいます')}>
        <div className="gacha-ritual__rays" aria-hidden="true" />
        <div className="gacha-ritual__seal" aria-hidden="true"><Moon size={52} strokeWidth={.8} /><Sparkles size={24} /></div>
        <div className="gacha-ritual__constellation" aria-hidden="true">{results.map((_, i) => <i key={i} style={{ '--orbit': `${i * 36}deg`, '--order': i } as CSSProperties}><Sparkles size={18} /></i>)}</div>
        <p>STILLVEIL</p>
      </div> : <>
        {!complete && <p className="gacha-results__progress" role="status">{tr('祈りの顕現 {0} / 10').replace('{0}', String(visible))}</p>}
        {introIndex >= 0 && visible > introIndex && <p className="gacha-results__guarantee" role="status">{tr('全ガチャ共通の初回SSR保証を使用しました')}</p>}
        <div className="gacha-results__grid" aria-label={tr('獲得した10体')}>
          {results.map((result, i) => {
            const character = characterById(result.characterId), opened = i < visible;
            return <Button key={i} variant="secondary" className={`gacha-result ${opened ? `is-open gacha-result--${character.rarity.toLowerCase()}` : 'is-sealed'}`} style={{ '--result-order': i } as CSSProperties} aria-label={opened ? tr('{0}：{1} {2}').replace('{0}', String(i + 1)).replace('{1}', character.rarity).replace('{2}', tr(character.name)) : tr('未開封の祈り {0}').replace('{0}', String(i + 1))} disabled={!opened} onClick={() => setSelected(i)}>
              <span className="gacha-result__portrait">{opened && <PortraitArt character={character} face />}</span>
              {opened ? <><span className="gacha-result__rarity">{character.rarity}</span><span className="gacha-result__tag">{result.duplicate ? tr('還元 +{0}').replace('{0}', String(result.refund)) : 'NEW'}</span><strong>{localize(character.name)}</strong></> : <><span className="gacha-result__back" aria-hidden="true"><Moon size={24} strokeWidth={1} /><small>{String(i + 1).padStart(2, '0')}</small></span><span className="gacha-result__tag" aria-hidden="true" /><strong aria-hidden="true" /></>}
            </Button>;
          })}
        </div>
        {complete && <><div className="gacha-results__footer"><span>{tr(results.some(result => characterById(result.characterId).speciesId === 'clockwork') ? '新しい仲間 {0}体' : '新しい女神 {0}体').replace('{0}', String(results.filter(result => !result.duplicate).length))}</span><span>{tr(results[0]?.currency === 'astralStones' ? '星晶石還元 {0}個' : '祈願石還元 {0}個').replace('{0}', String(refund))}</span></div><Button size="lg" className="gacha-results__accept" onClick={onClose}>{tr('祈願に戻る')}</Button></>}
      </>}
      {!complete && <Button variant="secondary" className="gacha-results__skip" onClick={skip}>{tr('結果をまとめて見る')}</Button>}
    </div>
  </Modal>;
}
