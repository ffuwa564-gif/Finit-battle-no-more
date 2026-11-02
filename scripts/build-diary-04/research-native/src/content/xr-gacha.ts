import type { XRGachaDef } from '../domain/types';
import { sharedGoddessIds, sharedSSRIds } from './gacha';

/** Future banner: the XR roster is ready, but premium summons and stone income remain locked. */
export const xrGacha: XRGachaDef = {
  id: 'astral-xr', title: '星晶の祈願', published: false, unlockChapter: 10, stoneCost: 1,
  characterIds: [...sharedGoddessIds, ...sharedSSRIds, 'astraea'],
  rates: { R: 70, SR: 25, SSR: 4.9, XR: 0.1 },
  duplicateRefund: { R: 0, SR: 0, SSR: 0, XR: 1 },
};
