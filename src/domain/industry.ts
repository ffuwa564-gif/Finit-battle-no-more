import catalog from '../content/industry.json' with { type: 'json' };
import type { Content, DungeonDef, GameSave } from './types';
export interface IndustryText { ja: string; en: string }
export interface IndustryRecipe { id: string; name: IndustryText; inputs: Record<string, number>; outputs: Record<string, number>; seconds: number; station: string | null; chapter: number; automatable: boolean }
export interface IndustryMachine { kind: string; recipeId?: string; enabled: boolean; progress: number }
export interface IndustryState { version: 1; stock: Record<string, number>; machines: Record<string, IndustryMachine>; updatedAt: number; target?: string; job?: { recipeId: string; count: number; readyAt: number } }
export type IndustryCommand = { type: 'industrySync' } | { type: 'industryCollect' } | { type: 'industryTrack'; recipeId: string | null } | { type: 'industryCraft'; recipeId: string; count: number } | { type: 'industryInstall'; itemId: string } | { type: 'industryConfigure'; machineId: string; recipeId: string | null } | { type: 'industryCancel' };
export const industryCatalog = catalog as unknown as { version: number; items: { id: string; name: IndustryText; kind: 'raw' | 'part' | 'machine' | 'tool' | 'story' }[]; recipes: IndustryRecipe[]; bonuses: Record<string, { category: string; bonus: number }>; storyTools: Record<string, string>; profiles: { id: string; name: IndustryText; flavor: IndustryText; drops: Record<string, number> }[] };
const MAX = 9999999, OFFLINE_SECONDS = 7200;
export const industryItem = (id: string) => industryCatalog.items.find(i => i.id === id)!;
export const industryRecipe = (id: string) => industryCatalog.recipes.find(r => r.id === id);
export function industryChapter(save: Pick<GameSave, 'completedDungeonIds'>, content: Content): number {
  return Math.min(7, Math.max(1, ...(content.chapters ?? []).map(c => c.dungeonIds.every(id => save.completedDungeonIds.includes(id)) ? c.number + 1 : c.dungeonIds.some(id => save.completedDungeonIds.includes(id)) ? c.number : 1)));
}
export function emptyIndustry(now: number): IndustryState { return { version: 1, stock: {}, machines: {}, updatedAt: Math.floor(now / 1000) * 1000 }; }
export function installedIndustry(s: IndustryState, kind: string) { return Object.values(s.machines).filter(m => m.kind === kind).length; }
export function industryCapacity(s: IndustryState) { return Math.min(2000, 200 + (s.stock.crate ?? 0) * 200); }
function add(s: IndustryState, items: Record<string, number>, count = 1) { for (const [id, n] of Object.entries(items)) { const next = (s.stock[id] ?? 0) + n * count; if (!Number.isSafeInteger(next) || next < 0 || next > MAX) throw Error('工房の所持数が上限に達しました。'); s.stock[id] = next; } }
function spend(s: IndustryState, inputs: Record<string, number>, count: number) { if (Object.entries(inputs).some(([id, n]) => (s.stock[id] ?? 0) < n * count)) throw Error('工房の資源が足りません。'); add(s, inputs, -count); }
function finishJob(s: IndustryState, now: number) { if (s.job && s.job.readyAt <= now) { add(s, industryRecipe(s.job.recipeId)!.outputs, s.job.count); delete s.job; } }
/** One-second simulation, bounded to two hours. Starved/full machines bank no work.
 * Every product consumes dungeon inputs; neither time nor reloads create raw stock. */
