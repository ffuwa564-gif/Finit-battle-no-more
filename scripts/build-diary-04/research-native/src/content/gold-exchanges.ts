import type { GoldExchangeDef } from '../domain/types';

/** Permanent, one-time character ownership exchanges. Prices are never supplied by the client command. */
export const goldExchanges: GoldExchangeDef[] = [
  { id: 'fortuna-gold', characterId: 'fortuna', goldCost: 50_000, published: true },
];
export const goldExchangeArt: Record<string, string> = { fortuna: 'gold-fortuna' };
