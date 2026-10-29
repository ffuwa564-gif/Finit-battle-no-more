import type { AssetDef } from '../domain/types';

/** The sky is a title-screen image, not a new canonical ending or completed ritual. */
export const titleArt: AssetDef[] = [
  { id: 'title-birth-background', path: 'art/title-birth-background.webp', kind: 'background', width: 1672, height: 941, anchor: '50% 38%', rights: 'Original STILLVEIL birth-sky clean plate, edited from project illustration on 2026-10-29. See docs/title-birth.md.' },
  { id: 'title-birth-character', path: 'art/title-birth-character.webp', kind: 'illustration', width: 1024, height: 1536, anchor: '50% 50%', rights: 'Original isolated STILLVEIL birth-sky character, 2026-10-29. Runtime 2D mesh keeps the head fixed. See docs/title-birth.md.' },
  { id: 'title-birth-still', path: 'art/title-birth-still.webp', kind: 'illustration', width: 1672, height: 941, anchor: '50% 38%', rights: 'Static frame of the authored STILLVEIL title rig at rest. See docs/title-birth.md.' },
  { id: 'title-wordmark', path: 'art/title-wordmark.png', kind: 'illustration', width: 2172, height: 724, anchor: '50% 50%', rights: 'Original AI-generated STILLVEIL moon-and-star wordmark, 2026-10-29; used as static title typography. See docs/title-birth.md.' },
];