export function settleIndustry(s: IndustryState, now: number): void {
  if (!Number.isSafeInteger(now) || now < 0) throw Error('工房の時刻が不正です。');
  const seconds = Math.min(OFFLINE_SECONDS, Math.max(0, Math.floor((now - s.updatedAt) / 1000)));
  const machines = Object.entries(s.machines).sort(([a], [b]) => a.localeCompare(b));
  if (!machines.length) finishJob(s, now);
  else for (let step = 1; step <= seconds; step++) {
    finishJob(s, s.updatedAt + step * 1000);
    let working = false;
    for (const [, machine] of machines) {
      const r = machine.recipeId && industryRecipe(machine.recipeId);
      if (!machine.enabled || !r) continue;
      const possible = Math.min(1, ...Object.entries(r.inputs).map(([id, n]) => Math.floor((s.stock[id] ?? 0) / n)), ...Object.entries(r.outputs).map(([id, n]) => Math.floor((industryCapacity(s) - (s.stock[id] ?? 0)) / n)));
      if (possible <= 0) { machine.progress = 0; continue; }
      working = true;
      machine.progress += 1000;
      if (machine.progress >= r.seconds * 1000) { spend(s, r.inputs, possible); add(s, r.outputs, possible); machine.progress = 0; }
    }
    if (!working) {
      const due = s.job && Math.ceil((s.job.readyAt - s.updatedAt) / 1000);
      if (due && due > step && due <= seconds) step = due - 1;
      else break;
    }
  }
  s.updatedAt = now - s.updatedAt > OFFLINE_SECONDS * 1000 ? Math.floor(now / 1000) * 1000 : s.updatedAt + seconds * 1000;
  finishJob(s, now);
}
export function previewIndustry(save: Pick<GameSave, 'industry'>, now: number): IndustryState { const s = structuredClone(save.industry ?? emptyIndustry(now)); settleIndustry(s, now); return s; }
export function applyIndustry(save: GameSave, command: IndustryCommand, content: Content, now: number) {
  const s = save.industry ??= emptyIndustry(now); settleIndustry(s, now);
  if (command.type === 'industrySync' || command.type === 'industryCollect') return;
  if (command.type === 'industryTrack') { if (command.recipeId !== null && !industryRecipe(command.recipeId)) throw Error('その製作図はありません。'); if (command.recipeId) s.target = command.recipeId; else delete s.target; return; }
  if (command.type === 'industryCancel') { if (!s.job) throw Error('加工中の品はありません。'); add(s, industryRecipe(s.job.recipeId)!.inputs, s.job.count); delete s.job; return; }
  if (command.type === 'industryInstall') {
    if (industryItem(command.itemId)?.kind !== 'machine' || !(s.stock[command.itemId] > 0)) throw Error('設置できる装置がありません。');
    const count = installedIndustry(s, command.itemId);
    if (count >= 8) throw Error('同じ装置は8台までです。');
    spend(s, { [command.itemId]: 1 }, 1); s.machines[`${command.itemId}:${count + 1}`] = { kind: command.itemId, enabled: false, progress: 0 }; return;
  }
  if (command.type === 'industryConfigure') {
    const m = s.machines[command.machineId], r = command.recipeId && industryRecipe(command.recipeId);
    if (!m || command.recipeId !== null && (!r || !r.automatable || r.station !== m.kind || r.chapter > industryChapter(save, content))) throw Error('その装置では加工できません。');
    m.enabled = Boolean(r); m.recipeId = r ? r.id : undefined; m.progress = 0; return;
  }
  const r = industryRecipe(command.recipeId), count = command.count;
  if (!r || !Number.isSafeInteger(count) || count < 1 || count > 20 || r.chapter > industryChapter(save, content)) throw Error('その製作図はまだ使えません。');
  if (s.job) throw Error('先に手動加工を終えてください。');
  const unique = Object.keys(r.outputs).some(id => industryItem(id).kind === 'story' || industryItem(id).kind === 'tool' && id !== 'crate');
  if (unique && (count !== 1 || Object.keys(r.outputs).some(id => (s.stock[id] ?? 0) > 0))) throw Error('その道具は1つだけ製作できます。');
  if (r.station && !installedIndustry(s, r.station)) throw Error('必要な装置を製作して設置してください。');
  spend(s, r.inputs, count); s.job = { recipeId: r.id, count, readyAt: now + r.seconds * count * 1000 };
}
export function dungeonIndustryProfile(d: DungeonDef, content: Content) {
  const chapter = content.chapters?.find(c => c.dungeonIds.includes(d.id)), index = chapter?.dungeonIds.indexOf(d.id) ?? (d.towerFloor ?? 0);
  return industryCatalog.profiles[Math.max(0, index) % industryCatalog.profiles.length];
}
export function industryLoot(d: DungeonDef, save: Pick<GameSave, 'industry'>, content: Content): Record<string, number> {
  if (d.kind === 'trial') return {};
  const profile = dungeonIndustryProfile(d, content), bonus = Math.max(0, ...Object.entries(industryCatalog.bonuses).filter(([id, b]) => (save.industry?.stock[id] ?? 0) > 0 && b.category === profile.id).map(([, b]) => b.bonus));
  const chapter = content.chapters?.find(c => c.dungeonIds.includes(d.id))?.number ?? 1;
  const loot = Object.fromEntries(Object.entries(profile.drops).map(([id, n]) => [id, Math.floor(n * (1 + bonus) * (1 + (chapter - 1) * .25))]));
  if (chapter >= 3) loot.crystal = 1 + Math.floor((chapter - 3) / 2);
  return loot;
}
export function grantIndustryLoot(save: GameSave, d: DungeonDef, content: Content, now: number) {
  const loot = industryLoot(d, save, content); if (!Object.keys(loot).length) return;
  const s = save.industry ??= emptyIndustry(now); settleIndustry(s, now); add(s, loot);
}
export function missingStoryTool(save: Pick<GameSave, 'industry' | 'worldStory'>, nodeId: string): string | undefined {
  const item = industryCatalog.storyTools[nodeId];
  return item && !save.worldStory?.completed.includes(nodeId) && !((save.industry?.stock[item] ?? 0) > 0) ? item : undefined;
}
export type IndustryNeed = { kind: 'raw' | 'craft' | 'install' | 'chapter' | 'waiting'; id: string; count: number };
/** Follow a recipe backwards to one concrete action, including missing stations. */
export function nextIndustryNeed(s: IndustryState, recipeId: string, chapter: number): IndustryNeed | undefined {
  if (s.job) return { kind: 'waiting', id: s.job.recipeId, count: s.job.count };
  const output = Object.keys(industryRecipe(recipeId)?.outputs ?? {})[0];
  if (output && industryItem(output)?.kind === 'machine') {
    if ((s.stock[output] ?? 0) > 0) return { kind: 'install', id: output, count: 1 };
    if (installedIndustry(s, output)) return;
  } else if (output && (s.stock[output] ?? 0) >= industryRecipe(recipeId)!.outputs[output]) return;
  function visit(id: string, count: number, path: Set<string>): IndustryNeed | undefined {
    const r = industryRecipe(id); if (!r || path.has(id)) return;
    if (r.chapter > chapter) return { kind: 'chapter', id, count: r.chapter };
    const seen = new Set(path).add(id);
    if (r.station && !installedIndustry(s, r.station)) return (s.stock[r.station] ?? 0) > 0 ? { kind: 'install', id: r.station, count: 1 } : visit(r.station, 1, seen);
    for (const [input, n] of Object.entries(r.inputs)) {
      const missing = n * count - (s.stock[input] ?? 0);
      if (missing <= 0) continue;
      if (industryItem(input).kind === 'raw') return { kind: 'raw', id: input, count: missing };
      const producer = industryCatalog.recipes.find(p => p.outputs[input] && p.id === input) ?? industryCatalog.recipes.find(p => p.outputs[input]);
      if (producer) return visit(producer.id, Math.ceil(missing / producer.outputs[input]), seen);
    }
    return { kind: 'craft', id, count: Math.min(20, count) };
  }
  return visit(recipeId, 1, new Set());
}
export function validIndustry(value: unknown): value is IndustryState {
  if (!value || typeof value !== 'object') return false;
  const s = value as IndustryState, natural = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= MAX;
  if (s.version !== 1 || !Number.isSafeInteger(s.updatedAt) || s.updatedAt < 0 || !s.stock || typeof s.stock !== 'object' || Array.isArray(s.stock) || !s.machines || typeof s.machines !== 'object' || Array.isArray(s.machines)) return false;
  if (Object.entries(s.stock).some(([id, n]) => !industryItem(id) || !natural(n))) return false;
  if (Object.entries(s.machines).some(([id, m]) => !m || industryItem(m.kind)?.kind !== 'machine' || !new RegExp('^' + m.kind + ':[1-8]$').test(id) || typeof m.enabled !== 'boolean' || !natural(m.progress) || m.progress >= (m.recipeId ? (industryRecipe(m.recipeId)?.seconds ?? 0) * 1000 : 1) || m.enabled && !m.recipeId || m.recipeId !== undefined && (!industryRecipe(m.recipeId)?.automatable || industryRecipe(m.recipeId)?.station !== m.kind))) return false;
  if (s.target !== undefined && !industryRecipe(s.target)) return false;
  return !s.job || Boolean(industryRecipe(s.job.recipeId) && natural(s.job.count) && s.job.count >= 1 && s.job.count <= 20 && Number.isSafeInteger(s.job.readyAt) && s.job.readyAt >= 0);
}
export function validateIndustryCatalog(): string[] {
  const errors: string[] = [], ids = new Set(industryCatalog.items.map(i => i.id));
  if (ids.size !== industryCatalog.items.length || new Set(industryCatalog.recipes.map(r => r.id)).size !== industryCatalog.recipes.length) errors.push('industry: duplicate item or recipe');
  const translated = (t: IndustryText) => Boolean(t && typeof t.ja === 'string' && t.ja.trim() && typeof t.en === 'string' && t.en.trim());
  for (const i of industryCatalog.items) if (!translated(i.name)) errors.push('industry: missing item translation ' + i.id);
  for (const p of industryCatalog.profiles) if (!translated(p.name) || !translated(p.flavor) || Object.entries(p.drops).some(([id,n]) => industryItem(id)?.kind !== 'raw' || !Number.isSafeInteger(n) || n < 1)) errors.push('industry: invalid resource profile ' + p.id);
  for (const [id, bonus] of Object.entries(industryCatalog.bonuses)) if (industryItem(id)?.kind !== 'tool' || !industryCatalog.profiles.some(p => p.id === bonus.category) || !Number.isFinite(bonus.bonus) || bonus.bonus < 0 || bonus.bonus > 3) errors.push('industry: invalid gathering tool ' + id);
  for (const r of industryCatalog.recipes) if (!translated(r.name) || !Number.isSafeInteger(r.seconds) || r.chapter < 1 || r.chapter > 7 || !Object.keys(r.inputs).length || !Object.keys(r.outputs).length || r.seconds < 1 || [...Object.entries(r.inputs), ...Object.entries(r.outputs)].some(([id, n]) => !ids.has(id) || !Number.isSafeInteger(n) || n < 1) || r.station && industryItem(r.station)?.kind !== 'machine' || r.automatable && Object.keys(r.outputs).some(id => industryItem(id).kind !== 'part')) errors.push('industry: invalid recipe ' + r.id);
  const trace = (id: string, seen: Set<string>): boolean => {
    if (seen.has(id)) return false; const r = industryRecipe(id); if (!r) return false;
    const next = new Set(seen).add(id);
    return (!r.station || trace(r.station, next)) && Object.keys(r.inputs).every(input => industryItem(input)?.kind === 'raw' || trace(input, next));
  };
  for (const r of industryCatalog.recipes) if (!trace(r.id, new Set())) errors.push('industry: cyclic or unreachable recipe ' + r.id);
  return errors;
}
