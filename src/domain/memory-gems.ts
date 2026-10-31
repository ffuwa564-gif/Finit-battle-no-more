import type { DungeonDef, SkillDef } from './types';

export type GemFamily = 'sanctuary' | 'clock' | 'grave';
export type GemVariant = 'pure' | 'echo' | 'swift';
export type GemTrait = 'none' | 'chain' | 'bulwark' | 'execution' | 'mercy';
export type GemTier = 1 | 2 | 3 | 4 | 5 | 6;
/** Probabilities apply independently to each existing affix, after a boss stone drops. */
export interface GemLootProfile { tier4Chance: number; tier5Chance: number; tier6Chance?: number; featuredDefId?: string }
export const TIER_RANGES: Record<GemTier, readonly [number, number]> = {
  1: [0, 33], 2: [34, 66], 3: [67, 100], 4: [120, 139], 5: [160, 179], 6: [220, 239],
};
export interface GemRoll { power: number; trait: GemTrait; value: number }
export type GemRefinementMode = 'power' | 'trait';
export interface MemoryGem { id: string; defId: string; variant: GemVariant; locked?: boolean; roll?: GemRoll }
export interface GemInventory { items: MemoryGem[]; equipped: Record<string, string>; dust: Record<string, number>; seen: string[]; craftSerial?: number; pending?: { gemId: string; candidate: MemoryGem } }
export interface GemDefinition { id: string; name: string; description: string; family: GemFamily; rarity: 'common' | 'rare' | 'epic'; skill: SkillDef; cooldown: number; variants: GemVariant[]; bossOnly?: boolean }

export const GEM_CRAFT_COST = 6;
export const GEM_FAMILIES: Record<GemFamily, { name: string; description: string; color: string }> = {
  sanctuary: { name: '聖域', description: '障壁と祈りを宿す記憶', color: '#d9cba0' },
  clock: { name: '機巧', description: '時と残響を操る記憶', color: '#95cbd9' },
  grave: { name: '黄昏', description: '夢と命を結ぶ記憶', color: '#bda7d6' },
};
export const GEM_VARIANTS: Record<GemVariant, { name: string; description: string }> = {
  pure: { name: '澄明', description: '基本の術式。' },
  echo: { name: '残響', description: '実際に与えたダメージの35%で次ラウンドに追撃（障壁・かばうは有効）。再使用が1ラウンド延びる。' },
  swift: { name: '速唱', description: '攻撃の威力を抑え、再使用が1ラウンド早まる。' },
};

function definition(id: string, name: string, description: string, family: GemFamily, template: SkillDef['template'], cooldown: number, strength = 14, options: { variants?: GemVariant[]; bossOnly?: boolean; rarity?: GemDefinition['rarity'] } = {}): GemDefinition {
  const soundProfile = ['barrier'].includes(template) ? 'guard' : ['cleanse', 'overclock', 'buff'].includes(template) ? 'buff' : template === 'mend_pair' ? 'heal' : ['dispel', 'sleep'].includes(template) ? 'debuff' : 'attack';
  return { id, name, description, family, rarity: options.rarity ?? 'common', skill: { id: `memory:${id}:pure:catalogue`, name, template, strength, soundProfile }, cooldown, variants: options.variants ?? ['pure'], ...(options.bossOnly ? { bossOnly: true } : {}) };
}

