import type { CSSProperties } from 'react';
import { assetPath, characterById, content } from '../content';
import { ultimateFor } from '../domain/ultimates';
import type { BattleEvent, Unit } from '../domain/types';
import { tr } from '../locales/i18n';
import './ultimates.css';

/** Uses the character's existing illustration; no extra video decoder or new asset. */
export function UltimateCutIn({ event, units, reducedMotion }: { event?: BattleEvent; units: Unit[]; reducedMotion: boolean }) {
  if (!event?.ultimate) return null;
  const actor = units.find(unit => unit.uid === event.actorId);
  if (!actor) return null;
  const character = characterById(actor.characterId);
  const special = ultimateFor(character);
  const anchor = content.assets.find(asset => asset.id === character.artId)?.anchor ?? '50% 0%';
  return <div key={event.id} className={`ultimate-cinematic ultimate-cinematic--${special.theme}${reducedMotion ? ' ultimate-cinematic--reduced' : ''}`} aria-label={tr(`${character.name}の必殺技：${special.name}`)} role="status">
    <div className="ultimate-cinematic__rays" aria-hidden="true" />
    <div className="ultimate-cinematic__sigil" aria-hidden="true"><span>✦</span></div>
    <div className="ultimate-cinematic__portrait" aria-hidden="true"><img src={assetPath(character.artId)} style={{ objectPosition: anchor } as CSSProperties} alt="" /></div>
    <div className="ultimate-cinematic__title"><small>ULTIMATE</small><span>{tr(character.name)}</span><strong>{tr(special.name)}</strong></div>
    <div className="ultimate-cinematic__impact" aria-hidden="true"><i /><i /><i /><span>✦</span></div>
    <div className="ultimate-cinematic__finish" aria-hidden="true">{tr(special.name)}</div>
  </div>;
}
