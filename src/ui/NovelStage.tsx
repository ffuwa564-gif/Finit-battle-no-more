import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import type { NovelPageDef } from '../domain/types';
import { assetPath, content } from '../content';
import { GameImage } from './GameMedia';
import { SceneAtmosphere } from './SceneAtmosphere';
import './visual-novel.css';

/** Opening, archived scenes and living-map conversations share the same stage. */
export function NovelStage({ title, titleId, sceneId, pageIndex, backgroundId, shade = 'normal', phase = 'reading', reducedMotion, rootRef, className = '', eyebrow = 'STILLVEIL · STORY', toolbar, children }: {
  title: string; titleId: string; sceneId: string; pageIndex: number;
  backgroundId: string; shade?: NovelPageDef['shade'] | 'normal'; phase?: string;
  reducedMotion: boolean; rootRef: RefObject<HTMLElement | null>; className?: string;
  eyebrow?: string; toolbar: ReactNode; children: ReactNode;
}) {
  const [backgrounds, setBackgrounds] = useState([backgroundId]);
  useEffect(() => { if (backgrounds.at(-1) !== backgroundId) setBackgrounds(old => [...old.slice(-1), backgroundId]); }, [backgroundId, backgrounds]);
  return <section ref={rootRef} className={`visual-novel visual-novel--${phase}${reducedMotion ? ' visual-novel--reduced' : ''} ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} data-scene={sceneId} data-page={pageIndex}>
    <div className="novel-backgrounds" aria-hidden="true">{backgrounds.map(id => <GameImage key={id} src={assetPath(id)} alt="" style={{ objectPosition: content.assets.find(asset => asset.id === id)?.anchor ?? '50% 50%' }} className={id === backgroundId ? 'is-current' : ''} />)}</div>
    <div className={`novel-shade novel-shade--${shade}`} aria-hidden="true" />
    {shade !== 'black' && <SceneAtmosphere mode={shade === 'dark' ? 'memory' : 'quiet'} reducedMotion={reducedMotion} />}
    <header className="novel-header"><div><span>{eyebrow}</span><h1 id={titleId}>{title}</h1></div><div className="novel-toolbar">{toolbar}</div></header>
    {children}
  </section>;
}
