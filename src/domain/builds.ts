import { dungeonLock } from './events';
import { dungeonDifficulty } from './engine';
import { GEM_CRAFT_COST, GEM_DEFINITIONS, dungeonGemFamily, gemRoll, validMemoryGem, type GemFamily, type GemTrait, type GemVariant, type MemoryGem } from './memory-gems';
import type { Content, GameSave } from './types';

export type BuildStage = 'starter' | 'complete' | 'perfect';
export interface BuildGemTarget { defId: string; variant: GemVariant; power: number; trait?: GemTrait; value?: number; coreTrait?: GemTrait }
export interface BuildSlot { id: string; label: string; characterIds: string[]; gem: BuildGemTarget }
export interface BuildStageDefinition { label: string; description: string; slots: BuildSlot[]; leaderSlot: number }
export interface BuildDefinition { id: string; name: string; tagline: string; description: string; mechanic: string; steps: string[]; stages: Record<BuildStage, BuildStageDefinition> }
export interface BuildGoal { buildId: string; stage: BuildStage }
export interface BuildSlotPlan {
  slot: BuildSlot; characterId: string | null; preferredCharacterId: string; substitute: boolean;
  gem: MemoryGem | null; gemStatus: 'ready' | 'upgrade' | 'missing'; ownerId: string | null;
  needsTransfer: boolean; functional: boolean; fulfilled: boolean;
}
export interface BuildPlan {
  definition: BuildDefinition; stage: BuildStage; stageDefinition: BuildStageDefinition; slots: BuildSlotPlan[];
  partyIds: string[]; leaderId: string | null; readyCount: number; totalCount: number;
  missingCharacters: number; missingGems: number; upgradeGems: number; transferGemIds: string[];
  functional: boolean; canApply: boolean; complete: boolean;
}
export interface BuildFarmSource {
  id: string; kind: 'dungeon' | 'craft'; name: string; description: string; family: GemFamily;
  dungeonId?: string; unlockDungeonId?: string; locked: boolean; lockReason: string | null; bossOnly: boolean;
  craftCost?: number; waves?: number; towerFloor?: number; difficulty?: number;
}

const stages: BuildStage[] = ['starter', 'complete', 'perfect'];
const stageMeta: Record<BuildStage, { label: string; description: string; power: number; value: number }> = {
  starter: { label: '入門', description: 'まず仕組みを動かす。特性値の高さより、必要な石と役割をそろえる。', power: 0, value: 0 },
  complete: { label: '完成', description: '同じ術式の効力と特性を磨き、普段の探索で使いやすくする。', power: 50, value: 40 },
  perfect: { label: '厳選', description: '効力85以上と狙った特性を目指す長期目標。最上階の突破を保証するものではない。', power: 85, value: 80 },
};
function slot(id: string, label: string, characterIds: string[], defId: string, stage: BuildStage, trait?: GemTrait, coreTrait?: GemTrait): BuildSlot {
  const meta = stageMeta[stage];
  return { id, label, characterIds, gem: { defId, variant: 'pure', power: meta.power, ...(trait ? { trait, value: meta.value } : {}), ...(coreTrait ? { coreTrait } : {}) } };
}
function defineStages(make: (stage: BuildStage) => BuildSlot[], leaderSlot = 2): Record<BuildStage, BuildStageDefinition> {
  return Object.fromEntries(stages.map(stage => [stage, { label: stageMeta[stage].label, description: stageMeta[stage].description, slots: make(stage), leaderSlot }])) as Record<BuildStage, BuildStageDefinition>;
}

