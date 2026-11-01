import { scoutRecruitments } from '../content/scout-maidens';
import { createExpeditionTracking, finishTracking, trackEventBatch, trackPotion } from '../domain/expedition-review';
import { finalizeExpedition } from '../domain/expedition-ledger';
import { validateCommandOrder } from '../domain/command-doctrine';
import { getBuildDefinition, getBuildPlan, isBuildStage } from '../domain/builds';
import { towerDustReward } from '../domain/ivory-tower';
import { emptyGemInventory, equipGem, salvageGem, lockGem, craftGem, rollGemDrop, dungeonGemFamily, gemName, startGemRefinement, resolveGemRefinement } from '../domain/memory-gems';
import { validCrystalRole } from '../domain/crystal-resonance';
import { enqueueMilestone, initialNovelProgress, novelAvailable } from '../domain/novels';
import { ultimateReady } from '../domain/ultimates';
import { commandUnits, partyOrderOptions, validPartyOrder } from '../domain/party-orders';
import { pickXR, xrGachaLock } from '../domain/xr-gacha';
import type { Battle, Content, GameCommand, GameSave, GachaResult, Rarity } from '../domain/types';
import { dungeonStoneReward } from '../domain/rewards';
import { dungeonLock, duplicateFamily, eventExchangeLock } from '../domain/events';
import { awakeningLock, isolatedMaterialSpecies } from '../domain/awakening';
import { initialGacha, pickSSR, gachaPity, gachaSSRRate, gachaCollections, introductoryGuarantee, gachaPoolIds } from '../content/gacha';
import { advanceReplay, createBattle, recruitCost, resolveRound, rng, usePotion, useBattleBloom, useBattleFairy } from '../domain/engine';

function fail(message: string): never { throw new Error(message); }
function natural(value: number, label: string, allowZero = false): void {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) fail(`${label}が正しくありません。`);
}
/** Target and command are committed in the same save, using the visible enemy snapshot. */
function pinCommandTarget(battle: Battle, targetId?: string): void {
  if (targetId === undefined) return;
  if (!commandUnits(battle).some(u => u.uid === targetId && u.side === 'enemy' && u.hp > 0)) fail('狙う敵を選んでください。');
  battle.focusTargetId = targetId;
}
function town(save: GameSave): void { if (save.battle) fail('探索を終了してから操作してください。'); }
function log(save: GameSave, text: string, suffix: string | number = save.history.length): void {
  save.history = [{ id: `${save.revision + 1}-${suffix}`, text }, ...save.history].slice(0, 12);
}
function validateParty(save: GameSave, ids: string[], leaderId: string, content: Content): void {
  if (ids.length < 1 || ids.length > 4 || new Set(ids).size !== ids.length || ids.some(id => !save.ownedIds.includes(id))) fail('編成は所持している異なる仲間1〜4体で指定してください。');
  if (duplicateFamily(ids, content)) fail('同じ仲間の異なる姿は同時に編成できません。');
  if (!ids.includes(leaderId)) fail('リーダーを編成メンバーから1人選んでください。');
}
function ready(save: GameSave) {
  if (!save.battle || save.battle.phase !== 'ready') fail('指示待ちのときだけ操作できます。');
  return save.battle;
}
function spendMaterials(save: GameSave, costs: { materialId: string; count: number }[]): void {
  if (costs.some(cost => (save.materials[cost.materialId] ?? 0) < cost.count)) fail('仲間化に必要な素材が不足しています。');
  for (const cost of costs) save.materials[cost.materialId] = (save.materials[cost.materialId] ?? 0) - cost.count;
}

