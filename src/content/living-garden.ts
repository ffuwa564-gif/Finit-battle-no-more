import type { AssetDef } from '../domain/types';

/** Actual Runway footage, alpha-matted in Runway and exported for native mobile playback. */
const rights = 'Original AI-generated artwork and animation for STILLVEIL, generated and isolated in Runway. See docs/living-garden.md.';
export const livingGardenArt: AssetDef[] = [
  { id: 'living-garden-frame', path: 'art/living-garden-frame.webp', kind: 'illustration', width: 384, height: 512, anchor: '50% 50%', rights },
  { id: 'living-garden-idle-motion', path: 'art/living-garden-idle-motion.webp', kind: 'illustration', width: 384, height: 512, anchor: '50% 50%', rights },
  { id: 'living-garden-bloom-motion', path: 'art/living-garden-bloom-motion.webp', kind: 'illustration', width: 384, height: 512, anchor: '50% 50%', rights },
  { id: 'living-garden-bloom-poster', path: 'art/living-garden-bloom-poster.webp', kind: 'illustration', width: 384, height: 512, anchor: '50% 50%', rights },
];
