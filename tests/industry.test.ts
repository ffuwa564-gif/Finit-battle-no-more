import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { createInitialSave, applyCommand } from '../src/application/game';
import { createBattle } from '../src/domain/engine';
import { industryCatalog, emptyIndustry, settleIndustry, industryLoot, validIndustry, nextIndustryNeed, validateIndustryCatalog, industryRecipe } from '../src/domain/industry';
import { startWorldStory, defaultHero, storyNext, beginStoryTalk } from '../src/domain/world-story';
import { currentWorldObjective } from '../src/domain/world-objective';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import { encodeBackup, decodeBackup } from '../src/platform/save-backup';
import type { GameSave } from '../src/domain/types';
function reward(id = content.chapters![0].dungeonIds[0]) {
  const s = createInitialSave(content, 42); s.battle = createBattle(content, s.partyIds, s.leaderId, id, 0, 42, 'industry-clear');
  s.battle.phase = s.battle.nextPhase = 'reward'; s.battle.cursor = s.battle.events.length; return s;
}
function manufacture(s: GameSave, id: string) {
  let now = 100000;
  for (let step = 0; step < 500; step++) {
    const need = nextIndustryNeed(s.industry!, id, 7);
    if (!need) return s;
    if (need.kind === 'raw' || need.kind === 'chapter') throw Error('unreachable fixture ' + JSON.stringify(need));
    if (need.kind === 'waiting') { now = Math.max(now, s.industry!.job!.readyAt); s = applyCommand(s, { type: 'industrySync' }, content, { now }); }
    else if (need.kind === 'install') s = applyCommand(s, { type: 'industryInstall', itemId: need.id }, content, { now });
    else s = applyCommand(s, { type: 'industryCraft', recipeId: need.id, count: need.count }, content, { now });
  }
  throw Error('unbounded crafting graph: ' + id + ' ' + JSON.stringify(nextIndustryNeed(s.industry!, id, 7)));
}
describe('noncombat industrial workshop', () => {
  it('has reachable resource chains for every machine, upgrade and all seven story tools', () => {
    expect(validateIndustryCatalog()).toEqual([]);
    expect(industryCatalog.recipes.length).toBeGreaterThanOrEqual(40);
    for (const [node, tool] of Object.entries(industryCatalog.storyTools)) {
      expect(content.worldStory!.nodes.some(n => n.id === node)).toBe(true);
      const s = createInitialSave(content, 42); s.completedDungeonIds = content.chapters!.flatMap(c => c.dungeonIds); s.industry = emptyIndustry(0);
      s.industry.stock = Object.fromEntries(industryCatalog.items.filter(i => i.kind === 'raw').map(i => [i.id, 500]));
      const made = manufacture(s, tool);
      expect(made.industry!.stock[tool], tool).toBe(1);
      expect(() => applyCommand(made, { type: 'industryCraft', recipeId: tool, count: 1 }, content, { now: made.industry!.updatedAt })).toThrow();
      expect(made.seed).toBe(s.seed); expect(made.materials).toEqual(s.materials); expect(made.gold).toBe(s.gold);
      expect(validIndustry(made.industry)).toBe(true); assertSaveCompatibility(made, content);
    }
  });
  it('secures raw resources once only at claim; retreat, failure and trials cannot generate them', () => {
    const s = reward(), d = content.dungeons.find(d => d.id === s.battle!.dungeonId)!;
    expect(s.industry).toBeUndefined();
    const next = applyCommand(s, { type: 'claim' }, content, { now: 1000 });
    expect(next.industry!.stock).toEqual(industryLoot(d, s, content)); expect(s.industry).toBeUndefined();
    expect(() => applyCommand(next, { type: 'claim' }, content)).toThrow();
    const dead = reward(); dead.battle!.phase = 'failed'; dead.battle!.nextPhase = 'failed';
    expect(applyCommand(dead, { type: 'leaveFailure' }, content).industry).toBeUndefined();
    const retreat = reward(); retreat.battle!.phase = 'ready'; retreat.battle!.nextPhase = 'ready';
    expect(applyCommand(retreat, { type: 'retreat' }, content).industry).toBeUndefined();
    expect(industryLoot(content.dungeons.find(d => d.kind === 'trial')!, s, content)).toEqual({});
  });
  it('reserves and refunds real inputs once, finishes once across reload, and rejects unavailable stations', () => {
    let s = createInitialSave(content, 42); s.industry = emptyIndustry(0); s.industry.stock = { timber: 8, stone: 6 };
    expect(() => applyCommand(s, { type: 'industryCraft', recipeId: 'iron', count: 1 }, content, { now: 0 })).toThrow();
    const started = applyCommand(s, { type: 'industryCraft', recipeId: 'bench', count: 1 }, content, { now: 0 });
    expect(started.industry!.stock).toEqual({ timber: 4, stone: 3 });
    const canceled = applyCommand(started, { type: 'industryCancel' }, content, { now: 1000 });
    expect(canceled.industry!.stock).toEqual(s.industry.stock);
    expect(() => applyCommand(canceled, { type: 'industryCancel' }, content)).toThrow();
    s = decodeBackup(encodeBackup(started, content), content).save;
    s = applyCommand(s, { type: 'industrySync' }, content, { now: 12000 }); expect(s.industry!.stock.bench).toBe(1);
    s = applyCommand(s, { type: 'industrySync' }, content, { now: 13000 }); expect(s.industry!.stock.bench).toBe(1);
    expect(nextIndustryNeed(s.industry!, 'bench', 1)).toEqual({ kind: 'install', id: 'bench', count: 1 });
    s = applyCommand(s, { type: 'industryInstall', itemId: 'bench' }, content, { now: 13000 }); expect(nextIndustryNeed(s.industry!, 'bench', 1)).toBeUndefined();
  });
  it('runs independent furnaces with different recipes, conserves inputs and never banks starvation time', () => {
    const s = emptyIndustry(0); s.stock = { ore: 6, copper: 6, charcoal: 6 };
    s.machines = { 'furnace:1': { kind: 'furnace', enabled: true, recipeId: 'iron', progress: 0 }, 'furnace:2': { kind: 'furnace', enabled: true, recipeId: 'copper-ingot', progress: 0 } };
    settleIndustry(s, 30000); expect(s.stock).toMatchObject({ ore: 0, copper: 0, charcoal: 0, iron: 6, 'copper-ingot': 6 });
    settleIndustry(s, 60000); expect(s.stock.iron).toBe(6); expect(s.machines['furnace:1'].progress).toBe(0);
    s.stock.ore = 2; s.stock.charcoal = 1; settleIndustry(s, 69000); expect(s.stock.iron).toBe(6);
    settleIndustry(s, 70000); expect(s.stock.iron).toBe(8); expect(s.stock.charcoal).toBe(0);
    expect(validIndustry(JSON.parse(JSON.stringify(s)))).toBe(true);
  });
  it('resumes a blocked production line exactly when a paid manual job delivers its component', () => {
    const s = emptyIndustry(0); s.job = { recipeId: 'iron', count: 1, readyAt: 5000 };
    s.machines = { 'lathe:1': { kind: 'lathe', enabled: true, recipeId: 'turned-gear', progress: 0 } };
    settleIndustry(s, 15000); expect(s.stock.gear ?? 0).toBe(0); expect(s.stock.iron).toBe(2);
    settleIndustry(s, 16000); expect(s.stock.gear).toBe(4); expect(s.stock.iron).toBe(0);
  });
  it('caps offline production at two hours, stops at storage capacity and cannot duplicate with clock rollback', () => {
    const s = emptyIndustry(0); s.stock = { ore: 10000, charcoal: 10000, crate: 9 }; s.machines = { 'furnace:1': { kind: 'furnace', enabled: true, recipeId: 'iron', progress: 0 } };
    const week = 7 * 86400000; settleIndustry(s, week); expect(s.stock.iron).toBe(1440);
    settleIndustry(s, week); expect(s.stock.iron).toBe(1440); settleIndustry(s, 0); expect(s.stock.iron).toBe(1440);
    const full = emptyIndustry(0); full.stock = { ore: 100, charcoal: 100, iron: 200 }; full.machines = structuredClone(s.machines);
    settleIndustry(full, 60000); expect(full.stock).toEqual({ ore: 100, charcoal: 100, iron: 200 });
  });
  it('improves matching dungeon resource yields without touching combat stats, skill choices or battle RNG', () => {
    const base = createInitialSave(content, 42), upgraded = structuredClone(base); upgraded.industry = emptyIndustry(0); upgraded.industry.stock = { pick: 1, drill: 1, rod: 1 };
    const mining = content.dungeons.find(d => d.id === content.chapters![0].dungeonIds[0])!;
    expect(industryLoot(mining, upgraded, content).ore).toBeGreaterThan(industryLoot(mining, base, content).ore);
    const a = applyCommand(base, { type: 'depart', dungeonId: mining.id, potions: 0 }, content, { now: 12345 });
    const b = applyCommand(upgraded, { type: 'depart', dungeonId: mining.id, potions: 0 }, content, { now: 12345 });
    expect(a.battle).toEqual(b.battle); expect(a.seed).toBe(b.seed);
  });
  it('explains the exact chapter-three task and switches from crafting to a map conversation when the tool exists', () => {
    const s = createInitialSave(content, 42); s.worldStory = startWorldStory(s, content, defaultHero, 'beginning'); s.worldStory.carriedChapters = [1, 2];
    s.worldStory.completed = ['c3-visit', 'c3-record', 'c3-evacuate', 'c3-bridge']; s.completedDungeonIds = content.chapters![2].dungeonIds.slice(0, 10);
    const hub = content.worldStory!.hubs.find(h => h.id === 'hub-observatory')!; s.worldStory.position = { x: hub.x, y: hub.y };
    expect(storyNext(s, content.worldStory!)?.recipeId).toBe('sluice-handle'); expect(currentWorldObjective(s, content).kind).toBe('craft');
    expect(() => beginStoryTalk(s, content, 'c3-water', 1000)).toThrow();
    s.industry = emptyIndustry(0); s.industry.stock['sluice-handle'] = 1;
    const objective = currentWorldObjective(s, content); expect(objective.kind).toBe('talk'); expect(objective.action.ja).toBe('ノエルと話す'); expect(objective.reason.ja).toContain('水門');
    beginStoryTalk(s, content, 'c3-water', 1000); expect(s.worldStory.active?.nodeId).toBe('c3-water');
    delete s.worldStory.active; s.worldStory.completed.push('c3-water'); delete s.industry;
    expect(() => beginStoryTalk(s, content, 'c3-water', 1000)).not.toThrow();
  });
  it('rejects corrupt stock, unknown recipes, invalid machine routes and negative clocks without resetting old saves', () => {
    const old = createInitialSave(content, 42); assertValidSave(old);
    for (const s of [ { ...emptyIndustry(0), stock: { ore: -1 } }, { ...emptyIndustry(0), stock: { invented: 2 } }, { ...emptyIndustry(0), updatedAt: NaN }, { ...emptyIndustry(0), job: { recipeId: 'invented', count: 1, readyAt: 1 } }, { ...emptyIndustry(0), machines: { 'furnace:1': { kind: 'furnace', enabled: true, recipeId: 'wire', progress: 0 } } } ]) {
      expect(validIndustry(s)).toBe(false); expect(() => assertValidSave({ ...old, industry: s })).toThrow();
    }
  });
});
