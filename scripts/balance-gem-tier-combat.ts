import { mkdir, writeFile } from 'node:fs/promises';
import { content } from '../src/content';
import { advanceReplay, createBattle, resolveRound } from '../src/domain/engine';
import { GEM_DEFINITIONS, gemDefinitionForSkill, type MemoryGem } from '../src/domain/memory-gems';
import { partyOrderOptions } from '../src/domain/party-orders';

const seeds = Number(process.argv.find(arg => arg.startsWith('--seeds='))?.split('=')[1] ?? 5);
if (!Number.isInteger(seeds) || seeds < 1 || seeds > 30) throw new Error('Use --seeds=1..30');
const parties = [
  { name: 'initial', ids: ['seris', 'liora', 'elaine', 'noelle'], leader: 'liora' },
  { name: 'SSR', ids: ['nox', 'athena', 'selene', 'asteria'], leader: 'athena' },
];
const loadouts = [
  { name: 'damage-and-barrier', gems: ['shield-break', 'pale-ward', 'hollow-lantern', 'dawn-crown'], pilotAuto: false },
  { name: 'three-batteries-stress', gems: ['night-dew', 'star-furnace', 'star-furnace', 'star-furnace'], pilotAuto: false },
  { name: 'battery-rewind-stress', gems: ['night-dew', 'star-furnace', 'rewind-thread', 'star-furnace'], pilotAuto: false },
  { name: 'four-sleep-forced-stress', gems: ['dream-lace', 'dream-lace', 'dream-lace', 'dream-lace'], pilotAuto: false },
  { name: 'four-sleep-auto-stress', gems: ['dream-lace', 'dream-lace', 'dream-lace', 'dream-lace'], pilotAuto: true },
];
const qualities = [
  { name: 'legacy-best', power: 100, value: 100 },
  { name: 'T4-floor', power: 120, value: 120 },
  { name: 'T5-ceiling', power: 179, value: 179 },
];
const stages = ['silent-cathedral', 'stone-fountain', 'hollow-gate', 'kuzuha-advanced', 'lunette-advanced', ...[1, 5].map(floor => content.dungeons.find(stage => stage.towerFloor === floor)!.id)];
const damage = new Set(['attack', 'area', 'pierce', 'drain', 'shatter', 'dawn']);
interface Outcome { seed: number; win: boolean; rounds: number; gemUses: number; ultimates: number; sleepSkips: number; sleepAttempts: number; sleepBlockedAttempts: number; maxBossSkipStreak: number; survivors: number }
interface ComparisonRecord {
  party: string; loadout: string; stage: string; quality: string; wins: number; seeds: number;
  averageRounds: number; averageGemUses: number; averageUltimates: number; averageSleepSkips: number;
  sleepAttempts: number; sleepBlockedAttempts: number; maxBossSkipStreak: number; outcomes: Outcome[];
}
const records: ComparisonRecord[] = [];
for (const party of parties) for (const loadout of loadouts) for (const stage of stages) for (const quality of qualities) {
  const outcomes: Outcome[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    let battle = createBattle(content, party.ids, party.leader, stage, 0, seed, `tier-balance-${seed}`);
    battle.memoryGems = Object.fromEntries(party.ids.map((id, index) => {
      const defId = loadout.gems[index], def = GEM_DEFINITIONS.find(candidate => candidate.id === defId)!;
      return [id, { id: `comparison-${index}`, defId, variant: 'pure', roll: {
        power: quality.power, trait: damage.has(def.skill.template) ? 'execution' : 'bulwark', value: quality.value,
      } } satisfies MemoryGem];
    }));
    let rounds = 0, gemUses = 0, ultimates = 0, sleepSkips = 0, sleepAttempts = 0, sleepBlockedAttempts = 0, maxBossSkipStreak = 0, steps = 0;
    const bossSkipStreak = new Map<string, number>();
    while (!['reward', 'failed'].includes(battle.phase) && steps++ < 2500) {
      if (battle.phase === 'playing') { battle = advanceReplay(battle, content); continue; }
      const pilot = battle.units.find(unit => unit.characterId === party.ids[0] && unit.side === 'party' && unit.hp > 0);
      if (pilot) {
        battle.crystalRole = content.characters.find(character => character.id === pilot.characterId)!.role;
        for (const friend of battle.units.filter(unit => unit.side === 'party' && unit.hp > 0 && unit.uid !== pilot.uid)) {
          if ((friend.ultimateCharge ?? 0) === 100) friend.ultimateQueued = true;
        }
        const options = partyOrderOptions(pilot, battle, content).filter(option => !option.disabled);
        battle.partyOrder = options.find(option => option.id === 'ultimate')?.order ?? (loadout.pilotAuto ? undefined : options.find(option => option.id.startsWith('skill:memory:'))?.order) ?? undefined;
      }
      const next = resolveRound(battle, content).battle;
      gemUses += next.events.filter(event => event.actionSelection && event.skillId && gemDefinitionForSkill(event.skillId)).length;
      ultimates += next.events.filter(event => event.ultimate).length;
      sleepSkips += next.events.filter(event => event.statusAction === 'skip' && event.ailment === 'sleep' && event.actorId?.startsWith('enemy:')).length;
      let previousUnits = next.initialUnits;
      for (const event of next.events) {
        if (event.actionSelection && event.skillId && gemDefinitionForSkill(event.skillId)?.id === 'dream-lace') {
          sleepAttempts++;
          if (event.targetIds?.some(id => {
            const target = previousUnits.find(unit => unit.uid === id);
            return target && ((target.statusWardUntil ?? -1) >= next.round || Object.values(target.ailments ?? {}).some(state => state && state.turns > 0));
          })) sleepBlockedAttempts++;
        }
        if (event.unitsAfter) previousUnits = event.unitsAfter;
      }
      for (const boss of next.units.filter(unit => unit.side === 'enemy' && unit.boss)) {
        const skipped = next.events.some(event => event.actorId === boss.uid && event.statusAction === 'skip');
        const acted = next.events.some(event => event.actorId === boss.uid && event.actionSelection);
        if (skipped) {
          const streak = (bossSkipStreak.get(boss.uid) ?? 0) + 1;
          bossSkipStreak.set(boss.uid, streak); maxBossSkipStreak = Math.max(maxBossSkipStreak, streak);
        } else if (acted) bossSkipStreak.set(boss.uid, 0);
      }
      battle = next; rounds++;
    }
    outcomes.push({ seed, win: battle.phase === 'reward', rounds, gemUses, ultimates, sleepSkips, sleepAttempts, sleepBlockedAttempts, maxBossSkipStreak, survivors: battle.units.filter(unit => unit.side === 'party' && unit.hp > 0).length });
  }
  const average = (key: 'rounds' | 'gemUses' | 'ultimates' | 'sleepSkips') => Number((outcomes.reduce((sum, outcome) => sum + outcome[key], 0) / seeds).toFixed(2));
  records.push({ party: party.name, loadout: loadout.name, stage, quality: quality.name, wins: outcomes.filter(outcome => outcome.win).length, seeds, averageRounds: average('rounds'), averageGemUses: average('gemUses'), averageUltimates: average('ultimates'), averageSleepSkips: average('sleepSkips'), sleepAttempts: outcomes.reduce((sum, outcome) => sum + outcome.sleepAttempts, 0), sleepBlockedAttempts: outcomes.reduce((sum, outcome) => sum + outcome.sleepBlockedAttempts, 0), maxBossSkipStreak: Math.max(...outcomes.map(outcome => outcome.maxBossSkipStreak)), outcomes });
}
const pairedComparisons = records.filter(record => record.quality !== 'legacy-best').map(record => {
  const baseline = records.find(candidate => candidate.party === record.party && candidate.loadout === record.loadout && candidate.stage === record.stage && candidate.quality === 'legacy-best')!;
  const pairedWins = record.outcomes.flatMap(outcome => {
    const before = baseline.outcomes.find(candidate => candidate.seed === outcome.seed)!;
    return outcome.win && before.win ? [{ seed: outcome.seed, before: before.rounds, after: outcome.rounds }] : [];
  });
  return { party: record.party, loadout: record.loadout, stage: record.stage, quality: record.quality, pairedWins, winsBefore: baseline.wins, winsAfter: record.wins };
});
const report = {
  kind: 'paired-seed-domain-combat-comparison', revision: 'sleep-power-charge-v2', qualities, stages, seeds,
  assumptions: {
    identicalPartiesSkillsVariantsAndSeeds: true,
    qualityDoesNotRepresentAcquisitionTime: true,
    loadoutsAreComparisonsNotOptimalBuilds: true,
    sleepTierModel: 'All tiers keep cooldown 4, ordinary/boss chance caps 95/60, boss sleep one action and status wards. Power T4/T5 adds 15/30 self ultimate charge once per actual cast, on success or resistance.',
    policy: 'pilot-ultimate-then-gem-else-AI, except four-sleep-auto-stress uses pilot-ultimate-then-AI; companion-ultimates-queued; pilot-crystal; no-potions-or-flowers-or-fairies',
    limitation: 'Finite fixed-policy samples do not prove balance, monotonic wins, player fun, or impossibility. Three batteries and four sleep stones are deliberate stress cases.',
  }, records, pairedComparisons,
};
await mkdir('docs/reports', { recursive: true });
await writeFile('docs/reports/memory-gem-tier-combat.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(records.map(({ outcomes, ...summary }) => summary), null, 2));
