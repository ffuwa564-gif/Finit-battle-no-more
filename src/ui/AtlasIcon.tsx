import type { CSSProperties } from 'react';
import { assetPath } from '../content';
import './atlas-icon.css';

/** Render one cell from a generated 3×2 atlas without modifying the source artwork. */
export function AtlasIcon({ asset, frame, className = '' }: { asset: 'menu-atlas' | 'command-atlas' | 'menu-logos' | 'control-frames'; frame: 0 | 1 | 2 | 3 | 4 | 5; className?: string }) {
  // The generated controls are hand placed: sample their actual bounds, keeping every rim intact.
  const controlStyle = asset === 'control-frames' ? {
    backgroundSize: `${1536 / 464 * 100}% ${1024 / 464 * 100}%`,
    backgroundPosition: `${[45, 535, 1027][frame % 3] / (1536 - 464) * 100}% ${(frame < 3 ? 27 : 499) / (1024 - 464) * 100}%`,
    clipPath: 'circle(49.5% at 50% 50%)',
  } : {};
  const style = { backgroundImage: `url("${assetPath(asset)}")`, backgroundPosition: `${frame % 3 * 50}% ${frame < 3 ? 0 : 100}%`, backgroundSize: '300% 200%', backgroundRepeat: 'no-repeat', ...controlStyle } as CSSProperties;
  return <span className={`atlas-icon ${className}`} style={style} aria-hidden="true" />;
}
