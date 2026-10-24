import type { CSSProperties, HTMLAttributes } from 'react';
import { assetPath } from '../content';
import './notice-surface.css';

/** Generated silver frame shared by skill, dialogue and application notifications. */
export function NoticeSurface({ className = '', tone = 'info', style, ...props }: HTMLAttributes<HTMLDivElement> & { tone?: 'info' | 'success' | 'error' }) {
  return <div {...props} className={`notice-surface notice-surface--${tone} ${className}`} style={{ '--notice-art': `url("${new URL(assetPath('notice-moonlight'), document.baseURI).href}")`, ...style } as CSSProperties} />;
}
