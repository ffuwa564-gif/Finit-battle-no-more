import type { AssetDef } from '../domain/types';

/** User-approved three-piece composition; old full-frame bloom footage is intentionally excluded. */
const rights = 'Original AI-generated project art and Runway animation for STILLVEIL. Fixed original frame geometry with a newly generated light pass; separately generated bud-to-bloom flower and crystal. See docs/living-garden.md.';
export const livingGardenArt: AssetDef[] = [
  { id: 'living-garden-frame', path: 'art/living-garden/frame-poster.png', kind: 'illustration', width: 720, height: 960, anchor: '50% 50%', rights },
  { id: 'living-garden-idle-motion', path: 'art/living-garden/frame-circulating-light.webp', kind: 'illustration', width: 720, height: 960, anchor: '50% 50%', rights },
  { id: 'living-garden-bud', path: 'art/living-garden/flower-bud-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights },
  { id: 'living-garden-bloom-motion', path: 'art/living-garden/flower-bud-bloom.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights },
  { id: 'living-garden-bloom-poster', path: 'art/living-garden/flower-open-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights },
  { id: 'living-garden-crystal', path: 'art/living-garden/crystal-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights },
  { id: 'living-garden-crystal-motion', path: 'art/living-garden/crystal-motion.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights },
];
