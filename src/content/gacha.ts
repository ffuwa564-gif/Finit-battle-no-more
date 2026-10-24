import type { GameSave } from '../domain/types';

/** Initial collection: stable character keys preserve existing ownership and saves. */
export interface GachaCollection {
  id: string;
  title: string;
  subtitle: string;
  stoneCost: number;
  guaranteeDraw: number;
  hardPity: number;
  softPityStart: number;
  duplicateRefund: { R: number; SR: number; SSR: number };
  rates: { R: number; SR: number; SSR: number };
  featuredIds: readonly [string, string];
}
export const initialGacha: GachaCollection = {
  id: 'goth-izanami',
  title: 'ゴス☆イザナミコレクション',
  subtitle: '神々も、今宵は黒いレースを纏う。',
  stoneCost: 5,
  guaranteeDraw: 2,
  hardPity: 90,
  softPityStart: 74,
  duplicateRefund: { R: 1, SR: 2, SSR: 3 },
  rates: { R: 80, SR: 17, SSR: 3 },
  featuredIds: ['evelyn', 'asteria'],
};
export const goddessArt: Record<string, string> = {
  evelyn: 'gacha-izanami', asteria: 'gacha-amaterasu', iris: 'gacha-uzume', mireille: 'gacha-sakuya',
};

/** Old saves have at most four unique draws; retained summon history preserves their streak. */
export function gachaPity(save: Pick<GameSave, 'ssrPity' | 'history' | 'drawCount'>): number {
  if (save.ssrPity !== undefined) return save.ssrPity;
  const draws = save.history.filter(entry => entry.text.startsWith('召喚：'));
  const lastSSR = draws.findIndex(entry => entry.text.startsWith('召喚：SSR '));
  return Math.min(lastSSR >= 0 ? lastSSR : save.drawCount, initialGacha.hardPity - 1);
}
export function gachaSSRRate(pity: number): number {
  return Math.min(100, initialGacha.rates.SSR + Math.max(0, pity + 1 - initialGacha.softPityStart + 1) * 6);
}
