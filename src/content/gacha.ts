/** Initial collection: stable character keys preserve existing ownership and saves. */
export interface GachaCollection {
  id: string;
  title: string;
  subtitle: string;
  stoneCost: number;
  guaranteeDraw: number;
  rates: { R: number; SR: number; SSR: number };
  featuredIds: readonly [string, string];
}
export const initialGacha: GachaCollection = {
  id: 'goth-izanami',
  title: 'ゴス☆イザナミコレクション',
  subtitle: '神々も、今宵は黒いレースを纏う。',
  stoneCost: 5,
  guaranteeDraw: 2,
  rates: { R: 80, SR: 17, SSR: 3 },
  featuredIds: ['evelyn', 'asteria'],
};
export const goddessArt: Record<string, string> = {
  evelyn: 'gacha-izanami', asteria: 'gacha-amaterasu', iris: 'gacha-uzume', mireille: 'gacha-sakuya',
};
