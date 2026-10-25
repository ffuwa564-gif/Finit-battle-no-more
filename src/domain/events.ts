import { campaignLock } from './campaign';
import type { Content, DungeonDef, EventDef, GameSave } from './types';

export function dungeonLock(def: DungeonDef, save: Pick<GameSave, 'completedDungeonIds' | 'ownedIds'>, content: Content): string | null {
  if (def.chapterId) { const lock = campaignLock(def, save, content); if (lock) return lock; }
  if (!def.chapterId && def.previousDungeonId && !save.completedDungeonIds.includes(def.previousDungeonId)) return def.eventId ? '前の難易度を踏破して解放' : `${content.dungeons.find(stage => stage.id === def.previousDungeonId)?.name ?? '前の探索'}を踏破して解放`;
  if (def.requiresOwnedIds?.some(id => !save.ownedIds.includes(id))) return `関係者${def.requiresOwnedIds.length}人の覚醒で解放`;
  if (!def.eventId) return null;
  const event = content.events?.find(item => item.id === def.eventId && item.published);
  if (!event) return '開催されていません';
  if (def.requiresOwnedId && !save.ownedIds.includes(def.requiresOwnedId)) return '通常版を迎えて解放';
  return null;
}
export function eventExchangeLock(event: EventDef, form: 'normal' | 'awakened', save: GameSave): string | null {
  const id = form === 'normal' ? event.normalId : event.awakenedId;
  if (save.ownedIds.includes(id)) return '迎え入れ済み';
  if (form === 'awakened' && !save.ownedIds.includes(event.normalId)) return '通常版を迎えて解放';
  const required = form === 'awakened' ? [event.dungeonIds.at(-1)!] : event.dungeonIds.slice(0, -1);
  if (!required.some(dungeonId => save.completedDungeonIds.includes(dungeonId))) return form === 'awakened' ? '覚醒級を踏破して解放' : 'イベントを踏破して解放';
  const cost = form === 'normal' ? event.normalCost : event.awakenedCost;
  if ((save.materials[cost.materialId] ?? 0) < cost.count) return '素材を集めて迎える';
  return null;
}
export function duplicateFamily(ids: string[], content: Content): boolean {
  const families = ids.map(id => { const char = content.characters.find(item => item.id === id); return char?.familyId ?? id; });
  return new Set(families).size !== families.length;
}
