import type { CSSProperties } from 'react';
import type { CharacterDef } from '../domain/types';
import { assetPath, content } from '../content';
import './portrait-art.css';

/** Face framing is read from the asset registry everywhere a portrait appears. */
export function PortraitArt({ character, face = false }: { character: CharacterDef; face?: boolean }) {
  const asset = content.assets.find(item => item.id === character.portraitId);
  const anchor = asset?.anchor ?? '50% 22%';
  const style = { objectPosition: anchor, '--portrait-zoom': face ? asset?.portraitZoom ?? 1 : 1, '--portrait-origin': asset?.portraitOrigin ?? anchor } as CSSProperties;
  return <img className={`portrait-art${face ? ' portrait-art--face' : ''}`} src={assetPath(character.portraitId)} alt="" loading="lazy" style={style} />;
}
