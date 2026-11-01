import { hasAilment } from './ailments';
import type { Battle, CommandOrder, Content, Unit } from './types';

const loads = { R: 1, SR: 2, SSR: 3, XR: 4 } as const;

/** A visible command budget, not a character's willingness or personality. */
export function commandCapacity(leaderId: string): number {
  return leaderId === 'noelle' ? 3 : leaderId === 'noelle-awakened' ? 4 : 0;
}

/** Only explicit growth links inherit load; another costume is not an awakening. */
export function commandCost(characterId: string, content: Content): number {
  if (!content.characters.some(character => character.id === characterId)) throw new Error('号令の仲間が見つかりません。');
  const lineage = new Set([characterId]);
  const links = [...(content.awakenings ?? []).map(link => [link.baseId, link.awakenedId]), ...(content.events ?? []).map(event => [event.normalId, event.awakenedId])];
  let previous = -1;
  while (previous !== lineage.size) {
    previous = lineage.size;
    for (const [before, after] of links) if (lineage.has(before!) || lineage.has(after!)) { lineage.add(before!); lineage.add(after!); }
  }
  return Math.min(...content.characters.filter(character => lineage.has(character.id)).map(character => loads[character.rarity]));
}

export function commandLoad(order: CommandOrder, battle: Battle, content: Content): number {
  return order.followerIds.reduce((sum, id) => {
    const unit = battle.units.find(unit => unit.uid === id && unit.side === 'party' && battle.partyIds.includes(unit.characterId));
    if (!unit) throw new Error('号令の仲間が見つかりません。');
    return sum + commandCost(unit.characterId, content);
  }, 0);
}

export function commandCommander(battle: Battle): Unit | undefined {
  return commandCapacity(battle.leaderId) ? battle.units.find(unit => unit.side === 'party' && unit.characterId === battle.leaderId) : undefined;
}

/** Public readiness only; never forecasts an ally's private action or consumes RNG. */
export function commandUnavailableReason(battle: Battle): string | undefined {
  if (!commandCapacity(battle.leaderId)) return '号令はノエルをリーダーにすると使用できます。';
  if (battle.phase !== 'ready') return '号令はラウンドの準備中に予約できます。';
  const commander = commandCommander(battle);
  if (!commander || commander.hp <= 0) return '指揮官が戦闘不能のため発令できません。';
  if (hasAilment(commander)) return '指揮官が状態異常の間は号令を予約できません。';
  if (commander.ultimateQueued) return '指揮官の必殺予約と号令は同時に使用できません。';
  if (commander.characterId === battle.partyIds[0] && battle.partyOrder) return '指揮官本人の操作と号令は同時に使用できません。';
  return;
}

/**
 * Reservation checks use the ready state. Save checks retain a legal reservation through
 * an off-turn flower replay even if its target has just died; issue-time then falls back.
 */
export function validateCommandOrder(order: unknown, battle: Battle, content: Content, options: { stored?: boolean } = {}): CommandOrder {
  if (!order || typeof order !== 'object' || Array.isArray(order)) throw new Error('号令の予約形式が不正です。');
  const value = order as Record<string, unknown>;
  if (Object.keys(value).some(key => !['targetId', 'followerIds'].includes(key)) || typeof value.targetId !== 'string' || !value.targetId || value.targetId.length > 256 || !Array.isArray(value.followerIds) || !value.followerIds.length || value.followerIds.length > 3 || value.followerIds.some(id => typeof id !== 'string' || !id || id.length > 256) || new Set(value.followerIds).size !== value.followerIds.length) throw new Error('号令の予約形式が不正です。');
  if (!commandCapacity(battle.leaderId)) throw new Error('号令はノエルをリーダーにすると使用できます。');
  const commander = commandCommander(battle);
  if (!commander) throw new Error('号令の指揮官が見つかりません。');
  const target = battle.units.find(unit => unit.uid === value.targetId && unit.side === 'enemy');
  if (!target || !options.stored && target.hp <= 0) throw new Error('号令の宛先には生存中の敵を選んでください。');
  for (const id of value.followerIds) {
    const follower = battle.units.find(unit => unit.uid === id && unit.side === 'party' && battle.partyIds.includes(unit.characterId));
    if (!follower || follower.uid === commander.uid || !options.stored && follower.hp <= 0) throw new Error('号令の受領者には指揮官以外の生存中の味方を選んでください。');
  }
  const parsed = { targetId: value.targetId, followerIds: [...value.followerIds] as string[] };
  if (commandLoad(parsed, battle, content) > commandCapacity(battle.leaderId)) throw new Error('号令の連携負荷が指揮枠を超えています。');
  if (!options.stored) { const reason = commandUnavailableReason(battle); if (reason) throw new Error(reason); }
  return parsed;
}

export const commandDoctrineDescription = '星図の号令：ノエルは3枠、覚醒後は4枠。受領者の負荷はR1・SR2・SSR3・XR4で、明示的な覚醒前の負荷を引き継ぎ、別衣装は別に数える。発令時に本人の通常1手とそのラウンドの追加リーダー効果を使い、生存中の指定敵へ、予約した味方の通常単体行動の宛先だけを確実に合わせる。石・追撃・範囲・支援・異常強制行動・予約必殺・先頭本人の明示操作は奪わない。対象死亡後は通常判断へ戻り、枠と本人の一手は返らない。';
