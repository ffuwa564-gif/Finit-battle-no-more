import { GameImage } from './GameMedia';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createGamePortal } from './GamePortal';
import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react';
import type { GameSave } from '../domain/types';
import { assetPath, content } from '../content';
import { tr } from '../locales/i18n';
import { Button } from './index';
import { fairyLessons, fairyStorageKey, advanceFairyStep, moveFairyStep, switchFairyTopic, openFairyTopic, newFairyProgress, parseFairyProgress, type FairyTopic } from './fairy-tutorial-data';
import './fairy-guide.css';

const openEvent = 'stillveil:fairy-guide';
export function FairyGuideButton({ compact = false }: { compact?: boolean }) {
  return <Button className="fairy-guide-launch" data-guide="guide-launch" data-fairy-launch variant={compact ? 'icon' : 'secondary'} size="sm" title={tr('妖精の案内')} aria-label={tr(compact ? '妖精の案内' : '妖精に教えてもらう')} onClick={() => window.dispatchEvent(new Event(openEvent))}><Sparkles size={17} />{!compact && tr('妖精に教えてもらう')}</Button>;
}
interface Geometry { target: HTMLElement | null; rect: { top: number; left: number; width: number; height: number } | null; host: HTMLElement | null; modal: HTMLElement | null; width: number; height: number }
const initialGeometry = (): Geometry => ({ target: null, rect: null, host: null, modal: null, width: window.innerWidth, height: window.innerHeight });
function visible(element: HTMLElement) { const r = element.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(element).visibility !== 'hidden'; }

