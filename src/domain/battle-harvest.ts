import type { Battle, BattleEvent, Content } from './types';
import { dungeonIndustryProfile, industryItem } from './industry';
import { rollGemDrop, rollGemCandidate, validRoughGem, type RoughMemoryGem } from './memory-gems';
import { roughMemoryGem } from './gem-polishing';

export type HarvestKind = 'material' | 'heal' | 'strike' | 'gem';
export const harvestUpgrades = ['touch', 'linger', 'abundance', 'mercy', 'focus'] as const;
export type HarvestUpgrade = typeof harvestUpgrades[number];
export const harvestUpgradeText: Record<HarvestUpgrade, { name: string; description: string }> = {
  touch: { name: '巧みな指先', description: '一回のタップで回収が一段階多く進む。最大3段階。' },
  linger: { name: '留まる光', description: '新しく現れる回収物が長く残る。' },
  abundance: { name: '豊かな実り', description: '素材の塊から得られる資源が1個増える。' },
  mercy: { name: '癒しの波紋', description: '回復を取り切ると、他の回収物も一段階進む。' },
  focus: { name: '集まる灯', description: '回復と援護攻撃の効果が強まる。最大3段階。' },
};
export interface HarvestOffer { id: string; kind: HarvestKind; slot: number; hits: number; required: number; expires: number; itemId?: string; amount?: number; gem?: RoughMemoryGem }
export interface BattleHarvest {
  sockets?: HarvestUpgrade[];
  seed: number; beat: number; serial: number; checked: string; offers: HarvestOffer[];
  choice?: { id: string; options: HarvestUpgrade[]; expires: number };
  upgrades: Record<HarvestUpgrade, number>; nextChoice: number;
  materials: Record<string, number>; gems: RoughMemoryGem[];
  aids: ('heal' | 'strike')[]; collected: number; missed: number;
}
const active = (battle: Battle) => ['ready', 'playing'].includes(battle.phase);
const next = (s: BattleHarvest) => (s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0);
export function createBattleHarvest(id: string): BattleHarvest {
  let seed = 2166136261;
  for (const c of id) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  return { sockets: [], seed, beat: 0, serial: 0, checked: '', offers: [], upgrades: { touch: 0, linger: 0, abundance: 0, mercy: 0, focus: 0 }, nextChoice: 2, materials: {}, gems: [], aids: [], collected: 0, missed: 0 };
}
/** Advance only with actual ordinary replay events. Waiting, reloads and taps mint nothing.
 * Lifetimes use battle beats, so hidden/paused play and reloads never expire loot offline. */
