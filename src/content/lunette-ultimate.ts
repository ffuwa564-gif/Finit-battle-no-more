import type { AssetDef } from '../domain/types';

/** The same original transparent robot artwork used in Lunette's character PV. */
export const lunetteUltimateArt: AssetDef[] = [1, 2, 3, 4].map(index => ({
  id: `lunette-bit-${index}`, path: `art/lunette-bit-${index}.png`, kind: 'illustration',
  width: 611, height: index <= 2 ? 655 : 632, anchor: '50% 50%',
  rights: 'Original AI-generated mechanical rabbit for STILLVEIL, derived from the project Lunette artwork. Previously used in the Lunette PV; provenance in docs/lunette-ultimate.md.',
}));

lunetteUltimateArt.push(...['body','key'].map(part=>({
  id:`lunette-command-${part}`,path:`art/lunette-command-${part}.png`,kind:'illustration' as const,
  width:1024,height:1536,anchor:'50% 0%',
  rights:'Original STILLVEIL awakened Lunette illustration, exact-pixel transparent cutout made for the character PV; separated body and winding key, no third-party assets.',
})));
