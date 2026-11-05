import { useState } from 'react';
import { BookOpen, ChevronRight, Heart, UserRound } from 'lucide-react';
import type { Content, GameSave, GameCommand } from '../domain/types';
import { activeWorldIncident, defaultHero, storyChapter, storyNext, storyText, type HeroProfile } from '../domain/world-story';
import { getLanguage, tr, useLanguage } from '../locales/i18n';
import { Button, Modal } from './index';
import { WorldObjectiveDock } from './WorldObjectiveDock';
export function WorldStoryControls({ save, content, busy, command, onFocus }: {
    save: GameSave;
    content: Content;
    busy: boolean;
    command: (c: GameCommand) => Promise<boolean>;
    onFocus: (id: string) => void;
}) {
    useLanguage();
    const [profileOpen, setProfileOpen] = useState(false), [journal, setJournal] = useState(false), [profile, setProfile] = useState<HeroProfile>(() => save.worldStory?.profile ?? { ...defaultHero, name: getLanguage() === 'en' ? 'Yui' : defaultHero.name });
    const def = content.worldStory;
    if (!def)
        return null;
    const s = save.worldStory, c = s && storyChapter(s, def), next = storyNext(save, def), text = (v: Parameters<typeof storyText>[0]) => storyText(v, s?.profile ?? profile, getLanguage());
    const incident = activeWorldIncident(save, def);
    const focus = () => { if (!s) {
        setProfileOpen(true);
        return;
    } if (next?.node)
        onFocus('actor:' + next.node.actorId);
    else if (next?.dungeonId)
        onFocus(next.dungeonId);
    else
        setJournal(true); };
    async function start(from: 'current' | 'beginning') { const ok = await command({ type: 'worldStoryBegin', profile, from }); if (ok) {
        setProfileOpen(false);
        onFocus('actor:liora');
    } }
    return <><WorldObjectiveDock location="map" incident={Boolean(incident)}>{close => <aside className={`world-story-objective${incident ? ' is-incident' : ''}`}><Button className="world-story-objective__main" variant="secondary" onClick={() => { close(); focus(); }}><small>{incident ? tr('事件発生') : tr(s ? '街の日常' : 'あなたの旅')}</small><strong>{incident ? text(incident.title) : tr(s ? '今日は、誰に会おう' : '少女たちと旅を始める')}</strong><span>{next?.node ? text(next.node.bubble) : next?.dungeonId ? tr(content.dungeons.find(d => d.id === next.dungeonId)!.name) : tr(s ? '街の仲間に声をかける' : '主人公の名前を教える')}<ChevronRight size={13}/></span></Button><div><Button variant="icon" aria-label={tr('主人公の設定')} onClick={() => { close(); setProfile(s?.profile ?? profile); setProfileOpen(true); }}><UserRound size={15}/></Button>{s && <Button variant="icon" aria-label={tr('旅の記録')} onClick={() => { close(); setJournal(true); }}><BookOpen size={15}/></Button>}</div></aside>}</WorldObjectiveDock>
 <Modal open={profileOpen} title={tr('主人公の設定')} onClose={() => setProfileOpen(false)}><form className="world-hero-profile" onSubmit={e => { e.preventDefault(); if (s)
        void command({ type: 'worldProfile', profile }).then(ok => { if (ok)
            setProfileOpen(false); });
    else
        void start('current'); }}><label>{tr('名前')}<input maxLength={12} required value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}/></label><label>{tr('話し方')}<select value={profile.voice} onChange={e => setProfile({ ...profile, voice: e.target.value as HeroProfile['voice'] })}><option value="soft">{tr('控えめ')}</option><option value="honest">{tr('素直')}</option><option value="dreamy">{tr('少しぼんやり')}</option></select></label><label>{tr('好きなもの')}<select value={profile.favorite} onChange={e => setProfile({ ...profile, favorite: e.target.value as HeroProfile['favorite'] })}><option value="tea">{tr('甘いお茶')}</option><option value="flowers">{tr('花')}</option><option value="animals">{tr('動物')}</option></select></label><Button type="submit" disabled={busy}>{tr(s ? '保存する' : '今の旅から始める')}<Heart size={15}/></Button>{!s && save.completedDungeonIds.length > 0 && <Button type="button" variant="secondary" disabled={busy} onClick={() => start('beginning')}>{tr('第1章から会話を辿る')}</Button>}</form></Modal>
 <Modal open={journal} title={tr('旅の記録')} onClose={() => setJournal(false)}><div className="world-story-journal">{s && def.chapters.map(ch => <section key={ch.number}><h3>{tr('第{0}章').replace('{0}', String(ch.number))} · {tr(content.chapters!.find(c => c.id === ch.chapterId)!.title)}</h3><p>{text(ch.objective)}</p>{s.carriedChapters.includes(ch.number) ? <small>{tr('これまでの探索から引き継ぎ')}</small> : def.nodes.filter(n => n.chapter === ch.number && s.completed.includes(n.id)).map(n => <Button variant="secondary" key={n.id} disabled={busy} onClick={async () => { if (await command({ type: 'worldTalk', nodeId: n.id }))
        setJournal(false); }}>{text(n.title)}<BookOpen size={14}/></Button>)}</section>)}</div></Modal></>;
}