/** Loot changes available actions, never the wearer's permanent statistics. */
export const GEM_DEFINITIONS: GemDefinition[] = [
  definition('shield-break', '砕盾石', '味方の最も大きい障壁を消費し、敵1体への砲撃に変える。障壁があるときだけ使用できる。', 'sanctuary', 'attack', 4, 14, { variants: ['pure', 'echo', 'swift'] }),
  definition('echo-shard', '残響石', '敵1体を攻撃し、実際に与えたダメージの35%で次ラウンドに追撃（障壁・かばうは有効）。追撃は新たな行動や追撃を生まない。', 'clock', 'attack', 3, 14, { variants: ['pure', 'swift'] }),
  definition('rewind-thread', '巻戻しの石', '自分以外の味方1人の通常スキルの再使用待ちを1ラウンド短縮する。記憶石の技には作用しない。', 'clock', 'buff', 5),
  definition('clear-tear', '祓いの涙石', '味方1人の状態異常と防御低下を解除し、小回復する。', 'sanctuary', 'cleanse', 3),
  definition('pale-ward', '白灯石', '味方1人に次ラウンド終了までダメージを肩代わりする障壁を張る。障壁の重ね掛けでは量は増えない。', 'sanctuary', 'barrier', 3),
  definition('hollow-lantern', '奪灯石', '敵1体の攻撃強化と再生を解除し、その灯を攻撃力の高い味方へ移す。障壁は奪えない。', 'clock', 'dispel', 4),
  definition('dream-lace', '夢織石', '敵1体を眠らせる。ダメージで目覚めるため、攻撃する順番が重要。ボスには効きにくい。', 'grave', 'sleep', 4),
  definition('night-dew', '夜露石', '敵1体を攻撃し、与えたダメージの35%を自分のHPに吸収する。', 'grave', 'drain', 3, 14, { variants: ['pure', 'echo', 'swift'] }),
  definition('dawn-crown', '暁冠の記憶', '敵1体の防御を65%無視して攻撃する。防御低下中の敵なら威力が上昇する。', 'sanctuary', 'dawn', 4, 26, { bossOnly: true, rarity: 'epic', variants: ['pure', 'echo', 'swift'] }),
  definition('star-furnace', '星炉の記憶', '自分の最大HPの10%を消費して、別の味方1人の必殺ゲージを35充填する。自分のHPが20%より多い時に使用できる。', 'clock', 'overclock', 5, 14, { bossOnly: true, rarity: 'epic' }),
  definition('twin-tide', '双潮の記憶', '傷ついた味方2人を同時に回復する。1人ずつへの回復量は単体回復より控えめ。', 'grave', 'mend_pair', 3, 22, { bossOnly: true, rarity: 'epic' }),
];

const definitions = new Map(GEM_DEFINITIONS.map(def => [def.id, def]));
const families = Object.keys(GEM_FAMILIES) as GemFamily[];
const variants = Object.keys(GEM_VARIANTS) as GemVariant[];
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

