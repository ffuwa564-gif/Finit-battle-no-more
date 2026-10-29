import { validCrystalRole } from '../domain/crystal-resonance';
import { validBattleFairies } from '../domain/battle-fairies';
import { validBattleBlooms } from '../domain/battle-blooms';
import { validLegacyOmens } from '../domain/legacy-omens';
import { ailments } from '../domain/ailments';
import { duplicateFamily } from '../domain/events';
import type { Content, GameSave, GachaResult } from '../domain/types';

export const SAVE_DATABASE = 'stillveil-save';
export const SAVE_STORE = 'state';
export interface BootMetadata {
  contractVersion: 1; schemaVersion: number; appVersion: string; contentVersion: string; rulesVersion: string;
  hasExploration: boolean; hasPendingRewards: boolean; revision: number;
}

function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function stringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every(item => typeof item === 'string'); }
function count(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
function nonempty(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }
function uniqueStrings(value: unknown): value is string[] { return stringArray(value) && new Set(value).size === value.length && value.every(nonempty); }
function materialMap(value: unknown): boolean { return record(value) && Object.entries(value).every(([id, amount]) => /^[a-zA-Z0-9_-]+:(common|rare|epic)$/.test(id) && count(amount)); }
function validGachaResult(value: unknown): value is GachaResult { return record(value) && nonempty(value.characterId) && typeof value.duplicate === 'boolean' && count(value.refund) && value.refund <= 3 && (value.currency === undefined || ['stones', 'astralStones'].includes(value.currency as string)); }
function validUnit(value: unknown): boolean {
  if (!record(value) || !nonempty(value.uid) || !nonempty(value.characterId) || !['party', 'enemy'].includes(value.side as string) || typeof value.boss !== 'boolean') return false;
  for (const key of ['hp', 'maxHp', 'attack', 'defense', 'speed', 'tie']) if (!count(value[key])) return false;
  if (Number(value.maxHp) < 1 || Number(value.hp) > Number(value.maxHp) || !record(value.cooldowns) || Object.values(value.cooldowns).some(item => !count(item))) return false;
  if (value.ailments !== undefined && (!record(value.ailments) || Object.entries(value.ailments).some(([id,state]) => !(ailments as readonly string[]).includes(id) || !record(state) || !count(state.turns) || state.turns < 1 || state.turns > 2 || !nonempty(state.sourceId)))) return false;
  if (value.ultimateCharge !== undefined && (value.side !== 'party' || !count(value.ultimateCharge) || value.ultimateCharge > 100)) return false;
  if (value.ultimateQueued !== undefined && (typeof value.ultimateQueued !== 'boolean' || value.side !== 'party' || value.ultimateQueued && value.ultimateCharge !== 100)) return false;
  if (value.statusWardUntil !== undefined && !count(value.statusWardUntil)) return false;
  if (value.bits !== undefined && (!record(value.bits) || value.side !== 'enemy' || !value.boss || !count(value.bits.count) || value.bits.count < 1 || value.bits.count > 4 || !count(value.bits.deployedRound) || value.bits.deployedRound < 1 || !count(value.bits.expiresRound) || value.bits.expiresRound <= value.bits.deployedRound || value.bits.expiresRound > value.bits.deployedRound + 5)) return false;
  if (value.guardTarget !== undefined && !nonempty(value.guardTarget)) return false;
  for (const key of ['guardUntil', 'guardStrength', 'buffUntil', 'buffStrength', 'debuffUntil', 'debuffStrength', 'barrier', 'barrierUntil', 'regenStrength', 'regenUntil']) if (value[key] !== undefined && !count(value[key])) return false;
  return true;
}
function validUnits(value: unknown): boolean { return Array.isArray(value) && value.every(validUnit) && new Set(value.map(unit => unit.uid)).size === value.length; }
function validEvent(value: unknown): boolean {
  if (!record(value) || !nonempty(value.id) || typeof value.text !== 'string' || !['attack', 'area', 'heal', 'guard', 'buff', 'debuff', 'drop', 'dialogue', 'wave', 'defeat'].includes(value.kind as string)) return false;
  for (const key of ['actorId', 'skillId', 'materialId']) if (value[key] !== undefined && !nonempty(value[key])) return false;
  if (value.targetIds !== undefined && !stringArray(value.targetIds)) return false;
  if (value.amount !== undefined && !count(value.amount)) return false;
  if (value.rarity !== undefined && !['common', 'rare', 'epic'].includes(value.rarity as string)) return false;
  if (value.clockAction !== undefined && (!['restore', 'break', 'finale'].includes(value.clockAction as string) || value.kind !== ({ restore: 'guard', break: 'debuff', finale: 'area' } as Record<string, string>)[String(value.clockAction)])) return false;
  if (value.directive !== undefined && !['aggressive', 'survival'].includes(value.directive as string)) return false;
  if (value.ultimate !== undefined && typeof value.ultimate !== 'boolean') return false;
  if (value.bossStrike !== undefined && typeof value.bossStrike !== 'boolean') return false;
  if (value.ailment !== undefined && !(ailments as readonly string[]).includes(value.ailment as string)) return false;
  if (value.statusAction !== undefined && (!['inflict', 'resist', 'skip', 'recover', 'friendly_fire'].includes(value.statusAction as string) || value.ailment === undefined)) return false;
  if (value.fairyAction !== undefined && !(value.fairyAction === 'charge' && value.kind === 'buff' && ['left', 'right'].includes(value.fairySide as string))) return false;
  if (value.bloomAction !== undefined && !((value.bloomAction === 'heal' && value.kind === 'heal') || (value.bloomAction === 'strike' && value.kind === 'attack'))) return false;
  if (value.bitAction !== undefined && !['deploy', 'fire', 'expire'].includes(value.bitAction as string)) return false;
  if (value.bitIndex !== undefined && (value.bitAction !== 'fire' || !count(value.bitIndex) || value.bitIndex > 3)) return false;
  if (value.unitsAfter !== undefined && !validUnits(value.unitsAfter)) return false;
  return true;
}

/** Reject unreadable records; callers must never interpret corruption as a new game. */
export function assertValidSave(value: unknown): asserts value is GameSave {
  if (!record(value) || value.schemaVersion !== 1) throw new Error('未対応または破損した保存形式です。セーブは保持されています。');
  for (const key of ['appVersion', 'contentVersion', 'rulesVersion', 'leaderId']) if (typeof value[key] !== 'string' || !value[key]) throw new Error('保存データの版情報を読めません。');
  for (const key of ['revision', 'gold', 'potions', 'stones', 'drawCount', 'seed']) if (!count(value[key])) throw new Error('保存データの所持数または状態が不正です。');
  for (const key of ['astralStones', 'xrDrawCount']) if (value[key] !== undefined && !count(value[key])) throw new Error('星晶の所持数または状態が不正です。');
  if (value.ssrPity !== undefined && (!count(value.ssrPity) || value.ssrPity >= 90 || value.ssrPity > Number(value.drawCount))) throw new Error('祈願の天井情報が不正です。');
  if (value.lastGachaResult !== undefined && !validGachaResult(value.lastGachaResult)) throw new Error('祈願の結果情報が不正です。');
  if (value.lastGachaResults !== undefined) {
    const results = value.lastGachaResults;
    if (!Array.isArray(results) || ![1, 10].includes(results.length) || !results.every(validGachaResult) || Number(results[0]?.currency === 'astralStones' ? value.xrDrawCount ?? 0 : value.drawCount) < results.length || results.some(result => (result.currency ?? 'stones') !== (results[0]?.currency ?? 'stones')) || !validGachaResult(value.lastGachaResult)) throw new Error('祈願の結果情報が不正です。');
    const last = results.at(-1)!;
    if (last.characterId !== value.lastGachaResult.characterId || last.duplicate !== value.lastGachaResult.duplicate || last.refund !== value.lastGachaResult.refund || (last.currency ?? 'stones') !== (value.lastGachaResult.currency ?? 'stones')) throw new Error('祈願の結果情報が不正です。');
  }
  if (value.novels !== undefined) {
    const novels = value.novels;
    if (!record(novels) || !uniqueStrings(novels.seen)) throw new Error('物語の記録が不正です。');
    if (novels.active !== undefined && (!record(novels.active) || !nonempty(novels.active.sceneId) || !count(novels.active.page) || value.battle !== null)) throw new Error('物語の再生位置が不正です。');
  }
  for (const key of ['ownedIds', 'partyIds', 'discoveredIds', 'completedDungeonIds', 'claimedExplorationIds']) if (!uniqueStrings(value[key])) throw new Error('保存データのキャラクター情報が不正です。');
  const partyIds = value.partyIds as string[];
  if (partyIds.length < 1 || partyIds.length > 4 || !partyIds.includes(value.leaderId as string) || partyIds.some(id => !(value.ownedIds as string[]).includes(id))) throw new Error('保存データの編成が不正です。');
  if (!materialMap(value.materials)) throw new Error('保存データの素材数が不正です。');
  if (!Array.isArray(value.history) || value.history.some(item => !record(item) || typeof item.id !== 'string' || typeof item.text !== 'string')) throw new Error('保存データの履歴が不正です。');
  const settings = value.settings;
  if (!record(settings) || ![1, 2].includes(settings.speed as number) || typeof settings.reducedMotion !== 'boolean' || ['bgmVolume', 'seVolume'].some(key => typeof settings[key] !== 'number' || !Number.isFinite(settings[key]) || Number(settings[key]) < 0 || Number(settings[key]) > 1)) throw new Error('保存データの設定が不正です。');
  if (settings.homeCharacterId !== undefined && settings.homeCharacterId !== null && (!nonempty(settings.homeCharacterId) || !(value.ownedIds as string[]).includes(settings.homeCharacterId))) throw new Error('ホームの表示設定が不正です。');
  if (value.battle !== null) {
    const battle = value.battle;
    if (!record(battle) || !nonempty(battle.id) || !nonempty(battle.dungeonId) || !nonempty(battle.contentVersion) || !nonempty(battle.rulesVersion) || !['ready', 'playing', 'reward', 'failed'].includes(battle.phase as string) || !['ready', 'wave', 'reward', 'failed'].includes(battle.nextPhase as string) || !validUnits(battle.units) || !Array.isArray(battle.events) || !battle.events.every(validEvent) || !validUnits(battle.initialUnits) || !count(battle.cursor) || battle.cursor > battle.events.length || !count(battle.wave) || !count(battle.round) || battle.round < 1 || !materialMap(battle.pendingMaterials) || !uniqueStrings(battle.partyIds) || !nonempty(battle.leaderId) || !battle.partyIds.includes(battle.leaderId) || !uniqueStrings(battle.talkFlags) || !count(battle.potionsRemaining) || battle.potionsRemaining > 5 || typeof battle.potionUsed !== 'boolean' || !count(battle.seed) || !count(battle.goldEarned) || !['balanced', 'aggressive', 'survival'].includes(battle.strategy as string)) throw new Error('探索の保存状態を読み込めません。セーブは保持されています。');
    if (battle.crystalRole !== undefined && !validCrystalRole(battle.crystalRole)) throw new Error('宝石の共鳴状態が不正です。');
    if (battle.fairies !== undefined && !validBattleFairies(battle.fairies, battle as unknown as Parameters<typeof validBattleFairies>[1])) throw new Error('妖精の保存状態が不正です。');
    if (battle.blooms !== undefined && !validBattleBlooms(battle.blooms, battle as unknown as Parameters<typeof validBattleBlooms>[1])) throw new Error('花の保存状態が不正です。');
    if (battle.omens !== undefined && !validLegacyOmens(battle.omens, battle as unknown as Parameters<typeof validLegacyOmens>[1])) throw new Error('痕跡の保存状態が不正です。');
    if (battle.phase !== 'playing' && battle.cursor !== battle.events.length) throw new Error('探索演出の完了状態が不正です。');
  }
}

/** Resolve all persisted IDs against the selected immutable content release. */
export function assertSaveCompatibility(save: GameSave, content: Content): void {
  assertValidSave(save);
  if (save.schemaVersion !== content.schemaVersion || save.appVersion !== content.appVersion || save.contentVersion !== content.contentVersion || save.rulesVersion !== content.rulesVersion) throw new Error('このセーブに対応するリリースで再開してください。');
  if (duplicateFamily(save.partyIds, content)) throw new Error('同じ仲間の複数形態が編成されています。セーブは保持しています。');
  const characters = new Set(content.characters.map(item => item.id));
  const skills = new Set(content.skills.map(item => item.id));
  const species = new Set(content.species.map(item => item.id));
  const dungeonIds = new Set(content.dungeons.map(item => item.id));
  if ([...save.ownedIds, ...save.discoveredIds].some(id => !characters.has(id)) || save.completedDungeonIds.some(id => !dungeonIds.has(id)) || Object.keys(save.materials).some(id => !species.has(id.split(':')[0]!))) throw new Error('保存データが参照する定義がありません。セーブを保持して停止します。');
  if ([...(save.lastGachaResults ?? []), ...(save.lastGachaResult ? [save.lastGachaResult] : [])].some(result => !characters.has(result.characterId) || !save.ownedIds.includes(result.characterId))) throw new Error('祈願の結果が所持情報と一致しません。');
  if (save.novels) {
    if (save.novels.seen.some(id => !content.novels?.some(scene => scene.id === id))) throw new Error('物語の固定定義がありません。');
    const active = save.novels.active;
    if (active) {
      const scene = content.novels?.find(scene => scene.id === active.sceneId);
      if (!scene || active.page >= scene.pages.length || (scene.trigger.kind === 'dungeon-clear' && !save.completedDungeonIds.includes(scene.trigger.dungeonId))) throw new Error('物語を再開するための定義がありません。');
    }
  }
  const battle = save.battle;
  if (!battle) return;
  const dungeon = content.dungeons.find(item => item.id === battle.dungeonId);
  if (!dungeon || battle.wave >= dungeon.waves.length || battle.contentVersion !== content.contentVersion || battle.rulesVersion !== content.rulesVersion || battle.partyIds.some(id => !save.ownedIds.includes(id)) || Object.keys(battle.pendingMaterials).some(id => !species.has(id.split(':')[0]!))) throw new Error('探索を再開するための固定定義がありません。');
  if (battle.omens && dungeon.kind === 'trial') throw new Error('腕試しの探索状態が不正です。');
  const snapshots = [battle.units, battle.initialUnits, ...battle.events.flatMap(event => event.unitsAfter ? [event.unitsAfter] : [])];
  if (snapshots.some(units => units.some(unit => !characters.has(unit.characterId) || Object.keys(unit.cooldowns).some(id => !skills.has(id))))) throw new Error('戦闘データが参照するキャラクター・スキルがありません。');
  if (snapshots.some(units => units.some(unit => Object.values(unit.ailments ?? {}).some(state => !units.some(source => source.uid === state.sourceId))))) throw new Error('状態異常の付与者が戦闘データにありません。');
  if (battle.events.some(event => event.skillId && !skills.has(event.skillId))) throw new Error('保存済み演出のスキル定義がありません。');
}

export function bootMetadata(save: GameSave): BootMetadata {
  return { contractVersion: 1, schemaVersion: save.schemaVersion, appVersion: save.appVersion, contentVersion: save.contentVersion, rulesVersion: save.rulesVersion, hasExploration: save.battle !== null, hasPendingRewards: save.battle?.phase === 'reward' || save.battle?.nextPhase === 'reward', revision: save.revision };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('この環境ではブラウザー保存が利用できません。')); return; }
    const request = indexedDB.open(SAVE_DATABASE, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(SAVE_STORE)) request.result.createObjectStore(SAVE_STORE); };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
    request.onerror = () => reject(new Error('保存領域を開けません。ブラウザー設定を確認してください。'));
    request.onblocked = () => reject(new Error('別のタブが保存領域を使用しています。ほかのタブを閉じてください。'));
  });
}

