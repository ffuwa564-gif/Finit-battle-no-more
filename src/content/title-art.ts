import type { AssetDef } from '../domain/types';

/** The sky is a title-screen image, not a new canonical ending or completed ritual. */
export const titleArt: AssetDef[] = [
  { id: 'title-character-motion', path: 'video/title-character-packed.mp4', kind: 'video', width: 1440, height: 1280, anchor: '50% 50%', rights: 'Original isolated STILLVEIL character animated with Runway, 2026-10-29. RGB/alpha packed for Safari. Tasks and processing in docs/title-birth.md.' },
  { id: 'title-birth-background', path: 'art/title-birth-background.webp', kind: 'background', width: 1672, height: 941, anchor: '50% 38%', rights: 'Original STILLVEIL birth-sky clean plate, edited from project illustration on 2026-10-29. See docs/title-birth.md.' },
  { id: 'title-birth-character', path: 'art/title-birth-character.webp', kind: 'illustration', width: 1024, height: 1536, anchor: '50% 50%', rights: 'Original isolated STILLVEIL birth-sky character, 2026-10-29. Used for distant silhouettes; the central character has a separate Runway animation. See docs/title-birth.md.' },
  { id: 'title-birth-still', path: 'art/title-birth-still.webp', kind: 'illustration', width: 1672, height: 941, anchor: '50% 38%', rights: 'First composited frame of the STILLVEIL birth-sky title. See docs/title-birth.md.' },
  { id: 'title-wordmark', path: 'art/title-wordmark.png', kind: 'illustration', width: 2172, height: 724, anchor: '50% 50%', rights: 'Original AI-generated STILLVEIL moon-and-star wordmark, 2026-10-29; used as static title typography. See docs/title-birth.md.' },
];