/** Equipment is snapshotted without changing combat stats or resetting cooldowns. */
function syncMemoryGems(save: GameSave): void {
  const battle = save.battle;
  if (!battle) return;
  const inventory = save.memoryGems ?? emptyGemInventory();
  battle.memoryGems = Object.fromEntries(battle.partyIds.flatMap(characterId => {
    const gem = inventory.items.find(item => item.id === inventory.equipped[characterId]);
    return gem ? [[characterId, structuredClone(gem)]] : [];
  }));
}
/** Called only after the last saved event of a defeated wave has been replayed. */
function secureMemoryChest(save: GameSave, wave: number, content: Content): void {
  const battle = save.battle!;
  const dungeon = content.dungeons.find(item => item.id === battle.dungeonId)!;
  if (dungeon.kind === 'trial' || dungeon.towerFloor && wave !== dungeon.waves.length - 1) return;
  const key = `${battle.id}:wave:${wave}`;
  if (battle.gemChestChecks?.includes(key)) return;
  battle.gemChestChecks = [...(battle.gemChestChecks ?? []), key];
  const inventory = save.memoryGems ??= emptyGemInventory();
  const result = rollGemDrop(dungeon, battle.seed, key, { first: inventory.seen.length === 0, boss: wave === dungeon.waves.length - 1 });
  battle.seed = result.seed;
  if (!result.gem || inventory.items.some(item => item.id === result.gem!.id)) return;
  inventory.items.push(result.gem);
  if (!inventory.seen.includes(result.gem.defId)) inventory.seen.push(result.gem.defId);
  battle.gemFinds = [...(battle.gemFinds ?? []), result.gem];
  log(save, `宝箱から${gemName(result.gem)}を確保しました。`, key);
}

export function createInitialSave(content: Content, seed = 0x584a39b1, options: { opening?: boolean } = {}): GameSave {
  const initial = content.characters.filter(character => character.published && character.origin.includes('initial')).slice(0, 4).map(character => character.id);
  if (!initial.length) fail('初期パーティの定義がありません。');
  const leader = initial.find(id => content.characters.find(character => character.id === id)?.role === 'tank') ?? initial[0]!;
  return {
    ...(options.opening ? { novels: initialNovelProgress(content, true) } : {}),
    schemaVersion: content.schemaVersion, appVersion: content.appVersion, contentVersion: content.contentVersion,
    rulesVersion: content.rulesVersion, revision: 0, gold: 100, potions: 10, stones: 0, astralStones: 0, xrDrawCount: 0,
    ownedIds: initial, partyIds: [...initial], leaderId: leader, materials: {}, discoveredIds: [...initial],
    towerRecord: { version: '1.10', completedFloors: [], legacyHighest: 0 },
    completedDungeonIds: [], claimedExplorationIds: [], drawCount: 0, ssrPity: 0, seed: seed >>> 0,
    memoryGems: emptyGemInventory(), battle: null, history: [], settings: { bgmVolume: 0.4, seVolume: 1, reducedMotion: false, speed: 1 },
  };
}