export function emptyGemInventory(): GemInventory { return { items: [], equipped: {}, dust: { sanctuary: 0, clock: 0, grave: 0 }, seen: [] }; }
export function gemDefinition(gem: MemoryGem): GemDefinition {
  const def = definitions.get(gem.defId);
  if (!def || !def.variants.includes(gem.variant)) throw new Error('記憶石の定義がありません。');
  return def;
}
export function gemName(gem: MemoryGem): string { return `${GEM_VARIANTS[gem.variant].name}の${gemDefinition(gem).name}`; }
export function gemRarity(gem: MemoryGem): GemDefinition['rarity'] {
  const def = gemDefinition(gem);
  const roll = gemRoll(gem);
  if (def.bossOnly || roll.power >= 90 && roll.trait !== 'none' && roll.value >= 90) return 'epic';
  return gem.variant !== 'pure' || roll.trait !== 'none' || roll.power >= 70 ? 'rare' : def.rarity;
}
export function gemDescription(gem: MemoryGem): string {
  const def = gemDefinition(gem);
  let description = def.description;
  if (gem.roll && def.id === 'rewind-thread') description = `自分以外の味方1人の通常スキルの再使用待ちを${Math.min(2, Math.max(1, Math.floor(gemPowerMultiplier(gem))))}ラウンド短縮する。記憶石の技には作用しない。`;
  if (gem.roll && def.id === 'star-furnace') description = `自分の最大HPの10%を消費して、別の味方1人の必殺ゲージを${gemFurnaceCharge(gem)}充填する。自分のHPが20%より多い時に使用できる。`;
  if (gem.roll && def.id === 'dream-lace') description += ` 成功率は通常${Math.round(Math.min(95, 70 * gemPowerMultiplier(gem)))}%・ボス${Math.round(Math.min(60, 35 * gemPowerMultiplier(gem)))}%。ボスの睡眠は1回の行動まで。`;
  const sleepCharge = gemSleepChargeBonus(gem);
  if (sleepCharge > 0) description += ` 睡眠の成否にかかわらず、自分の必殺ゲージを追加で${sleepCharge}充填する。`;
  return `${description} ${gem.variant === 'pure' ? '' : GEM_VARIANTS[gem.variant].description + ' '}再使用まで${gemCooldown(gemSkill(gem).id)}ラウンド。`;
}
export const gemTraitInfo: Record<GemTrait, { name: string; description: string }> = {
  none: { name: 'なし', description: '追加特性なし。' },
  chain: { name: '連鎖', description: '別の敵1体へ攻撃力の45〜129%で追加攻撃。追加攻撃から特性は再発動しない。' },
  bulwark: { name: '庇護', description: 'HP割合が最も低い味方に最大HPの10〜46%の障壁を追加。障壁の合計上限は最大HPの60%。' },
  execution: { name: '処刑', description: '残りHP35%以下の敵への技の威力が20〜116%上昇。' },
  mercy: { name: '慈雨', description: '実際に与えたHPダメージの20〜92%で、HP割合が最も低い味方を回復。' },
};
const damagingTemplates = new Set<SkillDef['template']>(['attack', 'area', 'pierce', 'drain', 'shatter', 'dawn']);
const defaultRoll: GemRoll = { power: 0, trait: 'none', value: 0 };
export function supportedGemTraits(gem: Pick<MemoryGem, 'defId'> | GemDefinition | string): GemTrait[] {
  const id = typeof gem === 'string' ? gem : 'defId' in gem ? gem.defId : gem.id;
  const def = definitions.get(id);
  return def && damagingTemplates.has(def.skill.template) ? ['none', 'chain', 'bulwark', 'execution', 'mercy'] : ['none', 'bulwark'];
}
export function gemRoll(gem: MemoryGem): GemRoll { return gem.roll ? { ...gem.roll } : { ...defaultRoll }; }
function tierForValue(value: number): GemTier {
  if (value >= TIER_RANGES[6][0]) return 6;
  if (value >= TIER_RANGES[5][0]) return 5;
  if (value >= TIER_RANGES[4][0]) return 4;
  if (value >= TIER_RANGES[3][0]) return 3;
  return value >= TIER_RANGES[2][0] ? 2 : 1;
}
export function gemPowerTier(gem: MemoryGem): GemTier { return tierForValue(gemRoll(gem).power); }
export function gemTraitTier(gem: MemoryGem): GemTier | 0 { const roll = gemRoll(gem); return roll.trait === 'none' ? 0 : tierForValue(roll.value); }
export function gemTier(gem: MemoryGem): GemTier { return Math.max(gemPowerTier(gem), gemTraitTier(gem)) as GemTier; }
/** Every raw value within these acquired tiers has the same capped effect/cadence. */
export function gemPowerRefinementIsFixed(gem: MemoryGem): boolean {
  return gemPowerTier(gem) >= 4 && ['rewind-thread', 'star-furnace', 'dream-lace'].includes(gem.defId);
}
/** Dream-lace keeps its original cadence; higher power rewards the same action. */
export function gemSleepChargeBonus(gem: MemoryGem): number {
  return gem.defId === 'dream-lace' ? Math.max(0, gemPowerTier(gem) - 3) * 15 : 0;
}
/** Preserve legacy unrolled resonance; acquired power tiers set rolled charge caps. */
export function gemFurnaceCharge(gem: MemoryGem, potency = gemPowerMultiplier(gem)): number {
  const charge = Math.round(35 * potency);
  return gem.roll ? Math.min(gemPowerTier(gem) >= 6 ? 80 : 70, charge) : charge;
}
/** Actual percentage used by both battle resolution and descriptions. */
export function gemTraitAmount(gem: MemoryGem): number {
  const { trait, value } = gemRoll(gem);
  if (trait === 'chain') return 45 + Math.round(value * .35);
  if (trait === 'bulwark') return 10 + Math.round(value * .15);
  if (trait === 'execution') return 20 + Math.round(value * .4);
  if (trait === 'mercy') return 20 + Math.round(value * .3);
  return 0;
}
export function gemPowerMultiplier(gem: MemoryGem): number { return 1 + gemRoll(gem).power * .015; }
export function gemRollKey(gem: MemoryGem): string {
  const roll = gemRoll(gem), key = `${gem.defId}:${gem.variant}`;
  return roll.power === 0 && roll.trait === 'none' && roll.value === 0 ? key : `${key}:${roll.power}:${roll.trait}:${roll.value}`;
}
export function gemTraitDescription(gem: MemoryGem): string {
  const { trait } = gemRoll(gem), amount = gemTraitAmount(gem);
  if (trait === 'chain') return `別の敵1体へ攻撃力の${amount}%で追加攻撃。追加攻撃から特性は再発動しない。`;
  if (trait === 'bulwark') return `HP割合が最も低い味方に最大HPの${amount}%の障壁を追加。障壁の合計上限は最大HPの60%。`;
  if (trait === 'execution') return `残りHP35%以下の敵への技の威力が${amount}%上昇。`;
  if (trait === 'mercy') return `実際に与えたHPダメージの${amount}%で、HP割合が最も低い味方を回復。`;
  return gemTraitInfo.none.description;
}
export function gemRollDescription(gem: MemoryGem): string {
  return `技の威力${Number((gemPowerMultiplier(gem) * 100).toFixed(1))}%。特性：${gemTraitInfo[gemRoll(gem).trait].name}。${gemTraitDescription(gem)}`;
}
export function gemSkill(gem: MemoryGem): SkillDef {
  const def = gemDefinition(gem);
  const r = gemRoll(gem);
  const roll = gem.roll ? `@roll=${r.power}~${r.trait}~${r.value}:` : '';
  return { ...def.skill, id: `memory:${gem.defId}:${gem.variant}:${roll}${gem.id}`, name: gemName(gem), strength: gem.variant === 'swift' ? Math.max(1, def.skill.strength - 10) : def.skill.strength };
}
/** A reserved marker separates rolls from legacy IDs, which may themselves contain colons. */
export function gemFromSkill(skillId: string): MemoryGem | undefined {
  const parts = skillId.split(':');
  if (parts[0] !== 'memory' || !parts[3]) return undefined;
  const def = definitions.get(parts[1]);
  if (!def?.variants.includes(parts[2] as GemVariant)) return undefined;
  let roll: GemRoll | undefined, offset = 3;
  if (parts[3].startsWith('@roll=')) {
    const match = /^@roll=(\d+)~([a-z]+)~(\d+)$/.exec(parts[3]);
    if (!match) return undefined;
    roll = { power: Number(match[1]), trait: match[2] as GemTrait, value: Number(match[3]) }; offset = 4;
  }
  const id = parts.slice(offset).join(':');
  const gem: MemoryGem = { id, defId: def.id, variant: parts[2] as GemVariant, ...(roll ? { roll } : {}) };
  return validMemoryGem(gem) ? gem : undefined;
}
export function gemRollForSkill(skillId: string): GemRoll | undefined { const gem = gemFromSkill(skillId); return gem ? gemRoll(gem) : undefined; }
export function gemDefinitionForSkill(skillId: string): GemDefinition | undefined {
  const gem = gemFromSkill(skillId);
  return gem ? definitions.get(gem.defId) : undefined;
}
export function gemVariantForSkill(skillId: string): GemVariant | undefined { return gemDefinitionForSkill(skillId) ? skillId.split(':')[2] as GemVariant : undefined; }
export function gemCooldown(skillId: string): number | undefined {
  const gem = gemFromSkill(skillId);
  if (!gem) return undefined;
  const def = gemDefinition(gem), variant = gem.variant;
  // These skills already reach a capped effect with ordinary stones. Higher
  // power tiers improve their cadence instead of advertising a fictitious gain.
  const tierBonus = Math.max(0, gemPowerTier(gem) - 3);
  const supportBonus = def.id === 'rewind-thread' ? tierBonus : def.id === 'star-furnace' ? Math.min(2, tierBonus) : 0;
  return Math.max(2, def.cooldown + (variant === 'echo' ? 1 : variant === 'swift' ? -1 : 0) - supportBonus);
}

