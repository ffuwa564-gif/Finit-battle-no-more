import { useEffect, useRef } from 'react';
import { BellRing, ChevronRight, Heart } from 'lucide-react';
import type { Content, GameSave, GameCommand } from '../domain/types';
import { activeWorldIncident, storyText } from '../domain/world-story';
import { getLanguage, tr, useLanguage } from '../locales/i18n';
import { playSound } from '../platform/audio';
import { Button, Modal } from './index';
import { WorldObjectiveDock } from './WorldObjectiveDock';
export function WorldIncidentBanner({ save, content, onOpen }: {
    save: GameSave;
    content: Content;
    onOpen: () => void;
}) {
    useLanguage();
    if (!save.worldStory || !content.worldStory)
        return null;
    const incident = activeWorldIncident(save, content.worldStory), text = (v: Parameters<typeof storyText>[0]) => storyText(v, save.worldStory!.profile, getLanguage());
    return <WorldObjectiveDock location="home" incident={Boolean(incident)}>{close => <Button variant="secondary" className={`home-world-story${incident ? ' is-incident' : ''}`} onClick={() => { close(); onOpen(); }}><span>{incident ? <BellRing size={20}/> : <Heart size={20}/>}</span><span><small>{tr(incident ? '事件発生' : '街の日常')}</small><strong>{incident ? text(incident.title) : tr('{0}、今日は誰に会いに行く？').replace('{0}', save.worldStory!.profile.name)}</strong></span><ChevronRight size={16}/></Button>}</WorldObjectiveDock>;
}
export function WorldIncidentNotice({ save, content, busy, command, onOpen }: {
    save: GameSave;
    content: Content;
    busy: boolean;
    command: (c: GameCommand) => Promise<boolean>;
    onOpen: () => void;
}) {
    useLanguage();
    const incident = content.worldStory ? activeWorldIncident(save, content.worldStory) : undefined;
    const open = Boolean(incident && !save.worldStory?.notified?.includes(incident.id) && !save.battle && !save.novels?.active && !save.worldStory?.active);
    const sounded = useRef<string | undefined>(undefined);
    useEffect(() => { if (!open || !incident || sounded.current === incident.id)
        return; sounded.current = incident.id; if (save.settings.seVolume > 0)
        playSound('error'); }, [open, incident?.id]);
    if (!incident || !save.worldStory)
        return null;
    const text = (v: Parameters<typeof storyText>[0]) => storyText(v, save.worldStory!.profile, getLanguage());
    const acknowledge = async (go: boolean) => { if (await command({ type: 'worldIncidentNotice', incidentId: incident.id })) {
        if (go)
            onOpen();
    } };
    return <Modal open={open} title={tr('事件発生')} className="world-incident-notice" onClose={() => { if (!busy)
        void acknowledge(false); }}><div role="alert"><BellRing size={27}/><h3>{text(incident.title)}</h3><p>{text(incident.message)}</p></div><Button disabled={busy} onClick={() => acknowledge(true)}>{tr('地図で状況を見る')}<ChevronRight size={16}/></Button><Button variant="secondary" disabled={busy} onClick={() => acknowledge(false)}>{tr('あとで向かう')}</Button></Modal>;
}
