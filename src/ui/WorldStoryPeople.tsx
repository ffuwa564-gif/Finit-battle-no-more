import { UserRound } from 'lucide-react';
import type { Content, GameSave } from '../domain/types';
import { activeWorldIncident, storyActors, storyText } from '../domain/world-story';
import { getLanguage, tr } from '../locales/i18n';
import { Button, PortraitArt } from './index';
export function WorldStoryPeople({ content, save, scale, selected, onSelect }: {
    content: Content;
    save: GameSave;
    scale: number;
    selected?: string;
    onSelect: (id: string) => void;
}) {
    const def = content.worldStory, s = save.worldStory;
    if (!def || !s)
        return null;
    const actors = storyActors(save, def), incident = activeWorldIncident(save, def);
    return <>{actors.map(a => {
            const group = actors.filter(p => p.hub.id === a.hub.id), index = group.indexOf(a), ch = content.characters.find(c => c.id === a.actorId), name = ch ? tr(ch.name) : tr('旅の少女');
            const offset = (index - (group.length - 1) / 2) * 76;
            return <div key={a.actorId} className="world-person-anchor" style={{ left: `${a.hub.x * 100}%`, top: `${a.hub.y * 100}%`, transform: `scale(${1 / scale}) translate(${offset}px,0)` }}><Button variant="icon" className={`world-person${!incident || a.node.optional ? ' is-ambient' : ' is-essential'}${selected === 'actor:' + a.actorId ? ' is-selected' : ''}`} aria-label={name + '：' + storyText(a.node.bubble, s.profile, getLanguage())} onClick={() => onSelect('actor:' + a.actorId)}><span className="world-person__bubble">{storyText(a.node.bubble, s.profile, getLanguage())}</span><span className="world-person__face">{ch ? <PortraitArt character={ch} face/> : <UserRound size={25}/>}</span><small>{name}</small></Button></div>;
        })}</>;
}