async function readRecord(key: string): Promise<unknown> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SAVE_STORE, 'readonly');
    const request = transaction.objectStore(SAVE_STORE).get(key);
    let value: unknown;
    request.onsuccess = () => { value = request.result; };
    transaction.oncomplete = () => { db.close(); resolve(value); };
    transaction.onabort = transaction.onerror = () => { db.close(); reject(new Error('保存データを読み込めません。')); };
  });
}

export async function loadSave(): Promise<GameSave | null> {
  const db = await openDatabase();
  const pair = await new Promise<{ value: unknown; boot: unknown }>((resolve, reject) => {
    const transaction = db.transaction(SAVE_STORE, 'readonly');
    const store = transaction.objectStore(SAVE_STORE);
    const saveRequest = store.get('save'); const bootRequest = store.get('boot');
    transaction.oncomplete = () => { db.close(); resolve({ value: saveRequest.result, boot: bootRequest.result }); };
    transaction.onabort = transaction.onerror = () => { db.close(); reject(new Error('保存データを読み込めません。')); };
  });
  const value = pair.value;
  if (value === undefined) {
    if (pair.boot !== undefined) throw new Error('保存本体が見つかりません。既存の起動情報を保持して停止します。');
    return null;
  }
  assertValidSave(value);
  const expected = bootMetadata(value);
  const metadata = pair.boot;
  if (!record(metadata) || Object.entries(expected).some(([key, item]) => metadata[key] !== item)) throw new Error('セーブと起動メタ情報が一致しません。既存セーブを保持して停止します。');
  return value;
}

