import type { AssetDef } from '../domain/types';

/** The same original transparent robot artwork used in Lunette's character PV. */
export const lunetteUltimateArt: AssetDef[] = [1, 2, 3, 4].map(index => ({
  id: `lunette-bit-${index}`, path: `art/lunette-bit-${index}.png`, kind: 'illustration',
  width: 611, height: index <= 2 ? 655 : 632, anchor: '50% 50%',
  rights: 'Original AI-generated mechanical rabbit for STILLVEIL, derived from the project Lunette artwork. Previously used in the Lunette PV; provenance in docs/lunette-ultimate.md.',
}));
