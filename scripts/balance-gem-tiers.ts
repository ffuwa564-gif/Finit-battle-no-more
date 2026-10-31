import { mkdirSync, writeFileSync } from 'node:fs';
import { content } from '../src/content/index';
import { dungeonGemLootProfile, gemPowerTier, gemTraitTier, gemTier, rollGemDrop } from '../src/domain/memory-gems';

const samples = 100_000;
const ids = ['silent-cathedral', 'stone-fountain', 'event-whiteflower-path', 'veiled-cloister', 'hollow-gate', 'pale-throne', 'lunette-advanced', 'lunette-awakening', 'ivory-tower-001', 'ivory-tower-020', 'ivory-tower-100'];
// Tower ids are content-defined; avoid assuming their padding convention.
const destinations = [...content.dungeons.filter(dungeon => ids.includes(dungeon.id)), ...[1, 20, 100].map(floor => content.dungeons.find(dungeon => dungeon.towerFloor === floor)!)];
const rows = [...new Map(destinations.map(dungeon => [dungeon.id, dungeon])).values()].map(dungeon => {
  const profile = dungeonGemLootProfile(dungeon);
  let seed = 0xa10ce, drops = 0, tier4 = 0, tier5 = 0, power4 = 0, power5 = 0, trait4 = 0, trait5 = 0, featured = 0, featuredUpper = 0;
  for (let index = 0; index < samples; index++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const gem = rollGemDrop(dungeon, seed >>> 0, `tier-audit:${index}`, { boss: true }).gem;
    if (!gem) continue;
    drops++;
    const tier = gemTier(gem);
    if (tier === 4) tier4++;
    if (tier === 5) tier5++;
    if (gemPowerTier(gem) === 4) power4++;
    if (gemPowerTier(gem) === 5) power5++;
    if (gemTraitTier(gem) === 4) trait4++;
    if (gemTraitTier(gem) === 5) trait5++;
    if (gem.defId === profile.featuredDefId) { featured++; if (tier >= 4) featuredUpper++; }
  }
  const probability = (count: number) => Number((count / samples).toFixed(6));
  const waiting = (count: number) => {
    const chance = count / samples;
    return chance ? { meanRuns: Number((1 / chance).toFixed(1)), runsFor95PercentChance: Math.ceil(Math.log(.05) / Math.log1p(-chance)) } : null;
  };
  return { id: dungeon.id, name: dungeon.name, profile, samples, perFinalWave: { stone: probability(drops), itemTier4: probability(tier4), itemTier5: probability(tier5), powerTier4: probability(power4), powerTier5: probability(power5), traitTier4: probability(trait4), traitTier5: probability(trait5), featured: probability(featured), featuredTier4Or5: probability(featuredUpper) }, waitingForAnyTier4Or5: waiting(tier4 + tier5), waitingForAnyTier5: waiting(tier5), waitingForFeaturedTier4Or5: waiting(featuredUpper) };
});
const report = { note: 'Deterministic sampling of final-wave loot only, excluding the first guaranteed stone. Rates are per completed final-wave draw, not conditional on a stone. Waiting estimates assume independent equivalent runs, include no combat losses or elapsed time, and are not measured player retention.', samplesPerDestination: samples, rows };
mkdirSync('docs/reports', { recursive: true });
writeFileSync('docs/reports/gem-tier-drops.json', JSON.stringify(report, null, 2) + '\n');
console.table(rows.map(row => ({ destination: row.name, stone: row.perFinalWave.stone, T4: row.perFinalWave.itemTier4, T5: row.perFinalWave.itemTier5, featuredUpper: row.perFinalWave.featuredTier4Or5, upperMeanRuns: row.waitingForAnyTier4Or5?.meanRuns ?? '—', upper95Runs: row.waitingForAnyTier4Or5?.runsFor95PercentChance ?? '—' })));
