import { GameImage } from './GameMedia';
import { tr, localize } from '../locales/i18n';
import type { CSSProperties } from 'react';
import type { CharacterDef } from '../domain/types';
import { assetPath, content } from '../content';
import { AnimatedIllustration } from './AnimatedIllustration';
import { useAnimationSettings } from './animation-settings';
import './portrait-art.css';

/** Face framing is read from the asset registry everywhere a portrait appears. */
export function PortraitArt({ character, face = false }: { character: CharacterDef; face?: boolean }) {
  const { reducedMotion, suspended } = useAnimationSettings();
  const asset = content.assets.find(item => item.id === character.portraitId);
  const anchor = asset?.anchor ?? '50% 22%';
  const style = { objectPosition: anchor, '--portrait-anchor': anchor, '--portrait-zoom': face ? asset?.portraitZoom ?? 1 : 1, '--portrait-origin': asset?.portraitOrigin ?? anchor } as CSSProperties;
  const className = `portrait-art${face ? ' portrait-art--face' : ''}`;
  const lightMotion = character.portraitMotionId ?? character.motionId;
  const motionId = (face && content.assets.find(item => item.id === lightMotion)?.highResolutionId) || lightMotion;
  if (character.motionId) return <span className={className} style={style}>
    <AnimatedIllustration key={motionId} posterId={character.portraitId} motionId={motionId!} alt={tr("")} label={tr(character.name)} reducedMotion={reducedMotion} suspended={suspended} controls={false} />
  </span>;
  return <GameImage className={`portrait-art${face ? ' portrait-art--face' : ''}`} src={assetPath(character.portraitId)} alt={tr("")} loading="lazy" style={style} />;
}
