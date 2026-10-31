import { BUILD_DEFINITIONS, type BuildStage } from './builds';
import { advanceReplay, createBattle, resolveRound } from './engine';
import { gemDefinitionForSkill, gemSkill, type MemoryGem } from './memory-gems';
import { partyOrderOptions } from './party-orders';
import { ultimateReady } from './ultimates';
import type { Battle, BattleEvent, Content, Unit } from './types';

export type BuildDemoHighlight = 'chain' | 'echo' | 'barrier' | 'shield' | 'battery' | 'ultimate';
export interface BuildDemoFrame { event: BattleEvent; units: Unit[]; before: Unit[]; wave: number; round: number; highlight?: BuildDemoHighlight }
export interface BuildDemoProof { chainHits: number; echoHits: number; barrierCasts: number; shieldShots: number; consumedBarrier: number; batteryCharges: number; chargeReceived: number; rabbitUltimates: number }
export interface BuildDemoResult { dungeonId: string; partyIds: string[]; leaderId: string; initialUnits: Unit[]; frames: BuildDemoFrame[]; events: BuildDemoFrame[]; proof: BuildDemoProof; demonstrated: boolean }

/** Isolated fixture inventory. Never reads or writes a player's save, stats, seed or resources. */
export function createBuildDemo(content: Content, buildId: string, stage: BuildStage): BuildDemoResult {
  const definition = BUILD_DEFINITIONS.find(build => build.id === buildId);
  if (!definition || !definition.stages[stage]) throw new Error('このビルドの実演はありません。');
  const recipe = definition.stages[stage];
  const partyIds = recipe.slots.map(slot => slot.characterIds[0]);
  const leaderId = partyIds[recipe.leaderSlot];
  const dungeonId = buildId === 'echo-chain' ? stage === 'perfect' ? 'kuzuha-advanced' : 'drowned-vestry' : 'veiled-cloister';
  const fixtures: Record<string, MemoryGem> = Object.fromEntries(recipe.slots.map((slot, index) => [partyIds[index], {
    id: `build-demo-${buildId}-${index}`, defId: slot.gem.defId, variant: slot.gem.variant,
    roll: { power: slot.gem.power, trait: slot.gem.trait ?? 'none', value: slot.gem.value ?? 0 },
  }]));
  let battle = createBattle(content, partyIds, leaderId, dungeonId, 0, 109, `build-demo-${buildId}-${stage}`);
  battle.memoryGems = fixtures;
  const initialUnits = structuredClone(battle.initialUnits);
  const frames: BuildDemoFrame[] = [];
  const proof: BuildDemoProof = { chainHits:0, echoHits:0, barrierCasts:0, shieldShots:0, consumedBarrier:0, batteryCharges:0, chargeReceived:0, rabbitUltimates:0 };
  let steps = 0, rounds = 0;
  while (!['failed','reward'].includes(battle.phase) && steps++ < 1500 && rounds < 22) {
    if (battle.phase === 'playing') { battle = advanceReplay(battle,content); continue; }
    const pilot = battle.units.find(unit => unit.side === 'party' && unit.characterId === partyIds[0] && unit.hp > 0);
    const foes = battle.units.filter(unit => unit.side === 'enemy' && unit.hp > 0);
    if (!pilot || !foes.length) break;
    // A durable target lets a delayed echo be observed without inventing enemy HP.
    battle.focusTargetId = [...foes].sort((a,b) => b.hp-a.hp)[0].uid;
    for (const friend of battle.units.filter(unit => unit.side === 'party' && unit.hp > 0)) {
      if (ultimateReady(friend) && (friend.characterId.startsWith('lunette') || content.characters.find(ch => ch.id === friend.characterId)?.role === 'tank')) friend.ultimateQueued = true;
    }
    const options = partyOrderOptions(pilot,battle,content).filter(option => !option.disabled);
    const memory = options.find(option => option.id === `skill:${gemSkill(fixtures[pilot.characterId]).id}`);
    const ultimate = options.find(option => option.id === 'ultimate');
    if (pilot.characterId.startsWith('lunette') && ultimate) battle.partyOrder = ultimate.order ?? undefined;
    else if (memory) battle.partyOrder = memory.order ?? undefined;
    else if (buildId === 'shield-cannon') battle.partyOrder = {kind:'guard'};
    else delete battle.partyOrder;
    const before = structuredClone(battle.units), wave = battle.wave, round = battle.round;
    battle = resolveRound(battle,content).battle;
    let previous = before;
    for (const event of battle.events) {
      const units = structuredClone(event.unitsAfter ?? previous);
      const gem = event.skillId ? gemDefinitionForSkill(event.skillId) : undefined;
      const friendly = event.actorId?.startsWith('party:');
      let highlight: BuildDemoHighlight | undefined;
      const barrierGain = units.filter(unit=>unit.side==='party').reduce((sum,unit)=>sum + Math.max(0,(unit.barrier ?? 0)-(previous.find(old=>old.uid===unit.uid)?.barrier ?? 0)),0);
      if (buildId === 'shield-cannon' && friendly && event.actionSelection && barrierGain > 0) { proof.barrierCasts++; highlight='barrier'; }
      else if (friendly && event.text.endsWith('・連鎖') && (event.amount ?? 0) > 0) { proof.chainHits++; highlight='chain'; }
      else if (friendly && event.text.endsWith('・残響') && (event.amount ?? 0) > 0) { proof.echoHits++; highlight='echo'; }
      else if (friendly && gem?.id === 'shield-break' && event.actionSelection && (event.amount ?? 0) > 0) {
        const consumed = previous.filter(unit=>unit.side==='party').reduce((sum,unit)=>sum + Math.max(0,(unit.barrier ?? 0)-(units.find(next=>next.uid===unit.uid)?.barrier ?? 0)),0);
        if (consumed > 0) { proof.shieldShots++; proof.consumedBarrier += consumed; highlight='shield'; }
      } else if (friendly && gem?.id === 'star-furnace' && event.actionSelection) {
        const rabbit = units.find(unit=>unit.characterId.startsWith('lunette') && event.targetIds?.includes(unit.uid));
        const old = previous.find(unit=>unit.uid===rabbit?.uid);
        const gained = rabbit && old ? (rabbit.ultimateCharge ?? 0)-(old.ultimateCharge ?? 0) : 0;
        if (gained > 0) { proof.batteryCharges++; proof.chargeReceived += gained; highlight='battery'; }
      } else if (event.ultimate && event.actorId && units.find(unit=>unit.uid===event.actorId)?.characterId.startsWith('lunette') && friendly) { proof.rabbitUltimates++; highlight='ultimate'; }
      if (event.unitsAfter && !['drop','dialogue','wave','defeat'].includes(event.kind)) frames.push({event:structuredClone(event),units,before:structuredClone(previous),wave,round,highlight});
      previous = units;
    }
    rounds++;
    if (buildId === 'echo-chain' && proof.chainHits && proof.echoHits || buildId === 'shield-cannon' && proof.shieldShots || buildId === 'rabbit-battery' && proof.batteryCharges && proof.rabbitUltimates) break;
  }
  const demonstrated = buildId === 'echo-chain' ? proof.chainHits > 0 && proof.echoHits > 0 : buildId === 'shield-cannon' ? proof.shieldShots > 0 : proof.batteryCharges > 0 && proof.rabbitUltimates > 0;
  // Preserve event order while selecting the real lead-in and consequence around each synergy.
  const required: BuildDemoHighlight[] = buildId === 'echo-chain' ? ['chain','echo'] : buildId === 'shield-cannon' ? ['barrier','shield'] : ['battery','ultimate'];
  const important = required.map(kind=>frames.findIndex(frame=>frame.highlight===kind)).filter(index=>index>=0);
  // Include the actual creation of the consumed shield, which may be several turns earlier.
  const shotIndex = frames.findIndex(frame=>frame.highlight==='shield');
  if (shotIndex >= 0) {
    const shot = frames[shotIndex];
    const donor = shot.before.find(unit=>unit.side==='party' && (unit.barrier ?? 0)>(shot.units.find(next=>next.uid===unit.uid)?.barrier ?? 0));
    if (donor) for(let index=shotIndex-1;index>=0;index--) {
      const source = frames[index];
      if ((source.units.find(unit=>unit.uid===donor.uid)?.barrier ?? 0)>(source.before.find(unit=>unit.uid===donor.uid)?.barrier ?? 0)) {important.push(index);break;}
    }
  }
  const selected = new Set<number>();
  for (const index of important) for(let offset=-1;offset<=1;offset++) if(index+offset>=0&&index+offset<frames.length) selected.add(index+offset);
  // Fill only remaining space; a later defining event must never be sliced away.
  for (const [index,frame] of frames.entries()) if(frame.highlight) for(let offset=-1;offset<=1;offset++) if(selected.size<16&&index+offset>=0&&index+offset<frames.length) selected.add(index+offset);
  const excerpt = [...selected].sort((a,b)=>a-b).map(index=>frames[index]);
  return {dungeonId,partyIds,leaderId,initialUnits,frames:excerpt.length ? excerpt : frames.slice(0,12),events:frames,proof,demonstrated};
}