/** Every named mechanism is present even in the entry recipe; stages raise quality, not promises. */
export const BUILD_DEFINITIONS: BuildDefinition[] = [
  {
    id: 'echo-chain', name: '残響連鎖', tagline: '一撃を、隣の敵と次のラウンドへ。',
    description: '残響石の単体攻撃に連鎖の特性を組み合わせ、別の敵への追加攻撃と次ラウンドの追撃を狙う。範囲役は別に置く。',
    mechanic: '連鎖は主攻撃の対象に含まれない敵1体へ発動する。残響の追撃や連鎖から、さらに連鎖・追撃は生まれない。',
    steps: ['先頭に、連鎖の特性が付いた残響石を託す。', '残響石があっても連鎖がなければ、欠片を集めて特性を調律する。製作だけでは連鎖は付かない。', '敵が2体以上いるときに残響石を使い、別の敵への連鎖を狙う。', '次ラウンドの追撃と、範囲役の攻撃で残った敵を削る。'],
    stages: defineStages(stage => [
      slot('striker', '残響と連鎖の起点', stage === 'starter' ? ['seris', 'seris-awakened', 'nox'] : ['seris-awakened', 'nox', 'seris'], 'echo-shard', stage, 'chain', 'chain'),
      slot('sweeper', '残った敵を削る範囲役', ['noelle', 'noelle-awakened', 'asteria'], 'clear-tear', stage, stage === 'starter' ? undefined : 'bulwark'),
      slot('guardian', '攻撃役を守る盾', ['liora', 'liora-awakened', 'athena'], 'pale-ward', stage, stage === 'starter' ? undefined : 'bulwark'),
      slot('healer', '回復と吸収の支え', ['elaine', 'elaine-awakened', 'miette'], 'night-dew', stage, stage === 'starter' ? undefined : 'mercy'),
    ]),
  },
  {
    id: 'shield-cannon', name: '障壁砲台', tagline: '守りをためて、一発の砲撃へ。',
    description: '白灯石と盾役が作った障壁を、先頭の砕盾石で攻撃に変える。砲撃役を1人に絞って、障壁の使いどきを選ぶ。',
    mechanic: '砕盾石は味方の最も大きい障壁を1つ消費する。障壁がないと使えず、砲撃後はその守りが失われる。',
    steps: ['白灯石や盾役のスキルで味方に障壁を作る。', '障壁が残っているラウンドに、先頭へ砕盾石を指示する。', '砲撃後は障壁を張り直す。敵の大技前は、攻撃へ使うか守りに残すかを選ぶ。'],
    stages: defineStages(stage => [
      slot('cannon', '障壁を撃ち出す砲撃役', stage === 'starter' ? ['seris', 'seris-awakened', 'nox'] : ['seris-awakened', 'nox', 'seris'], 'shield-break', stage, stage === 'starter' ? undefined : 'execution'),
      slot('generator', '白灯石で障壁を補給', ['noelle', 'noelle-awakened'], 'pale-ward', stage, stage === 'starter' ? undefined : 'bulwark'),
      slot('guardian', '守りを維持する盾役', ['liora', 'liora-awakened'], 'clear-tear', stage, stage === 'starter' ? undefined : 'bulwark'),
      slot('healer', '砲撃後の立て直し', ['elaine', 'elaine-awakened', 'miette'], 'night-dew', stage, stage === 'starter' ? undefined : 'mercy'),
    ]),
  },
  {
    id: 'rabbit-battery', name: 'うさぎの星炉', tagline: '星炉から力を送り、うさぎ隊を呼ぶ。',
    description: '星炉の記憶でルネットの必殺ゲージを補給する。星炉役・盾役・回復役で、召喚までの時間を支える。',
    mechanic: '星炉は自分以外でゲージ65以下の、攻撃力が最も高い仲間へ送電する。送電役はHPを10%消費し、HP20%以下では使えない。',
    steps: ['星炉の記憶は機巧系統の踏破宝箱から探す。入門でも必要で、製作はできない。', 'ルネットが他の受け手より高い攻撃力になる編成を保つ。ゲージが65を超えると星炉の対象から外れる。', 'ルネットのゲージが満ちたら枠をタップして必殺技を予約し、ATTACKで発動する。'],
    stages: defineStages(stage => [
      slot('rabbit', 'うさぎ隊を呼ぶ主役', stage === 'starter' ? ['lunette', 'lunette-awakened'] : ['lunette-awakened', 'lunette'], 'echo-shard', stage, stage === 'starter' ? undefined : 'chain'),
      slot('battery', '星炉からゲージを補給', ['noelle', 'noelle-awakened'], 'star-furnace', stage, stage === 'starter' ? undefined : 'bulwark'),
      slot('guardian', '送電役を守る盾', ['liora', 'liora-awakened'], 'pale-ward', stage, stage === 'starter' ? undefined : 'bulwark'),
      slot('healer', 'HP消費を支える祈り手', ['elaine', 'elaine-awakened', 'miette'], 'clear-tear', stage, stage === 'starter' ? undefined : 'bulwark'),
    ]),
  },
];

export function isBuildStage(value: unknown): value is BuildStage { return typeof value === 'string' && stages.includes(value as BuildStage); }
export function getBuildDefinition(id: string): BuildDefinition | undefined { return BUILD_DEFINITIONS.find(build => build.id === id); }
export function validBuildGoal(value: unknown): value is BuildGoal {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const goal = value as Record<string, unknown>;
  return typeof goal.buildId === 'string' && Boolean(getBuildDefinition(goal.buildId)) && isBuildStage(goal.stage);
}
export function gemMeetsBuildTarget(gem: MemoryGem, target: BuildGemTarget): boolean {
  const roll = gemRoll(gem);
  return gem.defId === target.defId && gem.variant === target.variant && roll.power >= target.power
    && (!target.trait || roll.trait === target.trait && roll.value >= (target.value ?? 0))
    && (!target.coreTrait || roll.trait === target.coreTrait);
}

