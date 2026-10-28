import type { AssetDef } from '../domain/types';

/** Original Runway-painted frame and harvest pieces. Alpha cleanup and resize only. */
export const livingGardenArt: AssetDef[] = [
  { id: 'living-garden-frame', path: 'art/living-garden-frame.webp', kind: 'illustration', width: 768, height: 1024, anchor: '50% 50%', rights: 'Original AI-generated artwork for STILLVEIL. Frame painted in Runway; transparency refined with an image model. See docs/living-garden.md.' },
  { id: 'living-garden-healing', path: 'art/living-garden-healing.webp', kind: 'icon', width: 256, height: 256, anchor: '50% 50%', rights: 'Original AI-generated artwork for STILLVEIL, generated and isolated in Runway. See docs/living-garden.md.' },
  { id: 'living-garden-crystal', path: 'art/living-garden-crystal.webp', kind: 'icon', width: 256, height: 256, anchor: '50% 50%', rights: 'Original AI-generated artwork for STILLVEIL, generated and isolated in Runway. See docs/living-garden.md.' },
];