export function validMemoryGem(value: unknown): value is MemoryGem {
  if (!record(value) || typeof value.id !== 'string' || !value.id.length || value.id.length > 300 || typeof value.defId !== 'string' || !variants.includes(value.variant as GemVariant) || value.locked !== undefined && typeof value.locked !== 'boolean') return false;
  return Boolean(definitions.get(value.defId)?.variants.includes(value.variant as GemVariant)) && (value.roll === undefined || validGemRoll(value.roll, value.defId));
}
function validGemRoll(value: unknown, defId: string): value is GemRoll {
  const validValue = (amount: unknown): amount is number => count(amount) && Object.values(TIER_RANGES).some(([low, high]) => amount >= low && amount <= high);
  if (!record(value) || !validValue(value.power) || !validValue(value.value) || typeof value.trait !== 'string' || !supportedGemTraits(defId).includes(value.trait as GemTrait)) return false;
  return value.trait !== 'none' || value.value === 0;
}
export function validGemInventory(value: unknown): value is GemInventory {
  if (!record(value) || !Array.isArray(value.items) || !value.items.every(validMemoryGem) || !record(value.equipped) || !record(value.dust) || !Array.isArray(value.seen) || !value.seen.every(v => typeof v === 'string' && definitions.has(v)) || value.craftSerial !== undefined && !count(value.craftSerial)) return false;
  const ids = value.items.map(v => (v as MemoryGem).id);
  if (new Set(ids).size !== ids.length || new Set(value.seen).size !== value.seen.length) return false;
  const equipped = Object.values(value.equipped);
  if (!equipped.every(v => typeof v === 'string' && ids.includes(v)) || new Set(equipped).size !== equipped.length || !Object.entries(value.dust).every(([family, amount]) => families.includes(family as GemFamily) && count(amount))) return false;
  if (value.pending !== undefined) {
    const pending = value.pending;
    if (!record(pending) || typeof pending.gemId !== 'string' || !validMemoryGem(pending.candidate) || !pending.candidate.roll) return false;
    const target = (value.items as MemoryGem[]).find(item => item.id === pending.gemId);
    if (!target || !validRefinementCandidate(target, pending.candidate)) return false;
  }
  return true;
}

