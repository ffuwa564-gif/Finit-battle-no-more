import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, X } from 'lucide-react';
import { getLanguage, tr, useLanguage } from '../locales/i18n';
import { nodeLines, resolvedStoryNode, storyText, worldStorySupportingSpeakers } from '../domain/world-story';
import type { Content, GameSave, GameCommand } from '../domain/types';
import { Button, Modal } from './index';
import { NovelStage } from './NovelStage';
import { createGamePortal } from './GamePortal';
import './world-story.css';

export function WorldConversation({ save, content, busy, command }: {
  save: GameSave; content: Content; busy: boolean; command: (c: GameCommand) => Promise<boolean>;
}) {
  useLanguage();
  const root = useRef<HTMLElement>(null), [log, setLog] = useState(false);
  const s = save.worldStory, a = s?.active, rawNode = content.worldStory?.nodes.find(n => n.id === a?.nodeId);
  useEffect(() => {
    setLog(false);
    if (!a) return;
    const oldFocus = document.activeElement as HTMLElement | null;
    root.current?.focus();
    return () => { if (oldFocus?.isConnected) oldFocus.focus({ preventScroll: true }); };
  }, [a?.nodeId]);
  const node = rawNode && s ? resolvedStoryNode(rawNode, s) : undefined;
  const lines = node && s ? nodeLines(node, s) : [], line = a ? lines[a.line] : undefined;
  const choosing = Boolean(node?.choices?.length && !a?.choiceId && a?.line === node.lines.length - 1 && !a?.replay);
  const last = Boolean(a && a.line === lines.length - 1);
  const advance = () => { if (!busy && !choosing) void command({ type: last ? 'worldTalkFinish' : 'worldTalkNext' }); };
  useEffect(() => {
    if (!a || log) return;
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); if (!busy) void command({ type: 'worldTalkClose' }); }
      if (e.key === 'Tab') {
        const controls = [...(root.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])];
        const first = controls[0], final = controls.at(-1);
        if (!first || !final) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { e.preventDefault(); final.focus(); }
        else if (!e.shiftKey && (document.activeElement === final || document.activeElement === root.current)) { e.preventDefault(); first.focus(); }
      }
      if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof Element && e.target.closest('button'))) { e.preventDefault(); advance(); }
    };
    document.addEventListener('keydown', keys);
    return () => document.removeEventListener('keydown', keys);
  }, [a?.nodeId, a?.line, log, busy, choosing, last, command]);
  if (!s || !a || !node || !line) return null;
  const name = (id: string) => id === 'hero' ? s.profile.name : tr(content.characters.find(c => c.id === id)?.name ?? worldStorySupportingSpeakers[id] ?? '語り');
  const text = (v: Parameters<typeof storyText>[0]) => storyText(v, s.profile, getLanguage());
  const words = (entry: typeof line) => text(entry.speaker === 'hero' ? entry.voices?.[s.profile.voice] ?? entry.favorites?.[s.profile.favorite] ?? entry.text : entry.favorites?.[s.profile.favorite] ?? entry.text);
  return createGamePortal(<>
    <NovelStage rootRef={root} title={text(node.title)} titleId="world-novel-title" sceneId={node.id} pageIndex={a.line} backgroundId={line.backgroundId ?? node.backgroundId ?? 'novel-awakening-garden'} shade={line.shade} reducedMotion={save.settings.reducedMotion} className="world-conversation" toolbar={<>
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => setLog(true)}><BookOpen size={15} />{tr('会話ログ')}</Button>
      <Button variant="secondary" size="sm" disabled={busy} aria-label={tr('会話を閉じる')} onClick={() => command({ type: 'worldTalkClose' })}><X size={15} /></Button>
    </>}>
      <div className="novel-message world-conversation__line" data-world-node={node.id} data-world-line={a.line}>
        <strong className="novel-speaker" aria-live="polite">{name(line.speaker)}</strong>
        <Button className="novel-dialogue" sound={false} disabled={busy || choosing} onClick={advance} aria-label={tr('台詞を進める')} aria-describedby="world-novel-text"><span id="world-novel-text" className="novel-text" key={`${node.id}:${a.line}`} aria-live="polite">{words(line)}</span><span className="novel-cursor" aria-hidden="true">◇</span></Button>
        <footer className="novel-footer">
          <Button variant="secondary" size="sm" disabled={busy || a.line === 0} onClick={() => command({ type: 'worldTalkBack' })}><ArrowLeft size={15} />{tr('前の台詞')}</Button>
          <span>{a.line + 1} / {lines.length}</span>
          {!choosing && <Button size="sm" disabled={busy} onClick={advance}>{tr(last ? '地図へ戻る' : '次の台詞')}<ArrowRight size={15} /></Button>}
          {choosing && <div className="world-conversation__choices">{node.choices!.map(choice => <Button key={choice.id} disabled={busy} variant="secondary" onClick={() => command({ type: 'worldTalkChoice', choiceId: choice.id })}>{text(choice.label)}</Button>)}</div>}
        </footer>
      </div>
    </NovelStage>
    <Modal className="novel-log" open={log} title={tr('会話ログ')} onClose={() => setLog(false)}><div className="novel-log__entries">{lines.slice(0, a.line + 1).map((entry, index) => <article key={index}><strong>{name(entry.speaker)}</strong><p>{words(entry)}</p></article>)}</div><Button onClick={() => setLog(false)}>{tr('物語に戻る')}</Button></Modal>
  </>, document.body);
}