/** Nonmodal contextual help: real controls keep their normal behavior and save transactions. */
export function FairyGuide({ save, page, suspended }: { save: GameSave; page: string; suspended: boolean }) {
  const [progress, setProgress] = useState(() => { try { return parseFairyProgress(localStorage.getItem(fairyStorageKey)); } catch { return newFairyProgress(); } });
  const [running, setRunning] = useState(false);
  const [inviting, setInviting] = useState(() => !progress.offered);
  const [geometry, setGeometry] = useState(initialGeometry);
  const [panelHeight, setPanelHeight] = useState(260);
  const panel = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const textId = useId();
  const titleId = useId();
  const preparation = Boolean(geometry.modal?.isConnected && geometry.modal?.querySelector('[data-guide="depart"]'));
  const battle = save.battle;
  const context: FairyTopic | null = preparation ? 'preparation' : battle ? battle.phase === 'ready' ? content.dungeons.find(d => d.id === battle.dungeonId)?.coordination ? 'coordination' : 'battle' : battle.phase === 'reward' ? content.dungeons.find(d => d.id === battle.dungeonId)?.kind === 'trial' ? 'trial-reward' : 'reward' : battle.phase === 'failed' ? 'failure' : null : Object.hasOwn(fairyLessons, page) ? page as FairyTopic : 'general';
  const active = !suspended && (!geometry.modal?.isConnected || preparation) && running && !progress.dismissed && context === progress.topic && !progress.seen.includes(context);
  const welcome = !suspended && !geometry.modal && !battle && page === 'home' && inviting && !running && !progress.dismissed;
  const lesson = fairyLessons[progress.topic][progress.step];
  const key = active ? `${progress.topic}:${progress.step}` : '';

  useEffect(() => { try { localStorage.setItem(fairyStorageKey, JSON.stringify(progress)); } catch { /* Guidance remains usable when storage is unavailable. */ } }, [progress]);
  useEffect(() => {
    if (context && running && !progress.dismissed && progress.topic !== context) setProgress(p => switchFairyTopic(p, context));
  }, [context, running, progress.dismissed, progress.topic]);
  useEffect(() => { if (welcome && !progress.offered) setProgress(p => ({ ...p, offered: true })); }, [welcome, progress.offered]);
  useEffect(() => { if (progress.offered && (page !== 'home' || battle)) setInviting(false); }, [page, Boolean(battle), progress.offered]);
  useEffect(() => {
    const open = () => {
      restoreFocus.current = document.activeElement as HTMLElement | null;
      setInviting(false); setRunning(true);
      setProgress(p => openFairyTopic(p, context ?? 'battle'));
    };
    window.addEventListener(openEvent, open);
    return () => window.removeEventListener(openEvent, open);
  }, [context]);

  useLayoutEffect(() => {
    // No DOM observation or animation-frame work while help is inactive in combat.
    if (battle?.phase === 'playing' || (!running && !(inviting && page === 'home' && !progress.dismissed && !battle))) return;
    let frame = 0;
    const measure = () => {
      const modal = [...document.querySelectorAll<HTMLElement>('.modal[aria-modal="true"]')].filter(visible).at(-1) ?? null;
      const target = active ? [...document.querySelectorAll<HTMLElement>(`[data-guide="${lesson.target}"]`)].find(visible) ?? null : null;
      const box = target?.getBoundingClientRect();
      const rect = box ? { top: Math.round(box.top), left: Math.round(box.left), width: Math.round(box.width), height: Math.round(box.height) } : null;
      const next = { target, rect, modal, host: document.querySelector<HTMLElement>('[data-guide="welcome-slot"]'), width: window.visualViewport?.width ?? window.innerWidth, height: window.visualViewport?.height ?? window.innerHeight };
      setGeometry(old => old.target === next.target && old.modal === next.modal && old.host === next.host && old.width === next.width && old.height === next.height && JSON.stringify(old.rect) === JSON.stringify(next.rect) ? old : next);
    };
    const queue = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new MutationObserver(queue);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled', 'data-guide'] });
    window.addEventListener('resize', queue); window.addEventListener('scroll', queue, true);
    window.visualViewport?.addEventListener('resize', queue);
    measure();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', queue); window.removeEventListener('scroll', queue, true); window.visualViewport?.removeEventListener('resize', queue); };
  }, [active, lesson.target, page, save.battle?.phase, running, inviting, progress.dismissed]);
  useLayoutEffect(() => {
    if (!active) return;
    const target = [...document.querySelectorAll<HTMLElement>(`[data-guide="${lesson.target}"]`)].find(visible);
    target?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
  }, [key]);
  useLayoutEffect(() => {
    if (!panel.current) return;
    const observer = new ResizeObserver(entries => setPanelHeight(entries[0].target.getBoundingClientRect().height));
    observer.observe(panel.current); return () => observer.disconnect();
  }, [active, welcome, preparation]);
  useEffect(() => {
    if (!active || !geometry.target) return;
    const target = geometry.target, previous = target.getAttribute('aria-describedby');
    target.setAttribute('aria-describedby', `${previous ?? ''} ${textId}`.trim());
    return () => { if (previous === null) target.removeAttribute('aria-describedby'); else target.setAttribute('aria-describedby', previous); };
  }, [active, geometry.target, textId]);

  const dismiss = () => {
    setRunning(false); setInviting(false);
    setProgress(p => ({ ...p, offered: true, enrolled: false, dismissed: true }));
    (restoreFocus.current?.isConnected ? restoreFocus.current : document.querySelector<HTMLElement>('[data-fairy-launch]'))?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!active) return;
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !geometry.modal) { event.preventDefault(); dismiss(); } };
    document.addEventListener('keydown', keydown); return () => document.removeEventListener('keydown', keydown);
  }, [active, geometry.modal]);
  useEffect(() => {
    if (!active || !geometry.target) return;
    const target = geometry.target;
    const used = (event: MouseEvent) => {
      const source = event.target;
      if (!(source instanceof Element) || !target.contains(source)) return;
      const control = source.closest('button,a,input,select');
      if (!control || control.matches(':disabled') || control.getAttribute('aria-disabled') === 'true') return;
      setProgress(p => p.topic === progress.topic && p.step === progress.step ? advanceFairyStep(p) : p);
    };
    // Capture before navigation unmounts the old screen, retaining its next step.
    document.addEventListener('click', used, true);
    return () => document.removeEventListener('click', used, true);
  }, [active, geometry.target, key]);
  if (welcome && geometry.host) return createGamePortal(<section className="fairy-invitation" aria-label={tr('案内妖精リュミ')}><GameImage src={assetPath('fairy-guide')} alt={tr('案内妖精リュミ')} /><div><strong>{tr('はじめまして！ 私はリュミ。')}</strong><p>{tr('この街が初めてなら、私がボタンの使い方を教えるよ！')}</p><div className="fairy-invitation__actions"><Button size="sm" onClick={() => { restoreFocus.current = document.activeElement as HTMLElement; setRunning(true); setInviting(false); setProgress(p => openFairyTopic(p, 'home')); }}>{tr('案内をお願い！')}</Button><Button size="sm" variant="secondary" onClick={dismiss}>{tr('自分で始める')}</Button></div></div></section>, geometry.host);
  if (!active) return null;
  const width = Math.min(380, geometry.width - 24);
  const r = geometry.rect;
  const left = Math.max(12, Math.min(geometry.width - width - 12, r ? r.left + r.width / 2 - width / 2 : geometry.width - width - 16));
  const top = Math.max(12, Math.min(geometry.height - panelHeight - 86, r ? (r.top > panelHeight + 28 ? r.top - panelHeight - 16 : r.top + r.height + 16) : 80));
  const card = <section ref={panel} className={`fairy-guide${preparation ? ' fairy-guide--embedded' : ''}`} style={preparation ? undefined : { left, top, width } as CSSProperties} role={preparation ? 'region' : 'dialog'} aria-labelledby={titleId} aria-describedby={textId}>
    <div className="fairy-guide__portrait"><GameImage src={assetPath('fairy-guide')} alt="" /><span>{tr('案内妖精 リュミ')}</span></div>
    <div className="fairy-guide__copy"><span className="fairy-guide__chapter">{tr('リュミのレッスン')} {progress.step + 1} / {fairyLessons[progress.topic].length}</span><h2 id={titleId} ref={heading} tabIndex={-1}>{tr(lesson.title)}</h2><p id={textId}>{tr(lesson.text)}</p></div>
    <Button className="fairy-guide__close" variant="icon" aria-label={tr('案内をスキップ')} title={tr('案内をスキップ')} onClick={dismiss}><X size={17} /></Button>
    <div className="fairy-guide__actions"><Button size="sm" variant="secondary" disabled={progress.step === 0} onClick={() => setProgress(p => moveFairyStep(p, p.step - 1))}><ArrowLeft size={14} />{tr('前へ')}</Button>

      <Button size="sm" onClick={() => { if (progress.step + 1 < fairyLessons[progress.topic].length) setProgress(advanceFairyStep); else { setProgress(advanceFairyStep); (restoreFocus.current?.isConnected ? restoreFocus.current : document.querySelector<HTMLElement>('[data-fairy-launch]'))?.focus({ preventScroll: true }); } }}>{tr(progress.step + 1 === fairyLessons[progress.topic].length ? 'この案内を閉じる' : '次へ')}<ArrowRight size={14} /></Button>
    </div><small className="fairy-guide__hint">{tr('光っているゲームのボタンを押してね。操作すると次の説明に進むよ！')}</small>
  </section>;
  return <>{r && !preparation && createGamePortal(<div className="fairy-guide-highlight" aria-hidden="true" style={{ top: r.top - 5, left: r.left - 5, width: r.width + 10, height: r.height + 10 } as CSSProperties} />, document.body)}{createGamePortal(card, preparation ? geometry.modal!.querySelector<HTMLElement>('.modal__body')! : document.body)}</>;
}
