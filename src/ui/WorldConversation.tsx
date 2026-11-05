import { BookOpen, MessageCircle, UserRound } from 'lucide-react';
import { assetPath } from '../content';
import { getLanguage, tr, useLanguage } from '../locales/i18n';
import { nodeLines, storyText, worldStorySupportingSpeakers } from '../domain/world-story';
import type { Content, GameSave, GameCommand } from '../domain/types';
import { Button, GameImage, Modal, PortraitArt } from './index';
import './world-story.css';
export function WorldConversation({ save, content, busy, command }: {
    save: GameSave;
    content: Content;
    busy: boolean;
    command: (c: GameCommand) => Promise<boolean>;
}) {
    useLanguage();
    const s = save.worldStory, a = s?.active, node = content.worldStory?.nodes.find(n => n.id === a?.nodeId);
    if (!s || !a || !node)
        return null;
    const speakerName = (id: string) => id === 'hero' ? s.profile.name : tr(content.characters.find(c => c.id === id)?.name ?? worldStorySupportingSpeakers[id] ?? '語り');
    const lines = nodeLines(node, s), line = lines[a.line], speaker = speakerName(line.speaker);
    const current = line.speaker === 'hero' ? line.voices?.[s.profile.voice] ?? line.favorites?.[s.profile.favorite] ?? line.text : line.favorites?.[s.profile.favorite] ?? line.text;
    const text = (v: Parameters<typeof storyText>[0]) => storyText(v, s.profile, getLanguage());
    const choosing = Boolean(node.choices?.length && !a.choiceId && a.line === node.lines.length - 1 && !a.replay), last = a.line === lines.length - 1;
    return <Modal open title={text(node.title)} className="world-conversation" onClose={() => { if (!busy)
        void command({ type: 'worldTalkClose' }); }}>
  <div className="world-conversation__cast">{[...new Set(lines.map(l => l.speaker).filter(id => !['hero', 'narration'].includes(id)))].map(id => { const ch = content.characters.find(c => c.id === id); return <div key={id} className={line.speaker === id ? 'is-speaking' : ''}><span className="world-conversation__portrait">{ch ? <PortraitArt character={ch} face/> : <UserRound size={25}/>}</span><small>{speakerName(id)}</small></div>; })}<div className={line.speaker === 'hero' ? 'is-speaking' : ''}><span className="world-conversation__portrait"><GameImage src={assetPath('app-icon')} alt=""/></span><small>{s.profile.name}</small></div></div>
  <div className="world-conversation__line" aria-live="polite" data-world-node={node.id} data-world-line={a.line}><strong>{speaker}</strong><p>{text(current)}</p></div>
  <footer>{choosing ? <div className="world-conversation__choices">{node.choices!.map(c => <Button key={c.id} disabled={busy} variant="secondary" onClick={() => command({ type: 'worldTalkChoice', choiceId: c.id })}>{text(c.label)}</Button>)}</div> : <Button disabled={busy} onClick={() => command({ type: last ? 'worldTalkFinish' : 'worldTalkNext' })}>{last ? tr('地図へ戻る') : tr('次の台詞')}<MessageCircle size={15}/></Button>}<small>{a.replay ? <BookOpen size={13}/> : null}{a.line + 1} / {lines.length}</small></footer>
 </Modal>;
}
