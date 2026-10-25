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
