import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type Key } from 'react';
import { assetPath } from '../content';
import './notice-surface.css';

/** Keep the last notice mounted briefly so dismissal can fade out. */
export function NoticeSurface({ className = '', tone = 'info', style, present = true, noticeKey, children, ...props }: HTMLAttributes<HTMLDivElement> & { tone?: 'info' | 'success' | 'error'; present?: boolean; noticeKey?: Key }) {
  const [retained, setRetained] = useState(present);
  const last = useRef({ children, noticeKey, tone, className });
  if (present) last.current = { children, noticeKey, tone, className };
  useEffect(() => {
    if (present) { setRetained(true); return; }
    const timer = setTimeout(() => setRetained(false), 200);
    return () => clearTimeout(timer);
  }, [present]);
  if (!present && !retained) return null;
  return <div {...props} key={last.current.noticeKey} aria-hidden={!present || undefined} inert={!present || undefined} className={`notice-surface notice-surface--${last.current.tone} ${last.current.className}${present ? '' : ' is-leaving'}`} style={{ '--notice-art': `url("${new URL(assetPath('notice-moonlight'), document.baseURI).href}")`, ...style } as CSSProperties}>{last.current.children}</div>;
}
