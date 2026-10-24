import { Moon, ArrowRight } from 'lucide-react';
import { Button } from './index';
import { assetPath } from '../content';
import './title-screen.css';

export function TitleScreen({ onStart, leaving, returning }: { onStart: () => void; leaving: boolean; returning: boolean }) {
  return <main className={`title-screen${leaving ? ' is-leaving' : ''}`} aria-labelledby="title-screen-name">
    <img className="title-screen__art" src={assetPath('menu-hero')} alt="" />
    <div className="title-screen__brand">
      <Moon size={32} strokeWidth={1} aria-hidden="true" />
      <p className="title-screen__eyebrow">BENEATH THE SILENT MOON</p>
      <h1 id="title-screen-name">STILLVEIL</h1>
      <p className="title-screen__subtitle">静謐の残響</p>
    </div>
    <div className="title-screen__entry">
      <p className="title-screen__invitation">月明かりの先で、記憶が目を覚ます。</p>
      <Button className="title-screen__start" sound={false} disabled={leaving} onClick={onStart}>タップしてはじめる <ArrowRight size={17} strokeWidth={1.4} /></Button>
      <p className="title-screen__footnote">{returning ? '旅の続きから、もう一度。' : '音楽とともに、静かな廃都へ。'}</p>
    </div>
  </main>;
}
