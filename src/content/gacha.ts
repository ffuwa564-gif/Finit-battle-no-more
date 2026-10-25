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
  characterIds: readonly string[];
  label: string;
}
export const initialGacha: GachaCollection = {
  id: 'goth-izanami',
  label: 'GOTHIC GODDESSES · VOL.01',
  characterIds: ['iris', 'mireille', 'asteria', 'evelyn', 'toyotama', 'wakahirume', 'iwanagahime', 'kukurihime', 'seoritsu', 'ukanomitama', 'mizuhanome', 'haniyasu'],
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
/** Both collections share account-wide introductory guarantee and SSR pity. */
export const flowerGacha: GachaCollection = {
  ...initialGacha,
  id: 'wa-flower-banquet',
  label: 'DIVINE ATTIRE · VOL.02',
  title: '神々の装い ― 和の花宴 ―',
  subtitle: '遠き地の女神たちが、自ら選んだ晴れ着で月下の花宴へ。',
  featuredIds: ['selene', 'athena'],
  characterIds: ['selene', 'athena', 'flora', 'rainbow-iris', 'eos', 'nike', 'artemis', 'persephone', 'hestia', 'hebe'],
  rates: { R: 80, SR: 17, SSR: 3 },
};
export const gachaCollections = [flowerGacha, initialGacha] as const;
/** Base forms are available in every collection; costume IDs above stay collection-exclusive. */
export const sharedGoddessIds: readonly string[] = ['selene-standard', 'athena-standard', 'flora-standard', 'amaterasu-standard', 'izanami-standard'];
export function gachaPoolIds(collection: GachaCollection): readonly string[] {
  return [...collection.characterIds, ...sharedGoddessIds];
}

export function introductoryGuarantee(save: Pick<GameSave, 'drawCount'>): boolean {
  return save.drawCount + 1 === initialGacha.guaranteeDraw;
}
export const goddessArt: Record<string, string> = {
  ...Object.fromEntries(sharedGoddessIds.map(id => [id, `gacha-${id}`])),
  artemis: 'gacha-artemis', persephone: 'gacha-persephone', hestia: 'gacha-hestia', hebe: 'gacha-hebe',
  eos: 'gacha-eos-anime', nike: 'gacha-nike-anime',
  selene: 'gacha-selene', athena: 'gacha-athena-anime', flora: 'gacha-flora-anime', 'rainbow-iris': 'gacha-rainbow-iris-anime',
  seoritsu: 'gacha-seoritsu', ukanomitama: 'gacha-ukanomitama', mizuhanome: 'gacha-mizuhanome', haniyasu: 'gacha-haniyasu',
  toyotama: 'gacha-toyotama', wakahirume: 'gacha-wakahirume', iwanagahime: 'gacha-iwanagahime', kukurihime: 'gacha-kukurihime',
  evelyn: 'gacha-izanami', asteria: 'gacha-amaterasu', iris: 'gacha-uzume', mireille: 'gacha-sakuya',
};

/** Old saves have at most four unique draws; retained summon history preserves their streak. */
export function gachaPity(save: Pick<GameSave, 'ssrPity' | 'history' | 'drawCount'>): number {
  if (save.ssrPity !== undefined) return save.ssrPity;
  const draws = save.history.filter(entry => entry.text.startsWith('召喚：'));
  const lastSSR = draws.findIndex(entry => entry.text.startsWith('召喚：SSR '));
  return Math.min(lastSSR >= 0 ? lastSSR : save.drawCount, initialGacha.hardPity - 1);
}
export function gachaSSRRate(pity: number, collection = initialGacha): number {
  return Math.min(100, collection.rates.SSR + Math.max(0, pity + 1 - collection.softPityStart + 1) * 6);
}


/** New full-body paintings place the face near the top of the source image. */
export const goddessPortraitFocus: Record<string, { anchor: string; zoom: number; origin: string }> = Object.fromEntries(
  ['artemis', 'persephone', 'hestia', 'hebe', 'seoritsu', 'ukanomitama', 'mizuhanome', 'haniyasu', 'toyotama', 'wakahirume', 'iwanagahime', 'kukurihime', 'selene', 'athena', 'flora', 'rainbow-iris', 'eos', 'nike'].map(id => [id, { anchor: '50% 0%', zoom: 2.6, origin: '50% 0%' }]),
);
