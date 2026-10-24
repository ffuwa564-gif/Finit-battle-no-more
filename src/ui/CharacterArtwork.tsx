import { tr } from '../locales/i18n';
import type { CSSProperties } from 'react';
import type { CharacterDef } from '../domain/types';
import { assetPath, content } from '../content';
import { AnimatedIllustration } from './AnimatedIllustration';
import './character-artwork.css';

/** One data-driven full-art boundary for previews, summons and character details. */
export function CharacterArtwork({ character, reducedMotion, suspended = false, className = '' }: {
  character: CharacterDef; reducedMotion: boolean; suspended?: boolean; className?: string;
}) {
  const anchor = content.assets.find(asset => asset.id === character.artId)?.anchor ?? '50% 22%';
  return <div className={`character-artwork ${className}`} style={{ '--character-art-anchor': anchor } as CSSProperties}>
    {character.motionId
      ? <AnimatedIllustration posterId={character.artId} motionId={character.motionId} alt={tr(character.name)} label={tr(character.name)} reducedMotion={reducedMotion} suspended={suspended} />
      : <img className="character-artwork__still" src={assetPath(character.artId)} alt={tr(character.name)} loading="lazy" />}

  </div>;
}