export function advanceHarvest(battle: Battle, event: BattleEvent, content: Content): void {
  const s = battle.harvest;
  if (!s || !active(battle) || event.harvestAction || event.bloomAction || event.fairyAction) return;
  const key = `${event.id}`;
  if (s.checked === key) return;
  s.checked = key; s.beat++;
  const expired = s.offers.filter(o => o.expires <= s.beat);
  s.missed += expired.length; s.offers = s.offers.filter(o => o.expires > s.beat);
  if (s.choice && s.choice.expires <= s.beat) delete s.choice;
  if (!s.choice && s.beat >= s.nextChoice) {
    const pool = harvestUpgrades.filter(id => s.upgrades[id] < 3), options: HarvestUpgrade[] = [];
    while (pool.length && options.length < 3) options.push(pool.splice(next(s) % pool.length, 1)[0]!);
    if (options.length) s.choice = { id: `${battle.id}:choice:${s.beat}`, options, expires: s.beat + 18 };
    s.nextChoice = s.beat + 24;
  }
  if (s.offers.length >= 4 || (event.kind !== 'drop' && s.beat % 3 !== 0)) return;
  const d = content.dungeons.find(d => d.id === battle.dungeonId)!;
  if (d.kind === 'trial') return;
  const roll = next(s) % 100;
  let kind: HarvestKind = roll < 43 ? 'material' : roll < 68 ? 'heal' : roll < 90 ? 'strike' : 'gem';
  // Keep rare items special, and bound additional equipment per expedition.
  if (kind === 'gem' && s.gems.length + s.offers.filter(o => o.kind === 'gem').length >= 3) kind = 'material';
  const reserved = Object.values(s.materials).reduce((a,b) => a+b, 0) + s.offers.filter(o=>o.kind==='material').reduce((n,o)=>n+o.amount!,0);
  if (kind === 'material' && reserved >= 120) kind = 'heal';
  const slot = [0,1,2,3].find(slot => !s.offers.some(o => o.slot === slot))!;
  const offer: HarvestOffer = { id: `${battle.id}:harvest:${++s.serial}`, kind, slot, hits: 0, required: kind === 'gem' ? 6 : kind === 'material' ? 3 : 2, expires: s.beat + (kind === 'gem' ? 18 : 10) + s.upgrades.linger * 4 };
  if (kind === 'material') {
    const items = Object.keys(dungeonIndustryProfile(d, content).drops);
    offer.itemId = items[next(s) % items.length]!; offer.amount = Math.min(2 + s.upgrades.abundance, 120 - reserved);
  }
  if (kind === 'gem') {
    // Preserve ordinary/ boss loot ceilings; never change the combat random stream.
    let result = rollGemDrop(d, next(s), offer.id, { boss: event.kind === 'drop' && battle.wave === d.waves.length - 1 });
    if (!result.gem) {
      const fallback = rollGemDrop(d, result.seed, offer.id, { first: true });
      result = rollGemCandidate(fallback.gem!, fallback.seed, d.towerFloor ?? 0);
    }
    s.seed = result.seed; offer.gem = roughMemoryGem(result.gem!, s.seed);
  }
  s.offers.push(offer);
}
export function harvestSockets(s: BattleHarvest): HarvestUpgrade[] {
  return s.sockets ?? harvestUpgrades.flatMap(id => Array.from({length:s.upgrades[id]},()=>id)).slice(0,3);
}
export function chooseHarvest(battle: Battle, id: string, upgrade: HarvestUpgrade, slot?: number): boolean {
  const s = battle.harvest, choice = s?.choice;
  if (!s || !active(battle) || !choice || choice.id !== id || choice.expires <= s.beat || !choice.options.includes(upgrade)) return false;
  const sockets = [...harvestSockets(s)];
  const target = slot ?? sockets.length;
  if (!Number.isInteger(target) || target < 0 || target > sockets.length || target >= 3) return false;
  sockets[target] = upgrade; s.sockets = sockets;
  for (const key of harvestUpgrades) s.upgrades[key] = sockets.filter(id => id === key).length;
  delete s.choice;
  return true;
}
function collect(s: BattleHarvest, o: HarvestOffer): void {
  s.offers = s.offers.filter(x => x.id !== o.id); s.collected++;
  if (o.kind === 'material') s.materials[o.itemId!] = (s.materials[o.itemId!] ?? 0) + Math.min(o.amount!, Math.max(0, 120 - Object.values(s.materials).reduce((a,b) => a+b, 0)));
  else if (o.kind === 'gem') s.gems.push(o.gem!);
  else if (s.aids.length < 3) s.aids.push(o.kind);
}
export function tapHarvest(battle: Battle, id: string): 'miss' | 'tap' | HarvestKind {
  const s = battle.harvest, offer = s?.offers.find(o => o.id === id);
  if (!s || !active(battle) || !offer || offer.expires <= s.beat) return 'miss';
  if (['heal','strike'].includes(offer.kind) && s.aids.length >= 3) return 'miss';
  offer.hits = Math.min(offer.required, offer.hits + 1 + s.upgrades.touch);
  if (offer.hits < offer.required) return 'tap';
  collect(s, offer);
  if (offer.kind === 'heal' && s.upgrades.mercy) {
    for (const other of [...s.offers]) {
      if (['heal','strike'].includes(other.kind) && s.aids.length >= 3) continue;
      other.hits = Math.min(other.required, other.hits + s.upgrades.mercy);
      if (other.hits === other.required) collect(s, other);
    }
  }
  return offer.kind;
}
export function nextHarvestAid(battle: Battle): number {
  const wounded = battle.units.some(u => u.side === 'party' && u.hp > 0 && u.hp < u.maxHp);
  return battle.harvest?.aids.findIndex(kind => kind === 'strike' || wounded) ?? -1;
}
export function validBattleHarvest(value: unknown, battle: Pick<Battle, 'id'>): value is BattleHarvest {
  if (!value || typeof value !== 'object') return false;
  const s = value as BattleHarvest, n = (v: unknown, max = 1000000): v is number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max;
  if (!n(s.seed, 0xffffffff) || !n(s.beat) || !n(s.serial) || typeof s.checked !== 'string' || !n(s.nextChoice) || !n(s.collected) || !n(s.missed)) return false;
  if (!s.upgrades || harvestUpgrades.some(id => !n(s.upgrades[id], 3)) || Object.keys(s.upgrades).some(id => !harvestUpgrades.includes(id as HarvestUpgrade))) return false;
  if (s.sockets !== undefined && (!Array.isArray(s.sockets) || s.sockets.length > 3 || s.sockets.some(id=>!harvestUpgrades.includes(id)) || harvestUpgrades.some(id=>s.upgrades[id]!==s.sockets!.filter(x=>x===id).length))) return false;
  if (!s.materials || typeof s.materials !== 'object' || Array.isArray(s.materials) || Object.entries(s.materials).some(([id,amount]) => industryItem(id)?.kind !== 'raw' || !n(amount, 120)) || Object.values(s.materials).reduce((a,b)=>a+b,0)>120) return false;
  if (!Array.isArray(s.gems) || s.gems.length > 3 || !s.gems.every(validRoughGem) || new Set(s.gems.map(g => g.id)).size !== s.gems.length || s.gems.some(g => !g.id.startsWith(`${battle.id}:harvest:`))) return false;
  if (!Array.isArray(s.aids) || s.aids.length > 3 || s.aids.some(k => !['heal','strike'].includes(k))) return false;
  if (!Array.isArray(s.offers) || s.offers.length > 4 || s.offers.some(o => !o || typeof o !== 'object') || new Set(s.offers.map(o => o.slot)).size !== s.offers.length || new Set(s.offers.map(o => o.id)).size !== s.offers.length) return false;
  for (const o of s.offers) {
    if (!o || !['material','heal','strike','gem'].includes(o.kind) || !n(o.slot,3) || !n(o.hits,5) || !n(o.required,6) || o.required < 2 || o.hits >= o.required || !n(o.expires) || typeof o.id !== 'string' || !o.id.startsWith(`${battle.id}:harvest:`)) return false;
    if (o.kind === 'material' && (industryItem(o.itemId ?? '')?.kind !== 'raw' || !n(o.amount,5) || !o.amount)) return false;
    if (o.kind === 'gem' && (!validRoughGem(o.gem) || o.gem!.id !== o.id || s.gems.some(g => g.id === o.id))) return false;
  }
  const c = s.choice;
  return c === undefined || c !== null && typeof c === 'object' && typeof c.id === 'string' && c.id.startsWith(`${battle.id}:choice:`) && n(c.expires) && Array.isArray(c.options) && c.options.length > 0 && c.options.length <= 3 && new Set(c.options).size === c.options.length && c.options.every(id => harvestUpgrades.includes(id));
}