/** A saved offer cannot manufacture or transfer a drop-only affix tier. */
function validRefinementCandidate(current: MemoryGem, candidate: MemoryGem): boolean {
  if (!validMemoryGem(candidate) || !candidate.roll || candidate.id !== current.id || candidate.defId !== current.defId || candidate.variant !== current.variant) return false;
  const before = gemRoll(current), after = gemRoll(candidate);
  const powerOnly = before.trait === after.trait && before.value === after.value && (gemPowerTier(current) <= 3 ? after.power <= 100 : gemPowerTier(current) === gemPowerTier(candidate));
  const traitOnly = before.power === after.power && after.trait !== 'none' && (gemTraitTier(current) <= 3 ? after.value <= 100 : gemTraitTier(current) === gemTraitTier(candidate));
  return powerOnly || traitOnly;
}

/** Stable destinations let players farm a family even before they have a full collection. */
export function dungeonGemFamily(dungeon: Pick<DungeonDef, 'id' | 'name' | 'eventId' | 'towerFloor'>): GemFamily {
  // Tower names all contain 白; assign by floor before the ordinary name classifier.
  if (dungeon.towerFloor) return families[(dungeon.towerFloor - 1) % families.length];
  const text = `${dungeon.id} ${dungeon.name} ${dungeon.eventId ?? ''}`;
  if (/clock|lunette|mechan|gear|機巧|時計|機械|秒針/i.test(text)) return 'clock';
  if (/grave|tomb|night|shadow|dream|garden|kuzuha|墓|夢|黄昏|影|庭|夜/i.test(text)) return 'grave';
  if (/cathedral|chapel|holy|sanctuary|聖|祈|礼拝|白/i.test(text)) return 'sanctuary';
  let hash = 0;
  for (const char of dungeon.id) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return families[hash % families.length];
}