function chooseCharacters(content: Content, save: GameSave, slots: BuildSlot[]): (string | null)[] {
  let best: (string | null)[] = slots.map(() => null), bestScore = -1;
  function visit(index: number, selected: (string | null)[], families: Set<string>, score: number): void {
    if (index === slots.length) { if (score > bestScore) { best = [...selected]; bestScore = score; } return; }
    const slot = slots[index];
    for (const [rank, id] of slot.characterIds.entries()) {
      const char = content.characters.find(char => char.id === id && char.published);
      if (!char || !save.ownedIds.includes(id)) continue;
      const family = char.familyId ?? char.id;
      if (families.has(family)) continue;
      visit(index + 1, [...selected, id], new Set([...families, family]), score + 10000 - rank);
    }
    visit(index + 1, [...selected, null], families, score);
  }
  visit(0, [], new Set(), 0);
  return best;
}
function gemScore(gem: MemoryGem, target: BuildGemTarget, characterId: string | null, equipped: Record<string, string>): number {
  const roll = gemRoll(gem);
  const owner = Object.keys(equipped).find(id => equipped[id] === gem.id);
  const core = !target.coreTrait || roll.trait === target.coreTrait;
  const deficit = Math.max(0, target.power - roll.power) + (target.trait && target.trait !== roll.trait ? 150 : Math.max(0, (target.value ?? 0) - roll.value));
  return 100000 + Number(core) * 10000 + Number(gemMeetsBuildTarget(gem, target)) * 10000 - deficit * 10
    + (owner === characterId ? 4 : !owner ? 2 : 0);
}
function chooseGems(save: GameSave, slots: BuildSlot[], characters: (string | null)[]): (MemoryGem | null)[] {
  const equipped = save.memoryGems?.equipped ?? {};
  const inventory = save.memoryGems?.items.filter(validMemoryGem) ?? [];
  const candidates = slots.map((slot, index) => inventory.filter(gem => gem.defId === slot.gem.defId && gem.variant === slot.gem.variant)
    .sort((a,b) => gemScore(b,slot.gem,characters[index],equipped) - gemScore(a,slot.gem,characters[index],equipped) || a.id.localeCompare(b.id)).slice(0, slots.length));
  let best: (MemoryGem | null)[] = slots.map(() => null), bestScore = -1;
  function visit(index: number, selected: (MemoryGem | null)[], ids: Set<string>, score: number): void {
    if (index === slots.length) { if (score > bestScore) { best = [...selected]; bestScore = score; } return; }
    for (const gem of candidates[index]) {
      if (ids.has(gem.id)) continue;
      visit(index + 1, [...selected, gem], new Set([...ids,gem.id]), score + gemScore(gem,slots[index].gem,characters[index],equipped));
    }
    visit(index + 1, [...selected,null], ids, score);
  }
  visit(0, [], new Set(), 0);
  return best;
}

/** Read-only matching: neither a hypothetical recipe nor opening this screen grants any equipment. */
export function getBuildPlan(content: Content, save: GameSave, buildId: string, stage: BuildStage): BuildPlan {
  const definition = getBuildDefinition(buildId);
  if (!definition || !isBuildStage(stage)) throw new Error('ビルドの目標が正しくありません。');
  return planBuildDefinition(content,save,definition,stage);
}