/** The launcher reads this record before importing or migrating a release. */
export async function readBootMetadata(): Promise<BootMetadata | null> {
  const value = await readRecord('boot');
  if (value === undefined) {
    if (await readRecord('save') !== undefined) throw new Error('起動メタ情報がありません。既存セーブを保持して停止します。');
    return null;
  }
  if (!record(value) || value.contractVersion !== 1 || !count(value.schemaVersion) || !count(value.revision) || typeof value.appVersion !== 'string' || typeof value.contentVersion !== 'string' || typeof value.rulesVersion !== 'string' || typeof value.hasExploration !== 'boolean' || typeof value.hasPendingRewards !== 'boolean') throw new Error('起動メタ情報を読めません。既存セーブを保持して停止します。');
  return value as unknown as BootMetadata;
}

/** Compare-and-swap and the save/boot write share one IndexedDB transaction. */
export async function persistSave(save: GameSave, expectedRevision?: number): Promise<void> {
  assertValidSave(save);
  if (expectedRevision !== undefined && (!count(expectedRevision) || save.revision !== expectedRevision + 1)) throw new Error('保存の更新順序が正しくありません。');
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SAVE_STORE, 'readwrite');
    const store = transaction.objectStore(SAVE_STORE);
    const request = store.get('save');
    let reason = '保存に失敗しました。空き容量・ブラウザー設定を確認して再試行してください。';
    request.onsuccess = () => {
      const previous: unknown = request.result;
      try {
        if (previous === undefined) {
          if (expectedRevision !== undefined || save.revision !== 0) throw new Error('保存データが変更されています。再読み込みしてください。');
        } else {
          assertValidSave(previous);
          if (expectedRevision === undefined || previous.revision !== expectedRevision) throw new Error('別のタブで進行が更新されました。このタブを再読み込みしてください。');
          if (previous.appVersion !== save.appVersion || previous.schemaVersion !== save.schemaVersion || previous.contentVersion !== save.contentVersion || previous.rulesVersion !== save.rulesVersion) throw new Error('異なる版から保存しようとしています。対応するリリースで再開してください。');
          store.put(previous, 'backup');
        }
        store.put(save, 'save');
        store.put(bootMetadata(save), 'boot');
      } catch (error) {
        reason = error instanceof Error ? error.message : reason;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onabort = transaction.onerror = () => { db.close(); reject(new Error(reason)); };
  });
}