/** Shared by loot generation and destination previews; no hidden tier sources. */
export function dungeonGemLootProfile(dungeon: DungeonDef): GemLootProfile {
  const profile = dungeon.kind === 'trial' ? undefined : dungeon.gemLoot;
  if (!profile) return { tier4Chance: 0, tier5Chance: 0 };
  const validChance = (chance: number) => Number.isFinite(chance) && chance >= 0 && chance <= 1;
  const tier6Chance = profile.tier6Chance === undefined ? 0 : profile.tier6Chance;
  if (!validChance(profile.tier4Chance) || !validChance(profile.tier5Chance) || !validChance(tier6Chance) || profile.tier4Chance + profile.tier5Chance + tier6Chance > 1) throw new Error('記憶石のTier排出率が不正です。');
  const featured = profile.featuredDefId ? definitions.get(profile.featuredDefId) : undefined;
  if (profile.featuredDefId && (!featured || featured.family !== dungeonGemFamily(dungeon))) throw new Error('記憶石の注目入手先が系統と一致しません。');
  return { tier4Chance: profile.tier4Chance, tier5Chance: profile.tier5Chance, ...(profile.tier6Chance === undefined ? {} : { tier6Chance }), ...(featured ? { featuredDefId: featured.id } : {}) };
}

function rollValueInTier(seed: number, tier: GemTier): { seed: number; value: number } {
  const random = nextRandom(seed), [low, high] = TIER_RANGES[tier];
  return { seed: random.seed, value: low + Math.floor(random.value * (high - low + 1)) };
}

function promoteGemRoll(gem: MemoryGem, seed: number, profile: GemLootProfile): { gem: MemoryGem; seed: number } {
  const tier6Chance = profile.tier6Chance ?? 0;
  if (profile.tier4Chance + profile.tier5Chance + tier6Chance === 0) return { gem, seed };
  const roll = gemRoll(gem);
  let nextSeed = seed;
  const promote = (value: number): number => {
    const random = nextRandom(nextSeed); nextSeed = random.seed;
    const tier = random.value < tier6Chance ? 6 : random.value < tier6Chance + profile.tier5Chance ? 5 : random.value < tier6Chance + profile.tier5Chance + profile.tier4Chance ? 4 : undefined;
    if (!tier) return value;
    const result = rollValueInTier(nextSeed, tier); nextSeed = result.seed;
    return result.value;
  };
  roll.power = promote(roll.power);
  if (roll.trait !== 'none') roll.value = promote(roll.value);
  return { gem: { ...gem, roll }, seed: nextSeed };
}