/** Shared allocator for authored recipes; callers should resolve saved IDs through getBuildPlan. */
export function planBuildDefinition(content: Content, save: GameSave, definition: BuildDefinition, stage: BuildStage): BuildPlan {
  const stageDefinition = definition.stages[stage];
  const characters = chooseCharacters(content,save,stageDefinition.slots);
  const gems = chooseGems(save,stageDefinition.slots,characters);
  const equipped = save.memoryGems?.equipped ?? {};
  const slots: BuildSlotPlan[] = stageDefinition.slots.map((slot,index) => {
    const characterId = characters[index], gem = gems[index];
    const ready = Boolean(gem && gemMeetsBuildTarget(gem,slot.gem));
    const ownerId = gem ? Object.keys(equipped).find(id => equipped[id] === gem.id) ?? null : null;
    const functional = Boolean(characterId && gem && (!slot.gem.coreTrait || gemRoll(gem).trait === slot.gem.coreTrait));
    return { slot, characterId, preferredCharacterId:slot.characterIds[0], substitute:Boolean(characterId && characterId !== slot.characterIds[0]), gem,
      gemStatus:gem ? ready ? 'ready' : 'upgrade' : 'missing', ownerId, needsTransfer:Boolean(ownerId && characterId && ownerId !== characterId), functional, fulfilled:Boolean(characterId && ready) };
  });
  const functional = slots.length === 4 && slots.every(slot => slot.functional);
  return { definition,stage,stageDefinition,slots, partyIds:characters.filter((id): id is string => Boolean(id)), leaderId:characters[stageDefinition.leaderSlot] ?? null,
    readyCount:slots.filter(slot => slot.fulfilled).length, totalCount:slots.length,
    missingCharacters:slots.filter(slot => !slot.characterId).length, missingGems:slots.filter(slot => slot.gemStatus === 'missing').length,
    upgradeGems:slots.filter(slot => slot.gemStatus === 'upgrade').length, transferGemIds:slots.filter(slot => slot.needsTransfer).map(slot => slot.gem!.id),
    functional,canApply:functional && !save.battle && !save.memoryGems?.pending,complete:slots.every(slot => slot.fulfilled) };
}

/** An unlock suggestion advances a missing prerequisite; it is not a new gem drop source. */
function reachablePrerequisite(content: Content, save: GameSave, dungeonId: string): string | undefined {
  const target = content.dungeons.find(dungeon => dungeon.id === dungeonId);
  if (!target || !dungeonLock(target,save,content)) return undefined;
  let previous = target.previousDungeonId;
  const seen = new Set([dungeonId]);
  while (previous && !seen.has(previous)) {
    seen.add(previous);
    // Repeating a claimed route cannot fix an ownership gate or a missing tower floor.
    if (save.completedDungeonIds.includes(previous)) return undefined;
    const dungeon = content.dungeons.find(dungeon => dungeon.id === previous);
    if (!dungeon?.published || dungeon.kind === 'trial') return undefined;
    if (!dungeonLock(dungeon,save,content)) return dungeon.towerFloor ? undefined : dungeon.id;
    previous = dungeon.previousDungeonId;
  }
  return undefined;
}

/** Family pools are shared by all listed routes; no source promises a particular stone. */
export function findGemSources(content: Content, save: GameSave, defId: string): BuildFarmSource[] {
  const definition = GEM_DEFINITIONS.find(def => def.id === defId);
  if (!definition) return [];
  const bossOnly = Boolean(definition.bossOnly);
  const sources: BuildFarmSource[] = content.dungeons.filter(dungeon => dungeon.published && dungeon.kind !== 'trial' && dungeon.waves.length > 0 && dungeonGemFamily(dungeon) === definition.family).map(dungeon => {
    const lockReason = dungeonLock(dungeon,save,content);
    const unlockDungeonId = lockReason ? reachablePrerequisite(content,save,dungeon.id) : undefined;
    return { id:dungeon.id,kind:'dungeon',name:dungeon.name,description:bossOnly ? '同じ系統の踏破宝箱から抽選。狙った石の確定入手ではありません。' : '同じ系統の宝箱から抽選。狙った石の確定入手ではありません。',
      family:definition.family,dungeonId:dungeon.id,...(unlockDungeonId ? {unlockDungeonId} : {}),locked:Boolean(lockReason),lockReason,bossOnly,waves:dungeon.waves.length,difficulty:dungeonDifficulty(dungeon,content),...(dungeon.towerFloor ? {towerFloor:dungeon.towerFloor} : {}) };
  });
  sources.sort((a,b) => Number(a.locked)-Number(b.locked) || Number(Boolean(a.towerFloor))-Number(Boolean(b.towerFloor)) || (a.difficulty ?? 0)-(b.difficulty ?? 0) || (a.waves ?? 0)-(b.waves ?? 0) || (a.towerFloor ?? 0)-(b.towerFloor ?? 0) || a.id.localeCompare(b.id));
  if (!bossOnly) {
    const lockReason = save.battle ? '探索を終了してから製作できます。' : (save.memoryGems?.dust[definition.family] ?? 0) < GEM_CRAFT_COST ? '同じ系統の欠片を集めて製作できます。' : null;
    sources.unshift({id:`craft:${defId}`,kind:'craft',name:'澄明の石を製作',description:'基本の術式を製作できます。追加特性は付かないため、必要な特性は調律で狙います。',family:definition.family,locked:Boolean(lockReason),lockReason,bossOnly:false,craftCost:GEM_CRAFT_COST});
  }
  return sources;
}
