import type { Content, GameSave } from '../domain/types';
import { assertValidSave, assertSaveCompatibility, isLegacySaveVersion } from './save';
import { highestTowerFloor } from '../domain/ivory-tower';
import { dungeonStoneReward } from '../domain/rewards';
import { dungeonGemFamily, emptyGemInventory } from '../domain/memory-gems';
import { initialNovelProgress, enqueueMilestone } from '../domain/novels';
import { RELEASE } from '../content/version';

/** Pure, deterministic conversion. It never rolls loot, advances RNG or replays old combat rules. */
export function migrateSaveTo110(value: GameSave, content: Content): GameSave {
  assertValidSave(value);
  const current = value.schemaVersion === content.schemaVersion && value.appVersion === content.appVersion && value.contentVersion === content.contentVersion && value.rulesVersion === content.rulesVersion;
  if (current) { assertSaveCompatibility(value, content); return value; }
  if (!isLegacySaveVersion(value) || content.appVersion !== RELEASE.appVersion || content.contentVersion !== RELEASE.contentVersion || content.rulesVersion !== RELEASE.rulesVersion || content.schemaVersion !== RELEASE.schemaVersion) throw new Error('このセーブに対応するリリースで再開してください。');
  // Validate old snapshots and equipment too; only tower wave count changed between releases.
  const legacyContent: Content = { ...content, schemaVersion: value.schemaVersion, appVersion: value.appVersion, contentVersion: value.contentVersion, rulesVersion: value.rulesVersion,
    dungeons: content.dungeons.map(d => d.towerFloor ? { ...d, waves: Array.from({ length: d.towerFloor % 10 === 0 ? 2 : 1 }, () => d.waves[0]!) } : d) };
  assertSaveCompatibility(value, legacyContent);
  if (value.battle) {
    const d = legacyContent.dungeons.find(d => d.id === value.battle!.dungeonId);
    if (d?.kind === 'trial' && (Object.keys(value.battle.pendingMaterials).length || value.battle.goldEarned)) throw new Error('腕試しに戦利品はありません。');
  }
  const next = structuredClone(value), oldBattle = next.battle;
  let victory: { id: string; previouslyCleared: boolean } | undefined;
  if (oldBattle) {
    const dungeon = content.dungeons.find(d => d.id === oldBattle.dungeonId);
    const knownCharacters = new Set(content.characters.map(c => c.id));
    const knownSpecies = new Set(content.species.map(s => s.id));
    if (!dungeon || oldBattle.units.some(u => !knownCharacters.has(u.characterId)) || Object.keys(oldBattle.pendingMaterials).some(id => !knownSpecies.has(id.split(':')[0]!))) throw new Error('更新前の探索を安全に移行できません。元の保存を保持しています。');
    const claimed = next.claimedExplorationIds.includes(oldBattle.id);
    const failed = oldBattle.phase === 'failed' || oldBattle.nextPhase === 'failed';
    if (!claimed && !failed) {
      // Materials already earned by defeated enemies are secured as an update exception.
      for (const [id,count] of Object.entries(oldBattle.pendingMaterials)) next.materials[id] = (next.materials[id] ?? 0) + count;
      const won = oldBattle.phase === 'reward' || oldBattle.nextPhase === 'reward';
      if (won) {
        if (dungeon.kind !== 'trial') {
          next.gold += 20;
          const inv = next.memoryGems ??= emptyGemInventory(), family = dungeonGemFamily(dungeon);
          inv.dust[family] = (inv.dust[family] ?? 0) + (dungeon.towerFloor ? 1 + Math.floor((dungeon.towerFloor-1)/20) : 1);
        }
        next.stones += dungeonStoneReward(dungeon, next.completedDungeonIds);
        victory = { id: dungeon.id, previouslyCleared: next.completedDungeonIds.includes(dungeon.id) };
        if (!victory.previouslyCleared) next.completedDungeonIds.push(dungeon.id);
      }
      next.claimedExplorationIds.push(oldBattle.id);
    }
    // Gold and chest gems are already committed by old round/wave handling: never award them twice.
    next.battle = null;
  }
  next.towerRecord = { version: '1.10', completedFloors: [], legacyHighest: highestTowerFloor({ completedDungeonIds: next.completedDungeonIds }) };
  Object.assign(next, { schemaVersion: content.schemaVersion, appVersion: content.appVersion, contentVersion: content.contentVersion, rulesVersion: content.rulesVersion, revision: value.revision + 1 });
  next.novels ??= initialNovelProgress(content, false);
  if (victory) enqueueMilestone(next, victory.id, victory.previouslyCleared, content);
  const text = oldBattle ? '1.10へ更新しました。旧探索を終了し、確保済みの戦利品と旧塔の記録を引き継ぎました。' : '1.10へ更新しました。仲間・装備・旧塔の記録を引き継ぎました。';
  next.history = [{ id: `migration-1.10-${next.revision}`, text }, ...next.history].slice(0,12);
  assertSaveCompatibility(next, content);
  return next;
}