function nextRandom(seed: number): { seed: number; value: number } {
  const next = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
  return { seed: next, value: next / 4294967296 };
}
export function rollGemDrop(dungeon: DungeonDef, seed: number, dropId: string, options: { first?: boolean; boss?: boolean } = {}): { gem?: MemoryGem; seed: number } {
  if (dungeon.kind === 'trial') return { seed: seed >>> 0 };
  if (!dropId || dropId.length > 300) throw new Error('宝箱の識別子が正しくありません。');
  const family = dungeonGemFamily(dungeon);
  const profile = dungeonGemLootProfile(dungeon);
  let random = nextRandom(seed);
  if (!options.first && !(dungeon.towerFloor && options.boss) && random.value >= (options.boss ? .65 : .32)) return { seed: random.seed };
  let featured: GemDefinition | undefined;
  if (options.boss && !options.first && profile.featuredDefId) {
    random = nextRandom(random.seed);
    if (random.value < .4) featured = definitions.get(profile.featuredDefId);
  }
  random = nextRandom(random.seed);
  const unique = options.boss && !options.first && random.value < .12;
  const candidates = GEM_DEFINITIONS.filter(def => def.family === family && Boolean(def.bossOnly) === Boolean(unique));
  random = nextRandom(random.seed);
  const firstId = { sanctuary: 'pale-ward', clock: 'echo-shard', grave: 'night-dew' }[family];
  const def = options.first ? definitions.get(firstId)! : featured ?? candidates[Math.min(candidates.length - 1, Math.floor(random.value * candidates.length))];
  random = nextRandom(random.seed);
  const available = options.first ? ['pure'] as GemVariant[] : def.variants;
  // Basic forms remain common; unusual forms are exciting without becoming mandatory upgrades.
  const variant = available.length === 1 || random.value < .65 ? 'pure' : available[1 + Math.floor((random.value - .65) / .35 * (available.length - 1))];
  const gem: MemoryGem = { id: dropId, defId: def.id, variant };
  if (options.first) return { gem, seed: random.seed };
  const candidate = rollGemCandidate(gem, random.seed, dungeon.towerFloor ?? 0);
  return options.boss ? promoteGemRoll(candidate.gem, candidate.seed, profile) : candidate;
}

function findGem(inventory: GemInventory, id: string): MemoryGem {
  const gem = inventory.items.find(item => item.id === id);
  if (!gem) throw new Error('その記憶石を持っていません。');
  return gem;
}
export function equipGem(inventory: GemInventory, characterId: string, id: string | null, options: { transfer?: boolean } = {}): void {
  if (!characterId || ['__proto__', 'constructor', 'prototype'].includes(characterId)) throw new Error('装備する仲間が正しくありません。');
  if (id === null) { delete inventory.equipped[characterId]; return; }
  findGem(inventory, id);
  const previousOwner = Object.entries(inventory.equipped).find(([owner, gemId]) => owner !== characterId && gemId === id)?.[0];
  if (previousOwner && !options.transfer) throw new Error('その記憶石は別の仲間が装備しています。');
  if (previousOwner) delete inventory.equipped[previousOwner];
  inventory.equipped[characterId] = id;
}
export function lockGem(inventory: GemInventory, id: string): void { const gem = findGem(inventory, id); gem.locked = !gem.locked; }
export function salvageGem(inventory: GemInventory, id: string): void {
  const gem = findGem(inventory, id);
  if (inventory.pending?.gemId === id) throw new Error('調律中の記憶石は分解できません。');
  if (gem.locked) throw new Error('保護している記憶石は分解できません。');
  if (Object.values(inventory.equipped).includes(id)) throw new Error('装備中の記憶石は分解できません。');
  const def = gemDefinition(gem);
  inventory.dust[def.family] = (inventory.dust[def.family] ?? 0) + (def.bossOnly ? 3 : gem.variant === 'pure' ? 1 : 2);
  inventory.items.splice(inventory.items.indexOf(gem), 1);
}
export function craftGem(inventory: GemInventory, defId: string, variant: GemVariant = 'pure'): MemoryGem {
  const def = definitions.get(defId);
  if (!def || def.bossOnly || !def.variants.includes(variant)) throw new Error('その記憶石は製作できません。');
  const cost = GEM_CRAFT_COST + (variant === 'pure' ? 0 : 3);
  if ((inventory.dust[def.family] ?? 0) < cost) throw new Error('製作に必要な記憶の欠片が足りません。');
  let serial = inventory.craftSerial ?? inventory.items.length + inventory.seen.length;
  while (inventory.items.some(item => item.id === `crafted-${serial}`)) serial++;
  const gem: MemoryGem = { id: `crafted-${serial}`, defId, variant, roll: { power: 20, trait: 'none', value: 0 } };
  inventory.dust[def.family] -= cost;
  inventory.items.push(gem);
  inventory.craftSerial = serial + 1;
  if (!inventory.seen.includes(def.id)) inventory.seen.push(def.id);
  return gem;
}

