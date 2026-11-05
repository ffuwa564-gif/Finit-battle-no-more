import { activeWorldIncident } from '../domain/world-story';
import type { Content, GameSave } from '../domain/types';
/** Persistent story changes on the same map; no random incidents or timed failures. */
export function WorldStoryLandscape({ save, content }: {
    save: GameSave;
    content: Content;
}) {
    const s = save.worldStory;
    if (!s)
        return null;
    const has = (id: string) => s.completed.includes(id), past = (n: number) => s.carriedChapters.includes(n);
    const roots = has('c3-record') && !has('c3-morning') && !past(3), forest = Boolean(content.worldStory && activeWorldIncident(save, content.worldStory)?.id === 'forest-ambush'), bridge = has('c5-request') && !has('c5-finish') && !past(5), festival = (has('c6-invite') || past(6)) && !has('c6-breakfast') && !past(6), morning = has('c3-morning') || past(3);
    return <svg className="world-story-landscape" viewBox="0 0 1200 1800" aria-hidden="true" data-roots={roots} data-carriage-stopped={bridge} data-festival={festival} data-morning={morning}>
 {morning && <ellipse className="world-story-landscape__dawn" cx="620" cy="430" rx="430" ry="180"/>}
 {roots && <g className="world-story-landscape__roots"><path d="M 876 1080 Q 600 1000 324 990 Q 370 850 300 702 M 600 1000 Q 700 800 924 738 M 324 990 Q 400 1200 432 1278"/><path d="M 876 1095 Q 680 900 520 910 Q 410 800 300 702"/></g>}
 {forest && <ellipse className="world-story-landscape__border" cx="288" cy="1152" rx="180" ry="110"/>}
 {bridge && <g className="world-story-landscape__carriage"><path d="M 483 872 h90 v35 h-90 z M 500 858 h52 v14 h-52 z"/><circle cx="500" cy="914" r="8"/><circle cx="555" cy="914" r="8"/><path className="world-story-landscape__barrier" d="M 466 843 L 596 938 M 596 843 L 466 938"/></g>}
 {festival && <g className="world-story-landscape__lanterns">{Array.from({ length: 12 }, (_, i) => <circle key={i} cx={650 + i % 4 * 65} cy={1280 + Math.floor(i / 4) * 54} r="9"/>)}</g>}
 {has('c5-finish') || past(5) ? <circle className="world-story-landscape__home" cx={s.choices['c5-address'] === 'infirmary' ? 324 : 636} cy={s.choices['c5-address'] === 'infirmary' ? 990 : 1170} r="24"/> : null}
 {has('c7-together') && <circle className={`world-story-landscape__garden ${s.choices['c7-together'] === 'prepare' ? 'is-prepared' : ''}`} cx="624" cy="306" r="64"/>}
 </svg>;
}