/** All accepted mutations produce one complete save for an atomic persistence transaction. */
export function applyCommand(previous: GameSave, command: GameCommand, content: Content, context: { now?: number } = {}): GameSave {
  if (previous.schemaVersion !== content.schemaVersion || previous.appVersion !== content.appVersion || previous.contentVersion !== content.contentVersion || previous.rulesVersion !== content.rulesVersion) fail('保存データに対応するリリースで再開してください。');
  const save = structuredClone(previous);
  if (save.novels?.active && !['novelNext', 'novelBack', 'novelFinish', 'settings'].includes(command.type)) fail('物語を閉じてから操作してください。');
  // Discard retired choice metadata; retain already-saved stats, loot and replay.
  if (save.battle) delete save.battle.omens;
  switch (command.type) {
    case 'trackBuild': {
      town(save);
      const stage = command.stage ?? 'starter';
      if (!isBuildStage(stage)) fail('ビルドの段階が正しくありません。');
      if (command.buildId === null) { delete save.buildGoal; break; }
      if (!getBuildDefinition(command.buildId)) fail('そのビルドは見つかりません。');
      save.buildGoal = { buildId: command.buildId, stage };
      log(save, '目標のビルドを記録しました。');
      break;
    }
    case 'applyBuild': {
      town(save);
      if (!isBuildStage(command.stage) || !getBuildDefinition(command.buildId)) fail('そのビルドは見つかりません。');
      if (save.memoryGems?.pending) fail('先に調律の結果を選んでください。');
      const plan = getBuildPlan(content, save, command.buildId, command.stage);
      if (!plan.canApply || !plan.leaderId || !save.memoryGems) fail('ビルドの核となる仲間と記憶石をそろえてください。');
      validateParty(save, plan.partyIds, plan.leaderId, content);
      for (const slot of plan.slots) {
        if (!slot.characterId || !slot.gem) fail('ビルドの装備がそろっていません。');
        equipGem(save.memoryGems, slot.characterId, slot.gem.id, { transfer: true });
      }
      save.partyIds = [...plan.partyIds];
      save.leaderId = plan.leaderId;
      log(save, '所持品でビルドを編成しました。');
      break;
    }
    case 'startGemRefinement': {
      town(save);
      if (!['power', 'trait'].includes(command.mode)) fail('記憶石の調律方法が正しくありません。');
      const result = startGemRefinement(save.memoryGems ??= emptyGemInventory(), command.gemId, command.mode, save.seed);
      save.seed = result.seed;
      log(save, '記憶石の調律結果を確認してください。');
      break;
    }
    case 'resolveGemRefinement': {
      town(save);
      if (typeof command.accept !== 'boolean') fail('記憶石の調律結果を選んでください。');
      resolveGemRefinement(save.memoryGems ??= emptyGemInventory(), command.accept);
      log(save, command.accept ? '記憶石に新しい調律結果を採用しました。' : '記憶石の元の性能を残しました。');
      break;
    }
    case 'equipMemoryGem': {
      if (!save.ownedIds.includes(command.characterId)) fail('所持している仲間を選んでください。');
      if (save.battle && (save.battle.phase !== 'ready' || save.battle.round !== 1 || save.battle.potionUsed)) fail('記憶石は街かウェーブ開始時に装備してください。');
      equipGem(save.memoryGems ??= emptyGemInventory(), command.characterId, command.gemId, { transfer: command.transfer === true });
      syncMemoryGems(save);
      if (save.battle) delete save.battle.partyOrder;
      break;
    }
    case 'salvageMemoryGem': {
      town(save);
      salvageGem(save.memoryGems ??= emptyGemInventory(), command.gemId);
      break;
    }
    case 'lockMemoryGem': {
      lockGem(save.memoryGems ??= emptyGemInventory(), command.gemId);
      break;
    }
    case 'craftMemoryGem': {
      town(save);
      const gem = craftGem(save.memoryGems ??= emptyGemInventory(), command.defId, command.variant);
      log(save, `${gemName(gem)}を製作しました。`);
      break;
    }
    case 'focusEnemy': {
      const battle = save.battle;
      if (!battle || battle.id !== command.battleId || !['ready', 'playing'].includes(battle.phase) || !commandUnits(battle).some(u => u.uid === command.unitId && u.side === 'enemy' && u.hp > 0)) fail('狙う敵を選んでください。');
      battle.focusTargetId = command.unitId;
      break;
    }
    case 'commandOrder': {
      const battle = ready(save);
      if (battle.id !== command.battleId) fail('今は行動を予約できません。');
      if (command.order === null) delete battle.commandOrder;
      else battle.commandOrder = validateCommandOrder(command.order, battle, content);
      break;
    }
    case 'partyOrder': {
      const battle = save.battle;
      if (!battle || battle.id !== command.battleId || !['ready', 'playing'].includes(battle.phase)) fail('今は行動を予約できません。');
      pinCommandTarget(battle, command.targetId);
      if (command.order === null) {
        delete battle.partyOrder;
        const pilot = battle.units.find(u => u.side === 'party' && u.characterId === battle.partyIds[0]);
        if (pilot) delete pilot.ultimateQueued;
        break;
      }
      if (!validPartyOrder(command.order)) fail('行動の予約が正しくありません。');
      const unit = commandUnits(battle).find(u => u.side === 'party' && u.characterId === battle.partyIds[0] && u.hp > 0);
      const optionId = command.order.kind === 'skill' ? 'skill:' + command.order.skillId : command.order.kind;
      if (!unit || !partyOrderOptions(unit, { ...battle, units: commandUnits(battle) }, content).some(o => !o.disabled && o.id === optionId)) fail('この行動はまだ使えません。');
      battle.partyOrder = command.order;
      if (unit.characterId === battle.leaderId) delete battle.commandOrder;
      const actual = battle.units.find(u => u.uid === unit.uid);
      if (actual) delete actual.ultimateQueued;
      break;
    }
    case 'novelStart': {
      town(save);
      const scene = content.novels?.find(scene => scene.id === command.sceneId);
      if (!scene || !novelAvailable(scene, save)) fail('この物語はまだ読めません。');
      save.novels ??= initialNovelProgress(content, false);
      save.novels.active = { sceneId: scene.id, page: 0 };
      break;
    }
    case 'novelNext': case 'novelBack': case 'novelFinish': {
      const active = save.novels?.active;
      const scene = content.novels?.find(scene => scene.id === active?.sceneId);
      if (!active || !scene || save.battle) fail('再生中の物語がありません。');
      natural(active.page, '物語の再生位置', true);
      if (active.page >= scene.pages.length) fail('物語のページが正しくありません。');
      if (command.type === 'novelFinish') {
        save.novels!.seen = [...new Set([...save.novels!.seen, scene.id])];
        delete save.novels!.active;
      } else {
        const page = active.page + (command.type === 'novelNext' ? 1 : -1);
        if (page < 0 || page >= scene.pages.length) fail('物語のページが正しくありません。');
        active.page = page;
      }
      break;
    }

    case 'depart': {
      town(save);
      if (save.memoryGems?.pending) fail('記憶石の調律結果を選んでから探索に出発してください。');
      validateParty(save, save.partyIds, save.leaderId, content);
      const dungeon = content.dungeons.find(item => item.id === command.dungeonId && item.published);
      if (!dungeon) fail('このダンジョンには出発できません。');
      const lock = dungeonLock(dungeon, save, content);
      if (lock) fail(lock);
      natural(command.potions, '持込数', true);
      if (command.potions > Math.min(5, save.potions)) fail('持ち込める回復薬は在庫内で5個までです。');
      const next = rng(save.seed);
      save.seed = next.seed;
      save.battle = createBattle(content, save.partyIds, save.leaderId, dungeon.id, command.potions, save.seed, `run-${save.revision + 1}-${save.seed}`);
      save.battle.tracking = createExpeditionTracking(context.now);
      syncMemoryGems(save);
      log(save, `${dungeon.name}へ出発しました。`);
      break;
    }
    case 'strategy': {
      if (!['balanced', 'aggressive', 'survival'].includes(command.strategy)) fail('作戦が正しくありません。');
      ready(save).strategy = command.strategy;
      break;
    }
    case 'crystalRole': {
      const battle = ready(save);
      if (command.role === null) { delete battle.crystalRole; break; }
      if (!validCrystalRole(command.role)) fail('宝石の役割が正しくありません。');
      if (!battle.units.some(unit => unit.side === 'party' && unit.hp > 0 && content.characters.find(c => c.id === unit.characterId)?.role === command.role)) fail('この役割の仲間は戦闘に参加していません。');
      battle.crystalRole = command.role;
      break;
    }
    case 'ultimate': {
      const battle = ready(save);
      const unit = battle.units.find(unit => unit.uid === command.unitId);
      if (!unit || !ultimateReady(unit)) fail('必殺技の準備ができている仲間を選んでください。');
      unit.ultimateQueued = !unit.ultimateQueued;
      if (unit.ultimateQueued && unit.characterId === battle.leaderId) delete battle.commandOrder;
      break;
    }
    case 'battleFairy': {
      save.battle = useBattleFairy(ready(save), command.fairyId, content);
      break;
    }
    case 'battleBloom': {
      const result = useBattleBloom(ready(save), command.bloomId, content);
      save.battle = result.battle;
      save.gold += result.goldEarned;
      save.discoveredIds = [...new Set([...save.discoveredIds, ...result.discoveredIds])];
      save.seed = result.battle.seed;
      break;
    }
    case 'round': {
      const battle = ready(save);
      if (command.battleId !== undefined && command.battleId !== battle.id) fail('今は行動を予約できません。');
      pinCommandTarget(battle, command.targetId);
      const result = resolveRound(battle, content);
      save.battle = result.battle;
      natural(result.goldEarned, '獲得ゴールド', true);
      save.gold += result.goldEarned;
      save.discoveredIds = [...new Set([...save.discoveredIds, ...result.discoveredIds])];
      save.seed = result.battle.seed;
      break;
    }
    case 'replay': {
      if (!save.battle || save.battle.phase !== 'playing') fail('再生できる演出がありません。');
      const before = save.battle;
      const finishedWave = before.cursor + 1 >= before.events.length && ['wave', 'reward'].includes(before.nextPhase) ? before.wave : undefined;
      save.battle = advanceReplay(before, content);
      if (finishedWave !== undefined) secureMemoryChest(save, finishedWave, content);
      save.seed = save.battle.seed;
      break;
    }
    case 'potion': {
      const battle = ready(save);
      if (save.potions < 1) fail('回復薬を持っていません。');
      save.battle = usePotion(battle, command.unitId);
      save.potions -= 1;
      break;
    }
    case 'retreat': {
      const battle = ready(save);
      battle.failureKind = 'retreat';
      if (battle.blooms) delete battle.blooms.flower;
      if (battle.fairies) delete battle.fairies.visitor;
      battle.phase = 'failed'; battle.nextPhase = 'failed'; battle.failureReason = content.dungeons.find(item => item.id === battle.dungeonId)?.kind === 'trial' ? '試練から撤退しました。' : '撤退しました。今回の仮取得素材は失われました。';
      battle.pendingMaterials = {};
      log(save, '探索から撤退しました。撃破ゴールドは保持されます。');
      break;
    }
    case 'claim': {
      const battle = save.battle;
      if (!battle || battle.phase !== 'reward' || battle.cursor < battle.events.length || battle.nextPhase !== 'reward') fail('報酬はクリア演出の完了後に確定できます。');
      if (save.claimedExplorationIds.includes(battle.id)) fail('この探索の報酬は確定済みです。');
      const dungeon = content.dungeons.find(item => item.id === battle.dungeonId);
      if (!dungeon) fail('探索の報酬定義がありません。');
      if (dungeon.kind === 'trial' && (Object.keys(battle.pendingMaterials).length || battle.goldEarned)) fail('腕試しに戦利品はありません。');
      for (const [id, count] of Object.entries(battle.pendingMaterials)) {
        natural(count, '素材数', true);
        save.materials[id] = (save.materials[id] ?? 0) + count;
      }
      if (dungeon.kind !== 'trial') {
        save.gold += 20;
        const inventory = save.memoryGems ??= emptyGemInventory();
        const family = dungeonGemFamily(dungeon);
        inventory.dust[family] = (inventory.dust[family] ?? 0) + (dungeon.towerFloor ? towerDustReward(dungeon) : 1);
      }
      save.stones += dungeonStoneReward(dungeon, save.completedDungeonIds);
      const previouslyCleared = save.completedDungeonIds.includes(battle.dungeonId);
      if (!save.completedDungeonIds.includes(battle.dungeonId)) save.completedDungeonIds.push(battle.dungeonId);
      if (dungeon.towerFloor) {
        save.towerRecord ??= { version: '1.10', completedFloors: [], legacyHighest: 0 };
        if (!save.towerRecord.completedFloors.includes(dungeon.towerFloor)) save.towerRecord.completedFloors.push(dungeon.towerFloor);
        save.towerRecord.completedFloors.sort((a,b) => a-b);
      }
      for (const offer of scoutRecruitments) if (offer.dungeonId === dungeon.id && !save.discoveredIds.includes(offer.characterId)) save.discoveredIds.push(offer.characterId);
      save.claimedExplorationIds.push(battle.id);
      log(save, dungeon.kind === 'trial' ? '女神の試練を踏破しました。' : '探索報酬を確定しました。素材をカバンへ持ち帰りました。');
      save.battle = null;
      enqueueMilestone(save, dungeon.id, previouslyCleared, content);
      break;
    }
    case 'leaveFailure': {
      if (!save.battle || save.battle.phase !== 'failed') fail('終了できる探索がありません。');
      log(save, '街へ帰還しました。次の探索は全回復で始まります。');
      save.battle = null;
      break;
    }
    case 'buyPotion': {
      town(save); natural(command.count, '購入数');
      const price = command.count * 10;
      if (!Number.isSafeInteger(price) || save.gold < price || !Number.isSafeInteger(save.potions + command.count)) fail('購入に必要なゴールドが不足しています。');
      save.gold -= price; save.potions += command.count;
      log(save, `回復薬を${command.count}個購入しました。`);
      break;
    }
    case 'goldRecruit': {
      town(save);
      const offer = content.goldExchanges?.find(item => item.id === command.exchangeId && item.published);
      const character = offer && content.characters.find(item => item.id === offer.characterId && item.published && item.rarity === 'SSR' && item.origin.length === 1 && item.origin.includes('gold_exchange'));
      if (!offer || !character || !Number.isSafeInteger(offer.goldCost) || offer.goldCost <= 0) fail('交換できる女神が見つかりません。');
      if (save.ownedIds.includes(character.id)) fail('このキャラクターはすでに仲間です。');
      if (save.gold < offer.goldCost) fail('交換に必要なゴールドが不足しています。');
      save.gold -= offer.goldCost;
      save.ownedIds.push(character.id);
      log(save, `${character.name}が仲間になりました。`);
      break;
    }
    case 'recruit': {
      town(save);
      const character = content.characters.find(item => item.id === command.characterId && item.published && item.origin.includes('recruit') && !item.origin.includes('gacha') && !item.origin.includes('xr_gacha'));
      if (!character || !save.discoveredIds.includes(character.id)) fail('一度倒した仲間化可能なキャラクターを選んでください。');
      if (save.ownedIds.includes(character.id)) fail('このキャラクターはすでに仲間です。');
      spendMaterials(save, recruitCost(character));
      save.ownedIds.push(character.id);
      log(save, `${character.name}が仲間になりました。`);
      break;
    }
    case 'eventRecruit': {
      town(save);
      if (!['normal', 'awakened'].includes(command.form)) fail('取得する形態を選んでください。');
      const event = content.events?.find(item => item.id === command.eventId && item.published);
      if (!event) fail('このイベントは公開されていません。');
      const id = command.form === 'normal' ? event.normalId : event.awakenedId;
      const char = content.characters.find(item => item.id === id && item.published && item.origin.includes('event'));
      if (!char) fail('取得できる仲間ではありません。');
      const lock = eventExchangeLock(event, command.form, save);
      if (lock) fail(lock);
      spendMaterials(save, [command.form === 'normal' ? event.normalCost : event.awakenedCost]);
      save.ownedIds.push(id);
      log(save, `${char.name}との契りが結ばれました。`);
      break;
    }
    case 'awaken': {
      town(save);
      const def = content.awakenings?.find(item => item.id === command.awakeningId);
      if (!def) fail('この覚醒は定義されていません。');
      const lock = awakeningLock(def, save, content);
      if (lock) fail(lock);
      spendMaterials(save, [def.cost]);
      save.ownedIds.push(def.awakenedId);
      if (!save.discoveredIds.includes(def.awakenedId)) save.discoveredIds.push(def.awakenedId);
      // Replace an active base form in place; retain both owned forms and leader status.
      save.partyIds = save.partyIds.map(id => id === def.baseId ? def.awakenedId : id);
      if (save.leaderId === def.baseId) save.leaderId = def.awakenedId;
      validateParty(save, save.partyIds, save.leaderId, content);
      log(save, `${content.characters.find(char => char.id === def.awakenedId)!.name}が覚醒しました。`);
      break;
    }
    case 'exchange': {
      town(save);
      if (!content.species.some(species => species.id === command.speciesId)) fail('素材の種族が正しくありません。');
      if (isolatedMaterialSpecies(content, command.speciesId)) fail('専用素材は合成・分解できません。');
      const rarities: Rarity[] = ['common', 'rare', 'epic'];
      const index = rarities.indexOf(command.rarity);
      if (index < 0 || !['up', 'down'].includes(command.direction)) fail('交換内容が正しくありません。');
      const targetIndex = index + (command.direction === 'up' ? 1 : -1);
      if (targetIndex < 0 || targetIndex >= rarities.length) fail('このレア度はその方向に交換できません。');
      const from = `${command.speciesId}:${command.rarity}`;
      const to = `${command.speciesId}:${rarities[targetIndex]}`;
      const cost = command.direction === 'up' ? 5 : 1;
      if ((save.materials[from] ?? 0) < cost) fail('交換に必要な素材が不足しています。');
      save.materials[from] = (save.materials[from] ?? 0) - cost;
      save.materials[to] = (save.materials[to] ?? 0) + (command.direction === 'up' ? 1 : 3);
      break;
    }
    case 'party': {
      town(save); validateParty(save, command.partyIds, command.leaderId, content);
      save.partyIds = [...command.partyIds]; save.leaderId = command.leaderId;
      break;
    }
    case 'draw': {
      town(save);
      if (content.dungeons.filter(item => item.published && item.kind !== 'event').length < 10) fail('ガチャは正式コンテンツの公開時に解放されます。');
      const count = command.count ?? 1;
      if (count !== 1 && count !== 10) fail('祈願回数は1回または10回を指定してください。');
      if (save.stones < initialGacha.stoneCost * count) fail(`召喚には石が${initialGacha.stoneCost * count}個必要です。`);
      const collection = gachaCollections.find(item => item.id === (command.collectionId ?? initialGacha.id));
      if (!collection) fail('選択した祈願が見つかりません。');
      const available = content.characters.filter(item => item.published && item.origin.includes('gacha') && gachaPoolIds(collection!).includes(item.id));
      if (available.some(character => character.rarity === 'XR')) fail('XRは星晶の祈願限定です。');
      if (!available.length) fail('召喚できるキャラクターがいません。');
      const results: GachaResult[] = [];
      for (let index = 0; index < count; index++) {
        const pity = gachaPity(save);
        const guaranteed = introductoryGuarantee(save) || pity + 1 >= initialGacha.hardPity;
        let roll = rng(save.seed); save.seed = roll.seed;
        const ssrRate = gachaSSRRate(pity, collection) / 100;
        const rarity = guaranteed || roll.value >= 1 - ssrRate ? 'SSR' : roll.value < (1 - ssrRate) * collection.rates.R / (collection.rates.R + collection.rates.SR) ? 'R' : 'SR';
        const candidates = available.filter(item => item.rarity === rarity);
        if (guaranteed && !candidates.length) fail('SSR保証対象がありません。石は消費されません。');
        if (!candidates.length) fail('選択したレアリティの対象がありません。石は消費されません。');
        roll = rng(save.seed); save.seed = roll.seed;
        const selected = rarity === 'SSR' ? pickSSR(candidates, collection, roll.value, guaranteed) : candidates[Math.min(candidates.length - 1, Math.floor(roll.value * candidates.length))]!;
        if (selected.rarity === 'XR') fail('XRは星晶の祈願限定です。');
        const duplicate = save.ownedIds.includes(selected.id);
        const refund = duplicate ? initialGacha.duplicateRefund[selected.rarity] : 0;
        save.stones = save.stones - initialGacha.stoneCost + refund;
        save.drawCount += 1;
        if (!duplicate) save.ownedIds.push(selected.id);
        save.ssrPity = selected.rarity === 'SSR' ? 0 : pity + 1;
        save.lastGachaResult = { characterId: selected.id, duplicate, refund };
        log(save, `召喚：${selected.rarity} ${selected.name}が訪れました。`, `draw-${save.drawCount}`);
        results.push(save.lastGachaResult!);
      }
      save.lastGachaResults = results;
      break;
    }
    case 'drawXR': {
      town(save);
      const lock = xrGachaLock(save, content);
      if (lock) fail(lock);
      const banner = content.xrGacha!;
      const count = command.count ?? 1;
      if (count !== 1 && count !== 10) fail('祈願回数は1回または10回を指定してください。');
      const balance = save.astralStones ?? 0;
      natural(balance, '星晶石', true);
      if (balance < banner.stoneCost * count) fail('星晶石が不足しています。');
      const pool = content.characters.filter(character => character.published && banner.characterIds.includes(character.id));
      natural((save.xrDrawCount ?? 0) + count, '星晶の祈願回数', true);
      // Preserve legacy normal pity before premium history displaces old normal rolls.
      save.ssrPity = gachaPity(save);
      const results: GachaResult[] = [];
      for (let index = 0; index < count; index++) {
        const rarityRoll = rng(save.seed), characterRoll = rng(rarityRoll.seed);
        save.seed = characterRoll.seed;
        const selected = pickXR(pool, banner, rarityRoll.value, characterRoll.value);
        const duplicate = save.ownedIds.includes(selected.id);
        const refund = duplicate ? banner.duplicateRefund[selected.rarity] : 0;
        save.astralStones = (save.astralStones ?? 0) - banner.stoneCost + refund;
        save.xrDrawCount = (save.xrDrawCount ?? 0) + 1;
        if (!duplicate) save.ownedIds.push(selected.id);
        save.lastGachaResult = { characterId: selected.id, duplicate, refund, currency: 'astralStones' };
        results.push(save.lastGachaResult);
        log(save, `星晶召喚：${selected.rarity} ${selected.name}が訪れました。`, `xr-${save.xrDrawCount}`);
      }
      save.lastGachaResults = results;
      break;
    }
    case 'settings': {
      const patch = command.settings;
      for (const key of ['bgmVolume', 'seVolume'] as const) if (patch[key] !== undefined && (!Number.isFinite(patch[key]) || patch[key]! < 0 || patch[key]! > 1)) fail('音量は0〜1の範囲で指定してください。');
      if (patch.speed !== undefined && patch.speed !== 1 && patch.speed !== 2) fail('演出速度が正しくありません。');
      if (patch.reducedMotion !== undefined && typeof patch.reducedMotion !== 'boolean') fail('演出設定が正しくありません。');
      if (patch.homeCharacterId !== undefined && patch.homeCharacterId !== null && (typeof patch.homeCharacterId !== 'string' || !save.ownedIds.includes(patch.homeCharacterId) || !content.characters.some(char => char.id === patch.homeCharacterId))) fail('ホームのキャラクターは所持している仲間から選んでください。');
      save.settings = { ...save.settings, ...patch };
      break;
    }
    default: fail('不明な操作です。');
  }
  // Account for generated actions once. Replaying their visuals never adds them again.
  const active = save.battle;
  if (active?.tracking) {
    if (previous.battle && ['round', 'battleBloom', 'battleFairy'].includes(command.type)) {
      trackEventBatch(active.tracking, active, { round: previous.battle.round, wave: previous.battle.wave });
      if (command.type === 'round') active.tracking.review.rounds++;
    }
    if (command.type === 'potion' && previous.battle) trackPotion(active.tracking, previous.battle.units, active.units);
    if (active.phase === 'reward' || active.phase === 'failed') finishTracking(active.tracking, context.now);
  }
  if ((command.type === 'claim' || command.type === 'leaveFailure') && previous.battle) finalizeExpedition(previous, save, previous.battle, content);
  if (!Number.isSafeInteger(save.gold) || !Number.isSafeInteger(save.stones)) fail('所持数の上限を超えています。');
  save.revision = previous.revision + 1;
  return save;
}
