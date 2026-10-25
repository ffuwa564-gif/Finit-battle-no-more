import type { XRGachaDef } from '../domain/types';
import { sharedGoddessIds, sharedSSRIds } from './gacha';

/** Future banner: no premium-stone income or XR roster is released yet. */
export const xrGacha: XRGachaDef = {
  id: 'astral-xr', title: '星晶の祈願', published: false, unlockChapter: 10, stoneCost: 1,
  characterIds: [...sharedGoddessIds, ...sharedSSRIds],
  rates: { R: 70, SR: 25, SSR: 4.9, XR: 0.1 },
  duplicateRefund: { R: 0, SR: 0, SSR: 0, XR: 1 },
};
