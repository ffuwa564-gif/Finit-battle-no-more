import type { CharacterDef } from '../domain/types';
import { assetPath } from '../content';
import { AnimatedIllustration } from './AnimatedIllustration';
import './character-artwork.css';

/** One data-driven full-art boundary for previews, summons and character details. */
export function CharacterArtwork({ character, reducedMotion, suspended = false, className = '' }: {
  character: CharacterDef; reducedMotion: boolean; suspended?: boolean; className?: string;
}) {
  return <div className={`character-artwork ${className}`}>
    {character.motionId
      ? <AnimatedIllustration posterId={character.artId} motionId={character.motionId} alt={character.name} label={character.name} reducedMotion={reducedMotion} suspended={suspended} />
      : <img className="character-artwork__still" src={assetPath(character.artId)} alt={character.name} loading="lazy" />}
  </div>;
}
