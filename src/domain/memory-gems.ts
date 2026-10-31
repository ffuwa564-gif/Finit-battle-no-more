import type { DungeonDef, SkillDef } from './types';

export type GemFamily = 'sanctuary' | 'clock' | 'grave';
export type GemVariant = 'pure' | 'echo' | 'swift';
export interface MemoryGem { id: string; defId: string; variant: GemVariant; locked?: boolean }
export interface GemInventory { items: MemoryGem[]; equipped: Record<string, string>; dust: Record<string, number>; seen: string[]; craftSerial?: number }
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
  return def.bossOnly ? 'epic' : gem.variant === 'pure' ? def.rarity : 'rare';
}
export function gemDescription(gem: MemoryGem): string {
  const def = gemDefinition(gem);
  return `${def.description} ${gem.variant === 'pure' ? '' : GEM_VARIANTS[gem.variant].description + ' '}再使用まで${gemCooldown(gemSkill(gem).id)}ラウンド。`;
}
export function gemSkill(gem: MemoryGem): SkillDef {
  const def = gemDefinition(gem);
  return { ...def.skill, id: `memory:${gem.defId}:${gem.variant}:${gem.id}`, name: gemName(gem), strength: gem.variant === 'swift' ? Math.max(1, def.skill.strength - 10) : def.skill.strength };
}
export function gemDefinitionForSkill(skillId: string): GemDefinition | undefined {
  const parts = skillId.split(':');
  if (parts[0] !== 'memory' || !parts[3]) return undefined;
  const def = definitions.get(parts[1]);
  return def?.variants.includes(parts[2] as GemVariant) ? def : undefined;
}
export function gemVariantForSkill(skillId: string): GemVariant | undefined { return gemDefinitionForSkill(skillId) ? skillId.split(':')[2] as GemVariant : undefined; }
export function gemCooldown(skillId: string): number | undefined {
  const def = gemDefinitionForSkill(skillId);
  if (!def) return undefined;
  const variant = gemVariantForSkill(skillId);
  return Math.max(2, def.cooldown + (variant === 'echo' ? 1 : variant === 'swift' ? -1 : 0));
}

export function validMemoryGem(value: unknown): value is MemoryGem {
  if (!record(value) || typeof value.id !== 'string' || !value.id.length || value.id.length > 300 || typeof value.defId !== 'string' || !variants.includes(value.variant as GemVariant) || value.locked !== undefined && typeof value.locked !== 'boolean') return false;
  return Boolean(definitions.get(value.defId)?.variants.includes(value.variant as GemVariant));
}
export function validGemInventory(value: unknown): value is GemInventory {
  if (!record(value) || !Array.isArray(value.items) || !value.items.every(validMemoryGem) || !record(value.equipped) || !record(value.dust) || !Array.isArray(value.seen) || !value.seen.every(v => typeof v === 'string' && definitions.has(v)) || value.craftSerial !== undefined && !count(value.craftSerial)) return false;
  const ids = value.items.map(v => (v as MemoryGem).id);
  if (new Set(ids).size !== ids.length || new Set(value.seen).size !== value.seen.length) return false;
  const equipped = Object.values(value.equipped);
  return equipped.every(v => typeof v === 'string' && ids.includes(v)) && new Set(equipped).size === equipped.length && Object.entries(value.dust).every(([family, amount]) => families.includes(family as GemFamily) && count(amount));
}

/** Stable destinations let players farm a family even before they have a full collection. */
export function dungeonGemFamily(dungeon: Pick<DungeonDef, 'id' | 'name' | 'eventId'>): GemFamily {
  const text = `${dungeon.id} ${dungeon.name} ${dungeon.eventId ?? ''}`;
  if (/clock|lunette|mechan|gear|機巧|時計|機械|秒針/i.test(text)) return 'clock';
  if (/grave|tomb|night|shadow|dream|garden|kuzuha|墓|夢|黄昏|影|庭|夜/i.test(text)) return 'grave';
  if (/cathedral|chapel|holy|sanctuary|聖|祈|礼拝|白/i.test(text)) return 'sanctuary';
  let hash = 0;
  for (const char of dungeon.id) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return families[hash % families.length];
}

function nextRandom(seed: number): { seed: number; value: number } {
  const next = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
  return { seed: next, value: next / 4294967296 };
}
export function rollGemDrop(dungeon: DungeonDef, seed: number, dropId: string, options: { first?: boolean; boss?: boolean } = {}): { gem?: MemoryGem; seed: number } {
  if (dungeon.kind === 'trial') return { seed: seed >>> 0 };
  if (!dropId || dropId.length > 300) throw new Error('宝箱の識別子が正しくありません。');
  const family = dungeonGemFamily(dungeon);
  let random = nextRandom(seed);
  if (!options.first && random.value >= (options.boss ? .65 : .32)) return { seed: random.seed };
  random = nextRandom(random.seed);
  const unique = options.boss && !options.first && random.value < .12;
  const candidates = GEM_DEFINITIONS.filter(def => def.family === family && Boolean(def.bossOnly) === Boolean(unique));
  random = nextRandom(random.seed);
  const firstId = { sanctuary: 'pale-ward', clock: 'echo-shard', grave: 'night-dew' }[family];
  const def = options.first ? definitions.get(firstId)! : candidates[Math.min(candidates.length - 1, Math.floor(random.value * candidates.length))];
  random = nextRandom(random.seed);
  const available = options.first ? ['pure'] as GemVariant[] : def.variants;
  // Basic forms remain common; unusual forms are exciting without becoming mandatory upgrades.
  const variant = available.length === 1 || random.value < .65 ? 'pure' : available[1 + Math.floor((random.value - .65) / .35 * (available.length - 1))];
  return { gem: { id: dropId, defId: def.id, variant }, seed: random.seed };
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
  const gem: MemoryGem = { id: `crafted-${serial}`, defId, variant };
  inventory.dust[def.family] -= cost;
  inventory.items.push(gem);
  inventory.craftSerial = serial + 1;
  if (!inventory.seen.includes(def.id)) inventory.seen.push(def.id);
  return gem;
}
