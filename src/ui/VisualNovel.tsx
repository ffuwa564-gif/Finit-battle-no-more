import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, BookOpen, FastForward, X } from 'lucide-react';
import type { GameCommand, GameSave, NovelSceneDef } from '../domain/types';
import { assetPath, content } from '../content';
import { novelAvailable } from '../domain/novels';
import { tr } from '../locales/i18n';
import { Button, Modal, Panel } from './index';
import './visual-novel.css';
import { SceneAtmosphere } from './SceneAtmosphere';

export function NovelLibrary({ save, busy, command }: { save: GameSave; busy: boolean; command: (c: GameCommand) => Promise<boolean> }) {
  const scenes = (content.novels ?? []).filter(scene => novelAvailable(scene, save));
  return <Panel className="novel-library"><h3><BookOpen size={18} />{tr('物語の記録')}</h3><p>{tr('OPや、踏破した章の物語を読み返せます。')}</p><div className="novel-library__list">{scenes.map(scene => <Button variant="secondary" key={scene.id} disabled={busy || Boolean(save.battle) || Boolean(save.novels?.active)} onClick={() => { void command({ type: 'novelStart', sceneId: scene.id }); }}><span>{tr(scene.title)}</span><small>{tr(save.novels?.seen.includes(scene.id) ? '再生済み' : '未読')}</small><ArrowRight size={14} /></Button>)}</div></Panel>;
}

export function VisualNovel({ scene, pageIndex, reducedMotion, busy, onNext, onBack, onFinish }: {
  scene: NovelSceneDef; pageIndex: number; reducedMotion: boolean; busy: boolean;
  onNext: () => Promise<boolean>; onBack: () => Promise<boolean>; onFinish: () => Promise<boolean>;
}) {
  const page = scene.pages[pageIndex]!;
  const [phase, setPhase] = useState(reducedMotion ? 'reading' : 'entering');
  const [backgrounds, setBackgrounds] = useState([page.backgroundId]);
  const [skip, setSkip] = useState(false), [log, setLog] = useState(false), [error, setError] = useState('');
  const root = useRef<HTMLElement>(null);
  const closing = useRef(false);
  const last = pageIndex + 1 === scene.pages.length;
  const blocked = busy || phase !== 'reading';
  useEffect(() => { if (backgrounds.at(-1) !== page.backgroundId) setBackgrounds(old => [...old.slice(-1), page.backgroundId]); }, [page.backgroundId, backgrounds]);
  useEffect(() => {
    const timer = setTimeout(() => setPhase('reading'), reducedMotion ? 0 : 650);
    const oldFocus = document.activeElement as HTMLElement | null;
    root.current?.focus();
    return () => { clearTimeout(timer); oldFocus?.isConnected && oldFocus.focus({ preventScroll: true }); };
  }, []);
  async function finish() {
    if (closing.current || busy) return;
    closing.current = true; setSkip(false); setPhase('leaving'); setError('');
    await new Promise(resolve => setTimeout(resolve, reducedMotion ? 0 : 550));
    if (!await onFinish()) { closing.current = false; setPhase('reading'); setError('物語の記録を保存できませんでした。もう一度お試しください。'); }
  }
  async function move(back = false) {
    setError('');
    if (!await (back ? onBack() : onNext())) setError('物語の記録を保存できませんでした。もう一度お試しください。');
  }
  function advance() { if (blocked) return; if (last) void finish(); else void move(); }
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (skip || log) return;
      if (event.key === 'Escape') { event.preventDefault(); if (!closing.current) setSkip(true); return; }
      if (event.key === 'Tab') {
        const controls = [...(root.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])];
        if (!controls.length) { event.preventDefault(); return; }
        const first = controls[0], final = controls.at(-1)!;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); final.focus(); }
        else if (!event.shiftKey && (document.activeElement === final || document.activeElement === root.current)) { event.preventDefault(); first.focus(); }
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && !(event.target instanceof Element && event.target.closest('button'))) { event.preventDefault(); advance(); }
    };
    document.addEventListener('keydown', keys); return () => document.removeEventListener('keydown', keys);
  }, [skip, log, blocked, last, onNext, onFinish]);
  return createPortal(<>
    <section ref={root} className={`visual-novel visual-novel--${phase}${reducedMotion ? ' visual-novel--reduced' : ''}`} role="dialog" aria-modal="true" aria-labelledby="novel-title" tabIndex={-1} data-scene={scene.id} data-page={pageIndex}>
      <div className="novel-backgrounds" aria-hidden="true">{backgrounds.map(id => <img key={id} src={assetPath(id)} alt="" style={{ objectPosition: content.assets.find(asset => asset.id === id)?.anchor ?? '50% 50%' }} className={id === page.backgroundId ? 'is-current' : ''} />)}</div>
      <div className={`novel-shade novel-shade--${page.shade ?? 'normal'}`} aria-hidden="true" />
      {page.shade !== 'black' && <SceneAtmosphere mode={page.shade === 'dark' ? 'memory' : 'quiet'} reducedMotion={reducedMotion} />}
      <header className="novel-header"><div><span>STILLVEIL · STORY</span><h1 id="novel-title">{tr(scene.title)}</h1></div><div className="novel-toolbar"><Button variant="secondary" size="sm" disabled={blocked} onClick={() => setLog(true)}><BookOpen size={15} />{tr('会話ログ')}</Button><Button variant="secondary" size="sm" disabled={blocked} onClick={() => setSkip(true)}><FastForward size={15} />{tr('物語をスキップ')}</Button></div></header>
      <div className="novel-message">
        <div className="novel-speaker" aria-live="polite">{tr(page.speaker ?? '語り')}</div>
        <Button className="novel-dialogue" sound={false} disabled={blocked} onClick={advance} aria-label={tr('台詞を進める')} aria-describedby="novel-text"><span id="novel-text" className="novel-text" key={`${scene.id}:${pageIndex}`} aria-live="polite">{tr(page.text)}</span><span className="novel-cursor" aria-hidden="true">◇</span></Button>
        {error && <p role="alert">{tr(error)}</p>}
        <footer className="novel-footer"><Button variant="secondary" size="sm" disabled={blocked || pageIndex === 0} onClick={() => { void move(true); }}><ArrowLeft size={15} />{tr('前の台詞')}</Button><span>{pageIndex + 1} / {scene.pages.length}</span><Button size="sm" disabled={blocked} onClick={advance}>{tr(last ? '物語を閉じる' : '次の台詞')}<ArrowRight size={15} /></Button></footer>
      </div>
    </section>
    <Modal className="novel-confirm" open={skip} title={tr('この物語をスキップしますか？')} onClose={() => setSkip(false)}><p>{tr('スキップした物語は、設定の「物語の記録」から読み返せます。')}</p><div className="toolbar"><Button disabled={blocked} onClick={() => { void finish(); }}>{tr('スキップして進む')}</Button><Button variant="secondary" onClick={() => setSkip(false)}>{tr('読み続ける')}</Button></div></Modal>
    <Modal className="novel-log" open={log} title={tr('会話ログ')} onClose={() => setLog(false)}><div className="novel-log__entries">{scene.pages.slice(0, pageIndex + 1).map((entry, index) => <article key={index}><strong>{tr(entry.speaker ?? '語り')}</strong><p>{tr(entry.text)}</p></article>)}</div><Button onClick={() => setLog(false)}><X size={15} />{tr('物語に戻る')}</Button></Modal>
  </>, document.body);
}