/** Ordinary affixes span T1–T3; deeper floors improve that distribution. Boss profiles add higher tiers separately. */
export function rollGemCandidate(gem: MemoryGem, seed: number, towerFloor = 0): { gem: MemoryGem; seed: number } {
  if (!Number.isSafeInteger(towerFloor) || towerFloor < 0 || towerFloor > 100) throw new Error('記憶石の探索階層が正しくありません。');
  const floor = Math.max(0, Math.min(100, Math.floor(towerFloor)));
  let random = nextRandom(seed);
  const minimum = 5 + Math.min(30, Math.floor(floor / 3));
  const exponent = floor ? Math.max(.65, 2.3 - floor / 55) : 3.2;
  const power = Math.min(100, minimum + Math.floor((101 - minimum) * random.value ** exponent));
  random = nextRandom(random.seed);
  const choices = supportedGemTraits(gem).filter(trait => trait !== 'none');
  const hasTrait = random.value < .45 + floor * .003;
  random = nextRandom(random.seed);
  const trait = hasTrait ? choices[Math.floor(random.value * choices.length)] : 'none';
  random = nextRandom(random.seed);
  const value = trait === 'none' ? 0 : Math.min(100, Math.floor(101 * random.value ** Math.max(.7, 2.2 - floor / 65)));
  return { gem: { ...gem, roll: { power, trait, value } }, seed: random.seed };
}
export function refinementCost(gem: MemoryGem, mode: GemRefinementMode): number {
  const roll = gemRoll(gem);
  return mode === 'power' ? 3 + Math.floor(roll.power / 25) : 4 + Math.floor(roll.value / 25);
}
/** Paid once when offered, with the old equipment retained until the user accepts. */
export function startGemRefinement(inventory: GemInventory, gemId: string, mode: GemRefinementMode, seed: number): { seed: number } {
  if (mode !== 'power' && mode !== 'trait') throw new Error('調律する項目が正しくありません。');
  if (inventory.pending) throw new Error('先に調律の結果を選んでください。');
  const gem = findGem(inventory, gemId), def = gemDefinition(gem), cost = refinementCost(gem, mode);
  if ((inventory.dust[def.family] ?? 0) < cost) throw new Error('調律に必要な記憶の欠片が足りません。');
  const previous = gemRoll(gem);
  let random = nextRandom(seed), roll = { ...previous };
  if (mode === 'power') {
    const tier = gemPowerTier(gem);
    if (tier >= 4) {
      const [low, high] = TIER_RANGES[tier];
      roll.power = low + Math.floor(random.value * (high - low + 1));
    } else roll.power = Math.min(100, Math.floor(101 * random.value ** 1.8));
  }
  else {
    const choices = supportedGemTraits(gem).filter(trait => trait !== 'none');
    roll.trait = choices[Math.floor(random.value * choices.length)];
    random = nextRandom(random.seed);
    const tier = gemTraitTier(gem);
    if (tier >= 4) {
      const [low, high] = TIER_RANGES[tier as GemTier];
      roll.value = low + Math.floor(random.value * (high - low + 1));
    } else roll.value = Math.min(100, Math.floor(101 * random.value ** 1.5));
  }
  inventory.dust[def.family] -= cost;
  inventory.pending = { gemId, candidate: { ...gem, roll } };
  return { seed: random.seed };
}
export function resolveGemRefinement(inventory: GemInventory, accept: boolean): void {
  const pending = inventory.pending;
  if (!pending) throw new Error('選択待ちの調律結果がありません。');
  const index = inventory.items.findIndex(item => item.id === pending.gemId);
  if (index < 0) throw new Error('調律中の記憶石が見つかりません。');
  if (!validRefinementCandidate(inventory.items[index], pending.candidate)) throw new Error('調律結果が元の記憶石と一致しません。');
  if (accept) {
    const current = inventory.items[index];
    const replacement = { ...pending.candidate };
    if (current.locked === undefined) delete replacement.locked;
    else replacement.locked = current.locked;
    inventory.items[index] = replacement;
  }
  delete inventory.pending;
}
