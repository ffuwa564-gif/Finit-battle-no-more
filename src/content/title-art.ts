import type { AssetDef } from '../domain/types';

/** The sky is a title-screen image, not a new canonical ending or completed ritual. */
export const titleArt: AssetDef[] = [
  { id: 'title-birth-motion', path: 'video/title-birth-loop.mp4', kind: 'video', width: 1280, height: 720, anchor: '50% 38%', rights: 'Original STILLVEIL birth-sky painting animated with Runway, 2026-10-29. See docs/title-birth.md for provenance and loop editing.' },
  { id: 'title-wordmark', path: 'art/title-wordmark.png', kind: 'illustration', width: 2172, height: 724, anchor: '50% 50%', rights: 'Original AI-generated STILLVEIL moon-and-star wordmark, 2026-10-29; used as static title typography. See docs/title-birth.md.' },
];
