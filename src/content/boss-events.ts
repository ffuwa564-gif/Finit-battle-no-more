import type { DungeonDef, EventDef } from '../domain/types';

export const kuzuhaEvent: EventDef = {
  id: 'evening-nine-tails', name: '宵宮に咲く九尾', subtitle: '願いを預けるなら、わたくしの傍へ。', published: true,
  familyId: 'kuzuha', normalId: 'kuzuha', awakenedId: 'kuzuha-awakened', materialSpeciesId: 'kuzuha-contract', entryDungeonId: 'silent-cathedral',
  fragment: { id: 'kuzuha-contract:rare', name: '契りの欠片' }, core: { id: 'kuzuha-contract:epic', name: '覚醒核' },
  normalCost: { materialId: 'kuzuha-contract:rare', count: 30 }, awakenedCost: { materialId: 'kuzuha-contract:epic', count: 5 },
  dungeonIds: ['kuzuha-beginner', 'kuzuha-intermediate', 'kuzuha-advanced', 'kuzuha-expert', 'kuzuha-awakening'],
};
const mobs = (ids: string[]) => ids.map(characterId => ({ characterId }));
const tiers = [
  { name: '初級', hp: 120, attack: 60, amount: 1, waves: [['pale-wolf']] },
  { name: '中級', hp: 250, attack: 90, amount: 2, waves: [['pale-wolf', 'moon-moth'], ['thorn-witch', 'hollow-keeper']] },
  { name: '上級', hp: 400, attack: 120, amount: 3, waves: [['moon-moth', 'thorn-witch', 'hollow-keeper'], ['pale-wolf', 'veil-priestess', 'thorn-witch']] },
  { name: '超級', hp: 650, attack: 160, amount: 5, waves: [['moon-moth', 'thorn-witch', 'pale-wolf'], ['hollow-keeper', 'veil-priestess', 'pale-wolf'], ['thorn-witch', 'moon-moth', 'pale-wolf']] },
  { name: '覚醒級', hp: 700, attack: 120, amount: 1, waves: [['pale-wolf', 'thorn-witch', 'moon-moth'], ['hollow-keeper', 'veil-priestess', 'pale-wolf'], ['thorn-witch', 'thorn-witch', 'moon-moth'], ['veil-priestess', 'pale-wolf', 'moon-moth']] },
];
export const eventDungeons: DungeonDef[] = tiers.map((tier, i) => ({
  id: kuzuhaEvent.dungeonIds[i]!, kind: 'event', name: `${kuzuhaEvent.name}・${tier.name}`, tierName: tier.name,
  subtitle: i === 4 ? '九尾がひらく夜、願いの底へ。' : '今宵も、あの姫に逢うために。',
  description: i === 4 ? '覚醒核はこの難易度だけ。道中の消耗を抑え、薬と役割を整えて九尾に挑む。' : '葛葉の契りを集め、妖狐の姫を仲間に迎える。',
  artId: i === 4 ? 'kuzuha-awakened-art' : 'kuzuha-art', published: true, eventId: kuzuhaEvent.id,
  previousDungeonId: i === 0 ? kuzuhaEvent.entryDungeonId : kuzuhaEvent.dungeonIds[i - 1],
  requiresOwnedId: i === 4 ? kuzuhaEvent.normalId : undefined,
  bossMusic: 'japanese',
  bossScale: { hp: tier.hp, attack: tier.attack },
  eventReward: { materialId: i === 4 ? kuzuhaEvent.core.id : kuzuhaEvent.fragment.id, count: tier.amount },
  waves: [...tier.waves.map(mobs), [{ characterId: i === 4 ? kuzuhaEvent.awakenedId : kuzuhaEvent.normalId, boss: true }]],
}));

/** Original clockwork inventor; her rabbits are devices, not additional enemy slots. */
export const lunetteEvent: EventDef = {
  id: 'clockwork-rabbit-garden', name: '時計庭のうさぎ姫', subtitle: 'ぜんまいを巻いたら、あたしの時間！', published: true,
  normalLabel: '時計庭の発明家', recruitLabel: 'ルネットを迎える', awakenLabel: '星時計の約束を結ぶ',
  ruleDescription: 'ボスは3ターンごとにうさぎビットを展開。翌ターンから2ターン、各ビットが味方1人を自動射撃します。障壁・かばう・被ダメージ軽減が有効で、ボスを倒すと停止します。仲間にしたルネットは全体攻撃と障壁を使い、敵専用のビットは展開しません。',
  familyId: 'lunette', normalId: 'lunette', awakenedId: 'lunette-awakened', materialSpeciesId: 'lunette-clockwork', entryDungeonId: 'silent-cathedral',
  fragment: { id: 'lunette-clockwork:rare', name: 'うさぎの歯車' }, core: { id: 'lunette-clockwork:epic', name: '星時計の心臓' },
  normalCost: { materialId: 'lunette-clockwork:rare', count: 20 }, awakenedCost: { materialId: 'lunette-clockwork:epic', count: 3 },
  dungeonIds: ['lunette-beginner', 'lunette-intermediate', 'lunette-advanced', 'lunette-expert', 'lunette-awakening'],
};
const clockworkTiers = [
  { name: '初級', hp: 280, attack: 50, amount: 2, bits: 2, waves: [['moon-moth']] },
  { name: '中級', hp: 360, attack: 65, amount: 3, bits: 2, waves: [['moon-moth', 'pale-wolf']] },
  { name: '上級', hp: 420, attack: 80, amount: 4, bits: 2, waves: [['hollow-keeper', 'moon-moth'], ['stone-drake', 'pale-wolf']] },
  { name: '超級', hp: 600, attack: 95, amount: 6, bits: 3, waves: [['hollow-keeper', 'thorn-witch'], ['moon-moth', 'veil-priestess', 'pale-wolf']] },
  { name: '覚醒級', hp: 700, attack: 85, amount: 1, bits: 3, waves: [['stone-drake', 'veil-priestess'], ['hollow-keeper', 'moon-moth', 'pale-wolf'], ['thorn-witch', 'moon-moth']] },
];
export const lunetteDungeons: DungeonDef[] = clockworkTiers.map((tier, i) => ({
  id: lunetteEvent.dungeonIds[i]!, kind: 'event', name: `${lunetteEvent.name}・${tier.name}`, tierName: tier.name,
  subtitle: i === 4 ? '大時計が目覚める夜、もう一度遊ぼう。' : 'うさぎたちの行進が、静かな庭を起こす。',
  description: '3ターンごとにビット展開、翌ターンから2ターン射撃。展開中に障壁やかばうを用意しよう。確定した素材でルネットを仲間に迎えられる。',
  artId: i === 4 ? 'lunette-awakened-art' : 'lunette-art', published: true, eventId: lunetteEvent.id,
  previousDungeonId: i === 0 ? lunetteEvent.entryDungeonId : lunetteEvent.dungeonIds[i - 1],
  requiresOwnedId: i === 4 ? lunetteEvent.normalId : undefined,
  bossScale: { hp: tier.hp, attack: tier.attack }, bossBits: { every: 3, count: tier.bits, duration: 2, power: 65 },
  eventReward: { materialId: i === 4 ? lunetteEvent.core.id : lunetteEvent.fragment.id, count: tier.amount },
  waves: [...tier.waves.map(mobs), [{ characterId: i === 4 ? lunetteEvent.awakenedId : lunetteEvent.normalId, boss: true }]],
}));
