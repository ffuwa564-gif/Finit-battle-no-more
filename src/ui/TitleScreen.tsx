import { tr, localize } from '../locales/i18n';
import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button, LanguageSwitch } from './index';
import { assetPath } from '../content';
import './title-screen.css';
import { SceneAtmosphere } from './SceneAtmosphere';
import { TitleBirthScene } from './TitleBirthScene';

export function TitleScreen({ onStart, leaving, returning, reducedMotion = false }: { onStart: () => void; leaving: boolean; returning: boolean; reducedMotion?: boolean }) {
  const [paused, setPaused] = useState(false);
  return <main className={`title-screen${leaving ? ' is-leaving' : ''}`} aria-labelledby="title-screen-name" data-motion-paused={paused || reducedMotion}>
    <div className="title-screen__backdrop" aria-hidden="true">
      <TitleBirthScene reducedMotion={reducedMotion} suspended={paused || leaving} />
    </div>
    <SceneAtmosphere reducedMotion={reducedMotion || paused} />
    <div className="title-screen__motes" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
    {!reducedMotion && <Button className="title-screen__motion" variant="icon" sound={false} disabled={leaving} aria-label={tr(paused ? '背景の動きを再生' : '背景の動きを止める')} title={tr(paused ? '背景の動きを再生' : '背景の動きを止める')} onClick={() => setPaused(value => !value)}>{paused ? <Play size={15} /> : <Pause size={15} />}</Button>}
    <LanguageSwitch className="title-language" />
    <div className="title-screen__brand">
      <h1 id="title-screen-name" aria-label="STILLVEIL"><img src={assetPath('title-wordmark')} alt="" /></h1>
      <p className="title-screen__subtitle">{tr("静謐の残響")}</p>
      <p className="title-screen__invitation" id="title-screen-invitation">{tr('死にたがりの世界で、')}<br />{tr('私は死ねなかった。')}</p>
    </div>
    <Button className="title-screen__start" sound={false} disabled={leaving} aria-label={tr('タップしてはじめる')} aria-describedby="title-screen-invitation" onClick={onStart}>
      <span className="title-screen__entry"><span className="title-screen__touch" aria-hidden="true"><i /><i /></span><span className="title-screen__start-label">{tr('タップしてはじめる')}</span><span className="title-screen__footnote">{localize(returning ? '旅の続きから、もう一度。' : '音楽とともに、静かな廃都へ。')}</span></span>
    </Button>
  </main>;
}
