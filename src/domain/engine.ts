import { ailments, ailmentNames, isAilment, hasAilment, cureAilments, ailmentChance } from './ailments';
import { skillCooldown } from './skill-info';
import { duplicateFamily } from './events';
import type { Ailment, Battle, BattleEvent, CharacterDef, Content, DungeonDef, LeaderStat, MaterialCost, RoundResult, SkillDef, SkillTemplate, Stats, Strategy, Unit } from './types';

const BASE: Record<CharacterDef['role'], Stats> = {
  healer: { hp: 100, attack: 25, defense: 14, speed: 12 },
  tank: { hp: 160, attack: 18, defense: 26, speed: 18 },
  attacker: { hp: 100, attack: 32, defense: 12, speed: 14 },
  area_attacker: { hp: 90, attack: 28, defense: 10, speed: 11 },
  supporter: { hp: 110, attack: 22, defense: 16, speed: 13 },
  debuffer: { hp: 100, attack: 24, defense: 12, speed: 15 },
};
const clone = <T>(value: T): T => structuredClone(value);
const byId = (a: { uid: string }, b: { uid: string }) => a.uid.localeCompare(b.uid);
const character = (content: Content, id: string): CharacterDef => {
  const result = content.characters.find((item) => item.id === id);
  if (!result) throw new Error(`不明なキャラクター: ${id}`);
  return result;
};
const bossLine = (content: Content, id: string, phase: 'intro' | 'threshold' | 'defeat'): string => {
  const def = character(content, id);
  const fallback = { intro: 'この静寂を、乱すのは誰……', threshold: 'まだ、ここを去るわけには……', defeat: 'どうか、この記憶を……' };
  const line = def.dialogue?.[phase]?.trim() || fallback[phase];
  return `${def.name}「${line}」`;
};
const dungeon = (content: Content, id: string): DungeonDef => {
  const result = content.dungeons.find((item) => item.id === id);
  if (!result) throw new Error(`不明なダンジョン: ${id}`);
  return result;
};

/** All random results are driven by the persisted uint32 state, never Math.random. */
export function rng(seed: number): { seed: number; value: number } {
  const next = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
  return { seed: next, value: next / 4294967296 };
}
export function skillFactor(strength: number): number { return 1 + (strength - 10) / 40; }
export function baseStats(def: CharacterDef): Stats {
  const base = BASE[def.role];
  if (!base || !Number.isInteger(def.strength) || def.strength <= 0) throw new Error('キャラクターの能力定義が不正です');
  return { hp: Math.round(base.hp * def.strength / 10), attack: Math.round(base.attack * def.strength / 10), defense: Math.round(base.defense * def.strength / 10), speed: base.speed };
}
export function leaderBonus(def: CharacterDef): { stat: LeaderStat; percent: number } {
  return { stat: def.leaderStat, percent: (def.leaderStat === 'hp' ? 8 : def.leaderStat === 'attack' ? 3 : 10) * def.strength / 10 };
}
export function characterStats(def: CharacterDef, leader?: CharacterDef, boss = false, scale = { hp: 300, attack: 120 }): Stats {
  const stats = baseStats(def);
  if (boss) { stats.hp = Math.round(stats.hp * scale.hp / 100); stats.attack = Math.round(stats.attack * scale.attack / 100); }
  if (leader) {
    const bonus = leaderBonus(leader);
    const rate = bonus.stat === 'hp' ? 8 : bonus.stat === 'attack' ? 3 : 10;
    stats[bonus.stat] = Math.round(stats[bonus.stat] * (1000 + rate * leader.strength) / 1000);
  }
  return stats;
}
export function dungeonDifficulty(def: DungeonDef, content: Content): number {
  const scale = def.bossScale ?? { hp: 300, attack: 120 };
  const waves = def.waves.map((wave, index) => {
    const base = wave.reduce((sum, enemy) => sum + character(content, enemy.characterId).strength / 10 * (enemy.boss ? Math.sqrt(scale.hp * scale.attack / 10_000) : 1), 0);
    if (!def.rareEncounter || index !== def.waves.length - 2) return base;
    // The displayed constant covers the hardest possible replacement, not just the common lineup.
    const rare = Math.max(...def.rareEncounter.characterIds.map(id => character(content, id).strength / 10));
    return Math.max(base, base - character(content, wave[0]!.characterId).strength / 10 + rare);
  });
  const max = Math.max(0, ...waves);
  return Math.round((max + 0.25 * (waves.reduce((sum, value) => sum + value, 0) - max)) * 10) / 10;
}
export function recruitCost(def: CharacterDef): MaterialCost[] {
  const value = def.strength / 10;
  const costs: MaterialCost[] = [
    { materialId: `${def.speciesId}:common`, count: Math.ceil(4 * value) },
    { materialId: `${def.speciesId}:rare`, count: Math.ceil(value) },
  ];
  if (value >= 2) costs.push({ materialId: `${def.speciesId}:epic`, count: Math.ceil(value - 1) });
  return costs;
}
function emit(battle: Battle, event: Omit<BattleEvent, 'id'>): void {
  const textKey = [...event.text].reduce((hash, char) => Math.imul(hash, 31) + char.charCodeAt(0) | 0, 0) >>> 0;
  battle.events.push({ ...event, id: `${battle.id}:w${battle.wave}:r${battle.round}:${event.kind}:${textKey}:e${battle.events.length}` });
}
function makeUnit(battle: Battle, content: Content, characterId: string, side: Unit['side'], index: number, boss = false): Unit {
  const def = character(content, characterId);
  const leader = side === 'party' ? character(content, battle.leaderId) : undefined;
  const stats = characterStats(def, leader, boss, dungeon(content, battle.dungeonId).bossScale);
  const random = rng(battle.seed); battle.seed = random.seed;
  return { uid: side === 'party' ? `party:${characterId}` : `enemy:w${battle.wave}:${index}:${characterId}`, characterId, side, boss, hp: stats.hp, maxHp: stats.hp, attack: stats.attack, defense: stats.defense, speed: stats.speed, tie: random.seed, cooldowns: {} };
}
function clearEffects(unit: Unit): void {
  delete unit.ailments; delete unit.statusWardUntil;
  delete unit.bits;
  delete unit.guardTarget; delete unit.guardUntil; delete unit.guardStrength;
  delete unit.buffUntil; delete unit.buffStrength; delete unit.debuffUntil; delete unit.debuffStrength;
  delete unit.barrier; delete unit.barrierUntil; delete unit.regenUntil; delete unit.regenStrength;
}
function openWave(battle: Battle, content: Content, first: boolean): Battle {
  const def = dungeon(content, battle.dungeonId);
  let wave = def.waves[battle.wave];
  if (!wave?.length || wave.length > 4) throw new Error('Waveの敵編成が不正です');
  const party = first ? battle.partyIds.map((id, i) => makeUnit(battle, content, id, 'party', i)) : battle.units.filter((unit) => unit.side === 'party');
  party.forEach((unit) => { clearEffects(unit); unit.cooldowns = {}; });
  let rareId: string | undefined;
  if (def.rareEncounter && battle.wave === def.waves.length - 2) {
    const roll = rng(battle.seed); battle.seed = roll.seed;
    if (roll.value * 100 < def.rareEncounter.chance) {
      const pick = rng(battle.seed); battle.seed = pick.seed;
      rareId = def.rareEncounter.characterIds[Math.floor(pick.value * def.rareEncounter.characterIds.length)]!;
      wave = [{ characterId: rareId }, ...wave.slice(1)];
    }
  }
  battle.units = [...party, ...wave.map((enemy, i) => makeUnit(battle, content, enemy.characterId, 'enemy', i, !!enemy.boss))];
  battle.round = 1; battle.potionUsed = false;
  battle.initialUnits = clone(battle.units); battle.events = []; battle.cursor = 0;
  battle.phase = 'playing'; battle.nextPhase = 'ready';
  emit(battle, { kind: 'wave', text: `Wave ${battle.wave + 1} / ${def.waves.length}`, unitsAfter: clone(battle.units) });
  if (rareId) emit(battle, { kind: 'dialogue', actorId: battle.units.find(unit => unit.side === 'enemy' && unit.characterId === rareId)!.uid, text: `希少な気配 — ${character(content, rareId).name}` });
  for (const boss of battle.units.filter((unit) => unit.boss)) {
    const flag = `${boss.uid}:enter`;
    if (!battle.talkFlags.includes(flag)) {
      battle.talkFlags.push(flag);
      emit(battle, { kind: 'dialogue', actorId: boss.uid, text: bossLine(content, boss.characterId, 'intro') });
    }
  }
  return battle;
}
export function createBattle(content: Content, partyIds: string[], leaderId: string, dungeonId: string, potions: number, seed: number, id: string): Battle {
  if (duplicateFamily(partyIds, content) || partyIds.length < 1 || partyIds.length > 4 || new Set(partyIds).size !== partyIds.length || !partyIds.includes(leaderId)) throw new Error('編成とリーダーを確認してください');
  if (!Number.isInteger(potions) || potions < 0 || potions > 5) throw new Error('薬の持ち込み数が不正です');
  const def = dungeon(content, dungeonId);
  if (!def.published || !def.waves.length) throw new Error('このダンジョンには出発できません');
  return openWave({ id, dungeonId, contentVersion: content.contentVersion, rulesVersion: content.rulesVersion, wave: 0, round: 1, units: [], initialUnits: [], partyIds: [...partyIds], leaderId, strategy: 'balanced', potionsRemaining: potions, potionUsed: false, pendingMaterials: {}, seed: seed >>> 0, talkFlags: [], phase: 'playing', nextPhase: 'ready', events: [], cursor: 0, goldEarned: 0 }, content, true);
}
function alive(units: Unit[], side: Unit['side']): Unit[] { return units.filter((unit) => unit.side === side && unit.hp > 0); }
function lowerHP(a: Unit, b: Unit): number { return a.hp / a.maxHp - b.hp / b.maxHp || byId(a, b); }
function leaderEffect(battle: Battle, content: Content): CharacterDef['leaderEffect'] {
  const leader = battle.units.find(unit => unit.side === 'party' && unit.characterId === battle.leaderId && unit.hp > 0);
  return leader ? character(content, leader.characterId).leaderEffect : undefined;
}
function effectiveAttack(unit: Unit, round: number): number {
  return Math.round(unit.attack * ((unit.buffUntil ?? -1) >= round ? 230 + (unit.buffStrength ?? 10) : 200) / 200);
}
function effectiveDefense(unit: Unit, round: number): number {
  return Math.round(unit.defense * ((unit.debuffUntil ?? -1) >= round ? 170 - (unit.debuffStrength ?? 10) : 200) / 200);
}
function clearInvalidGuards(battle: Battle): void {
  for (const unit of battle.units) if (unit.hp <= 0 || !battle.units.some((target) => target.uid === unit.guardTarget && target.hp > 0)) {
    delete unit.guardTarget; delete unit.guardUntil; delete unit.guardStrength;
  }
}
function chooseTarget(enemies: Unit[], strategy: Strategy, content: Content): Unit {
  const awake = enemies.filter(unit => !unit.ailments?.sleep);
  return [...(awake.length ? awake : enemies)].sort((a, b) => {
    if (strategy === 'aggressive') return b.attack - a.attack || byId(a, b);
    if (strategy === 'survival') {
      const role = Number(character(content, b.characterId).role === 'healer') - Number(character(content, a.characterId).role === 'healer');
      if (role) return role;
    }
    return a.hp - b.hp || byId(a, b);
  })[0]!;
}
function skillList(actor: Unit, content: Content, round: number): SkillDef[] {
  return character(content, actor.characterId).skillIds.map((id) => {
    const skill = content.skills.find((item) => item.id === id);
    if (!skill) throw new Error(`不明なスキル: ${id}`);
    return skill;
  }).filter((skill) => (actor.cooldowns[skill.id] ?? 0) <= round).sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
}
interface Action { skill?: SkillDef; template: SkillTemplate; targets: Unit[]; forcedBy?: Ailment }
function emitRecovery(battle: Battle, unit: Unit, id: Ailment, content: Content): void {
  emit(battle, { kind: 'buff', statusAction: 'recover', ailment: id, actorId: unit.uid, targetIds: [unit.uid], text: `${character(content, unit.characterId).name} — ${ailmentNames[id]}解除`, unitsAfter: clone(battle.units) });
}
function emitCures(battle: Battle, before: Unit[], content: Content, actorId: string): void {
  for (const old of before.filter(unit => unit.uid !== actorId)) {
    const unit = battle.units.find(item => item.uid === old.uid)!;
    if (unit.hp > 0) for (const id of ailments) if (old.ailments?.[id] && !unit.ailments?.[id]) emitRecovery(battle, unit, id, content);
  }
}
function ageAilments(unit: Unit, round: number): Ailment[] {
  const recovered: Ailment[] = [];
  for (const id of ailments) {
    const state = unit.ailments?.[id];
    if (state && --state.turns <= 0) { delete unit.ailments![id]; unit.statusWardUntil = round + 1; recovered.push(id); }
  }
  if (!hasAilment(unit)) delete unit.ailments;
  return recovered;
}
function controlledAction(actor: Unit, battle: Battle, content: Content): { skip?: boolean; ailment?: Ailment; action?: Action } {
  if (actor.ailments?.charm && !battle.units.some(unit => unit.uid === actor.ailments!.charm!.sourceId && unit.hp > 0)) {
    delete actor.ailments.charm; actor.statusWardUntil = battle.round + 1; emitRecovery(battle, actor, 'charm', content);
  }
  if (actor.ailments?.sleep) return { skip: true, ailment: 'sleep' };
  if (actor.ailments?.paralysis) {
    const roll = rng(battle.seed); battle.seed = roll.seed;
    if (roll.value < .4) return { skip: true, ailment: 'paralysis' };
  }
  const forcedBy = actor.ailments?.charm ? 'charm' : actor.ailments?.confusion ? 'confusion' : undefined;
  if (!forcedBy) return {};
  let side = actor.side;
  if (forcedBy === 'confusion') { const roll = rng(battle.seed); battle.seed = roll.seed; side = roll.value < .5 ? actor.side : actor.side === 'party' ? 'enemy' : 'party'; }
  const targets = alive(battle.units, side).filter(unit => forcedBy !== 'charm' || unit.uid !== actor.uid).sort(byId);
  if (!targets.length) return { skip: true, ailment: forcedBy };
  const roll = rng(battle.seed); battle.seed = roll.seed;
  return { action: { template: 'attack', targets: [targets[Math.floor(roll.value * targets.length)]!], forcedBy } };
}
function chooseAction(actor: Unit, battle: Battle, content: Content): Action {
  const allies = alive(battle.units, actor.side);
  const enemies = alive(battle.units, actor.side === 'party' ? 'enemy' : 'party');
  const role = character(content, actor.characterId).role;
  const strategy = actor.side === 'party' ? battle.strategy : 'balanced';
  const skills = skillList(actor, content, battle.round);
  const get = (template: SkillTemplate) => skills.find((skill) => skill.template === template);
  if (role === 'healer') {
    const target = [...allies].sort(lowerHP)[0];
    const threshold = strategy === 'aggressive' ? 0.3 : strategy === 'survival' ? 0.8 : 0.6;
    const skill = get('heal');
    if (skill && target && target.hp / target.maxHp <= threshold && target.hp < target.maxHp) return { skill, template: 'heal', targets: [target] };
  }
  const cleanse = get('cleanse');
  const afflicted = allies.filter(unit => hasAilment(unit) || (unit.debuffUntil ?? -1) >= battle.round).sort((a,b) => Number(hasAilment(b)) - Number(hasAilment(a)) || lowerHP(a,b))[0];
  if (cleanse && afflicted) return { skill: cleanse, template: 'cleanse', targets: [afflicted] };
  const pair = get('mend_pair');
  const wounded = allies.filter(unit => unit.hp < unit.maxHp * (strategy === 'aggressive' ? .65 : strategy === 'survival' ? .95 : .85)).sort(lowerHP).slice(0, 2);
  if (pair && wounded.length === 2) return { skill: pair, template: 'mend_pair', targets: wounded };
  if (role === 'tank') {
    const target = allies.filter((unit) => unit.uid !== actor.uid && !allies.some((guard) => guard.uid !== actor.uid && guard.guardTarget === unit.uid && (guard.guardUntil ?? -1) >= battle.round)).sort(lowerHP)[0];
    const skill = get('guard');
    if (skill && target && !actor.guardTarget) return { skill, template: 'guard', targets: [target] };
  }
  const barrier = get('barrier');
  const exposed = allies.filter(unit => !(unit.barrier && (unit.barrierUntil ?? -1) >= battle.round)).sort(lowerHP)[0];
  if (barrier && exposed && (strategy === 'survival' || exposed.hp < exposed.maxHp * .8 || enemies.some(unit => unit.boss))) return { skill: barrier, template: 'barrier', targets: [exposed] };
  const regen = get('regen');
  const recovering = allies.filter(unit => (unit.regenUntil ?? -1) < battle.round && unit.hp < unit.maxHp * (strategy === 'aggressive' ? .65 : .9)).sort(lowerHP)[0];
  if (regen && recovering) return { skill: regen, template: 'regen', targets: [recovering] };
  if (role === 'supporter') {
    const target = allies.filter((unit) => (unit.buffUntil ?? -1) < battle.round).sort((a, b) => b.attack - a.attack || byId(a, b))[0];
    const skill = get('buff');
    if (skill && target) return { skill, template: 'buff', targets: [target] };
  }
  const dispel = get('dispel');
  const empowered = enemies.filter(unit => (unit.buffUntil ?? -1) >= battle.round || (unit.regenUntil ?? -1) >= battle.round).sort((a,b) => b.hp - a.hp || byId(a,b))[0];
  if (dispel && empowered) return { skill: dispel, template: 'dispel', targets: [empowered] };
  const shatter = get('shatter');
  const shielded = enemies.filter(unit => (unit.barrier ?? 0) > 0 && (unit.barrierUntil ?? -1) >= battle.round).sort((a,b) => (b.barrier ?? 0) - (a.barrier ?? 0) || byId(a,b))[0];
  if (shatter && shielded) return { skill: shatter, template: 'shatter', targets: [shielded] };
  const control = skills.find(skill => isAilment(skill.template));
  const susceptible = enemies.filter(unit => !hasAilment(unit) && (unit.statusWardUntil ?? -1) < battle.round).sort((a,b) => b.attack - a.attack || byId(a,b))[0];
  if (control && susceptible) return { skill: control, template: control.template, targets: [susceptible] };
  if (role === 'debuffer') {
    const target = enemies.filter((unit) => (unit.debuffUntil ?? -1) < battle.round).sort((a, b) => b.hp - a.hp || byId(a, b))[0];
    const skill = get('debuff');
    if (skill && target) return { skill, template: 'debuff', targets: [target] };
  }
  const area = get('area');
  if (role === 'area_attacker' && enemies.length >= 2 && area) return { skill: area, template: 'area', targets: enemies };
  const target = chooseTarget(enemies, strategy, content);
  const drain = get('drain');
  if (drain && (actor.hp < actor.maxHp * .7 || !get('attack'))) return { skill: drain, template: 'drain', targets: [target] };
  const dawn = get('dawn');
  if (dawn && (target.boss || (target.debuffUntil ?? -1) >= battle.round || strategy === 'aggressive' || !get('attack'))) return { skill: dawn, template: 'dawn', targets: [target] };
  const pierce = get('pierce');
  if (pierce && (strategy === 'aggressive' || target.boss || effectiveDefense(target, battle.round) >= actor.attack * .45 || !get('attack'))) return { skill: pierce, template: 'pierce', targets: [target] };
  const attack = get('attack');
  if (attack) return { skill: attack, template: 'attack', targets: [chooseTarget(enemies, strategy, content)] };
  if (area) return { skill: area, template: 'area', targets: enemies };
  return { template: 'attack', targets: [chooseTarget(enemies, strategy, content)] };
}
function damage(actor: Unit, target: Unit, numerator: number, denominator: number, battle: Battle, guardable: boolean, content: Content, piercing = false, shattering = false, dawning = false): { unit: Unit; amount: number; absorbed: number; shattered: number } {
  const guard = guardable ? battle.units.find(unit => unit.hp > 0 && unit.side === target.side && unit.uid !== target.uid && unit.guardTarget === target.uid && (unit.guardUntil ?? -1) >= battle.round) : undefined;
  const recipient = guard ?? target;
  const shattered = shattering && (recipient.barrierUntil ?? -1) >= battle.round ? recipient.barrier ?? 0 : 0;
  if (shattering) { delete recipient.barrier; delete recipient.barrierUntil; }
  const passive = leaderEffect(battle, content);
  const resonance = actor.side === 'party' && passive === 'resonance' && !guardable ? 115 : 100;
  const powerNumerator = effectiveAttack(actor, battle.round) * numerator * resonance * (dawning && (recipient.debuffUntil ?? -1) >= battle.round ? 125 : 100);
  const powerDenominator = denominator * 100 * 100;
  let amount = Math.max(1, Math.floor((powerNumerator * 200 - effectiveDefense(recipient, battle.round) * powerDenominator * (piercing ? 35 : 100)) / (powerDenominator * 200)));
  if (actor.side === 'party' && recipient.side !== actor.side && passive === 'finisher' && recipient.hp <= recipient.maxHp * .35) amount = Math.max(1, Math.floor(amount * 120 / 100));
  if (guard) amount = Math.max(1, Math.floor(amount * (370 - (guard.guardStrength ?? 10)) / 400));
  if (recipient.side === 'party' && passive === 'bulwark') amount = Math.max(1, Math.floor(amount * 90 / 100));
  const absorbed = Math.min(amount, (recipient.barrierUntil ?? -1) >= battle.round ? recipient.barrier ?? 0 : 0);
  if (absorbed) recipient.barrier = (recipient.barrier ?? 0) - absorbed;
  const actual = Math.min(recipient.hp, amount - absorbed); recipient.hp -= actual;
  if (actual > 0 && recipient.ailments?.sleep) { delete recipient.ailments.sleep; recipient.statusWardUntil = battle.round + 1; }
  if (recipient.hp <= 0) { delete recipient.ailments; delete recipient.statusWardUntil; }
  return { unit: recipient, amount: actual, absorbed, shattered };
}
const eventKind: Record<SkillTemplate, BattleEvent['kind']> = {
  confusion: 'debuff', sleep: 'debuff', paralysis: 'debuff', charm: 'debuff',
  attack: 'attack', area: 'area', heal: 'heal', guard: 'guard', buff: 'buff', debuff: 'debuff',
  mend_pair: 'heal', shatter: 'attack', dispel: 'debuff', dawn: 'attack',
  pierce: 'attack', drain: 'attack', regen: 'heal', barrier: 'guard', cleanse: 'buff',
};

/** Boss devices act after ordinary actions. A deployment always gives a full round's warning. */
function resolveBossBits(battle: Battle, content: Content): void {
  const pattern = dungeon(content, battle.dungeonId).bossBits;
  if (!pattern) return;
  for (const boss of battle.units.filter(unit => unit.side === 'enemy' && unit.boss)) {
    if (boss.hp <= 0) { delete boss.bits; continue; }
    if (!alive(battle.units, 'party').length) break;
    if (battle.round % pattern.every === 0) {
      boss.bits = { count: pattern.count, deployedRound: battle.round, expiresRound: battle.round + pattern.duration };
      emit(battle, { kind: 'buff', bitAction: 'deploy', actorId: boss.uid, targetIds: [boss.uid], text: `うさぎビット${pattern.count}機を展開 — 次のターンから${pattern.duration}ターン自動射撃`, unitsAfter: clone(battle.units) });
      continue;
    }
    if (!boss.bits || boss.bits.deployedRound >= battle.round) continue;
    if (boss.bits.expiresRound < battle.round) { delete boss.bits; continue; }
    for (let index = 0; index < boss.bits.count; index++) {
      const targets = alive(battle.units, 'party').sort(byId);
      if (!targets.length) break;
      const roll = rng(battle.seed); battle.seed = roll.seed;
      const target = targets[Math.floor(roll.value * targets.length)]!;
      const before = clone(battle.units);
      const hit = damage(boss, target, pattern.power, 100, battle, true, content);
      clearInvalidGuards(battle);
      emit(battle, { kind: 'attack', bitAction: 'fire', bitIndex: index, actorId: boss.uid, targetIds: [hit.unit.uid], amount: hit.amount, text: `うさぎビット${index + 1}号 — 自動射撃${hit.absorbed ? `（障壁が${hit.absorbed}軽減）` : ''}`, unitsAfter: clone(battle.units) });
      emitCures(battle, before, content, boss.uid);
    }
    if (boss.bits.expiresRound === battle.round) {
      delete boss.bits;
      emit(battle, { kind: 'buff', bitAction: 'expire', actorId: boss.uid, targetIds: [boss.uid], text: 'うさぎビット帰還 — 次の展開に備えている', unitsAfter: clone(battle.units) });
    }
  }
}
export function resolveRound(input: Battle, content: Content): RoundResult {
  if (input.phase !== 'ready') throw new Error('今はラウンドを進められません');
  if (input.contentVersion !== content.contentVersion || input.rulesVersion !== content.rulesVersion) throw new Error('探索とコンテンツの版が一致しません');
  const battle = clone(input);
  battle.initialUnits = clone(battle.units); battle.events = []; battle.cursor = 0; battle.phase = 'playing'; battle.nextPhase = 'ready';
  let goldEarned = 0; const discoveredIds: string[] = [];
  for (const unit of battle.units) {
    if ((unit.statusWardUntil ?? -1) < battle.round) delete unit.statusWardUntil;
    if ((unit.guardUntil ?? -1) < battle.round) { delete unit.guardTarget; delete unit.guardUntil; delete unit.guardStrength; }
    if ((unit.buffUntil ?? -1) < battle.round) { delete unit.buffUntil; delete unit.buffStrength; }
    if ((unit.debuffUntil ?? -1) < battle.round) { delete unit.debuffUntil; delete unit.debuffStrength; }
    if ((unit.barrierUntil ?? -1) < battle.round) { delete unit.barrierUntil; delete unit.barrier; }
    if ((unit.regenUntil ?? -1) < battle.round) { delete unit.regenUntil; delete unit.regenStrength; }
  }
  const order = [...battle.units].filter((unit) => unit.hp > 0).sort((a, b) => b.speed - a.speed || a.tie - b.tie || byId(a, b));
  for (const actor of order) {
    if (actor.hp <= 0) continue;
    if (!alive(battle.units, 'party').length || !alive(battle.units, 'enemy').length) break;
    const before = clone(battle.units);
    const controlled = controlledAction(actor, battle, content);
    if (controlled.skip) {
      const recovered = ageAilments(actor, battle.round);
      emit(battle, { kind: 'debuff', actorId: actor.uid, targetIds: [actor.uid], statusAction: 'skip', ailment: controlled.ailment, text: `${character(content, actor.characterId).name} — ${ailmentNames[controlled.ailment!]}で行動できない`, unitsAfter: clone(battle.units) });
      for (const id of recovered) emitRecovery(battle, actor, id, content);
      continue;
    }
    const action = controlled.action ?? chooseAction(actor, battle, content);
    const name = character(content, actor.characterId).name;
    const actionName = action.forcedBy ? `${ailmentNames[action.forcedBy]}による通常攻撃` : action.skill?.name ?? '通常攻撃';
    let statusAction: BattleEvent['statusAction'] = action.forcedBy && action.targets[0]?.side === actor.side ? 'friendly_fire' : undefined;
    const targetIds: string[] = []; let amount = 0; let absorbed = 0; let drained = 0; let shattered = 0;
    if (isAilment(action.template)) {
      const target = action.targets[0]!; const roll = rng(battle.seed); battle.seed = roll.seed;
      const success = (target.statusWardUntil ?? -1) < battle.round && !hasAilment(target) && roll.value * 100 < ailmentChance(target);
      statusAction = success ? 'inflict' : 'resist'; targetIds.push(target.uid);
      if (success) {
        target.ailments ??= {}; target.ailments[action.template] = { turns: target.boss ? 1 : 2, sourceId: actor.uid };
        delete target.guardTarget; delete target.guardUntil; delete target.guardStrength;
      }
    } else if (action.template === 'heal') {
      const target = action.targets[0]!;
      amount = Math.min(target.maxHp - target.hp, Math.max(1, Math.floor(effectiveAttack(actor, battle.round) * (action.skill!.strength + 30) / 20)));
      target.hp += amount; targetIds.push(target.uid);
    } else if (action.template === 'mend_pair') {
      for (const target of action.targets) {
        const healed = Math.min(target.maxHp - target.hp, Math.max(1, Math.floor(effectiveAttack(actor, battle.round) * (action.skill!.strength + 30) / 40)));
        target.hp += healed; amount += healed; targetIds.push(target.uid);
      }
    } else if (action.template === 'dispel') {
      const target = action.targets[0]!;
      delete target.buffUntil; delete target.buffStrength; delete target.regenUntil; delete target.regenStrength;
      targetIds.push(target.uid);
    } else if (action.template === 'regen') {
      const target = action.targets[0]!; target.regenUntil = battle.round + 2; target.regenStrength = action.skill!.strength; targetIds.push(target.uid);
    } else if (action.template === 'barrier') {
      const target = action.targets[0]!; target.barrier = Math.max(target.barrier ?? 0, Math.floor((target.maxHp * 12 + effectiveAttack(actor, battle.round) * 60) / 100)); target.barrierUntil = battle.round + 1; targetIds.push(target.uid);
    } else if (action.template === 'cleanse') {
      const target = action.targets[0]!; delete target.debuffUntil; delete target.debuffStrength; cureAilments(target, battle.round);
      amount = Math.min(target.maxHp - target.hp, Math.floor(effectiveAttack(actor, battle.round) * 60 / 100)); target.hp += amount; targetIds.push(target.uid);
    } else if (action.template === 'guard') {
      actor.guardTarget = action.targets[0]!.uid; actor.guardUntil = battle.round + 1; actor.guardStrength = action.skill!.strength; targetIds.push(actor.guardTarget);
    } else if (action.template === 'buff') {
      const target = action.targets[0]!; target.buffUntil = battle.round + 1; target.buffStrength = action.skill!.strength; targetIds.push(target.uid);
    } else if (action.template === 'debuff') {
      const target = action.targets[0]!; target.debuffUntil = battle.round + 1; target.debuffStrength = action.skill!.strength; targetIds.push(target.uid);
    } else {
      const numerator = action.template === 'shatter' ? action.skill!.strength + 30 : (action.template === 'pierce' || action.template === 'dawn') ? action.skill!.strength + 30 : action.template === 'drain' ? 9 * (action.skill!.strength + 30) : action.template === 'area' ? 13 * (action.skill!.strength + 30) : action.skill ? 3 * (action.skill.strength + 30) : 1;
      const denominator = action.template === 'shatter' ? 50 : (action.template === 'pierce' || action.template === 'dawn') ? 40 : action.template === 'drain' ? 400 : action.template === 'area' ? 800 : action.skill ? 80 : 1;
      for (const target of action.targets) {
        const hit = damage(actor, target, numerator, denominator, battle, action.template !== 'area', content, action.template === 'pierce' || action.template === 'dawn', action.template === 'shatter', action.template === 'dawn'); amount += hit.amount; absorbed += hit.absorbed; shattered += hit.shattered; targetIds.push(hit.unit.uid);
      }
    }
    if (action.template === 'drain' && amount > 0) {
      drained = Math.min(actor.maxHp - actor.hp, Math.floor(amount * 35 / 100)); actor.hp += drained;
    }
    if (action.skill) actor.cooldowns[action.skill.id] = battle.round + skillCooldown(action.template);
    clearInvalidGuards(battle);
    const recovered = ageAilments(actor, battle.round);
    emit(battle, { kind: eventKind[action.template], statusAction, ailment: isAilment(action.template) ? action.template : action.forcedBy, text: `${name} — ${actionName}${statusAction === 'resist' ? '（状態異常を防いだ）' : isAilment(action.template) ? `（${ailmentNames[action.template]}を付与）` : ''}${shattered ? `（障壁${shattered}を破壊）` : ''}${absorbed ? `（障壁が${absorbed}軽減）` : ''}${drained ? `（HP${drained}吸収）` : ''}`, actorId: actor.uid, targetIds: [...new Set(targetIds)], skillId: action.skill?.id, amount, unitsAfter: clone(battle.units) });
    for (const id of recovered) emitRecovery(battle, actor, id, content);
    emitCures(battle, before, content, actor.uid);
    if (action.targets.some(target => target.side !== actor.side) && actor.side === 'party' && ['attack', 'area', 'pierce', 'drain', 'shatter', 'dawn'].includes(action.template) && amount > 0 && leaderEffect(battle, content) === 'lifesteal') {
      const healed = Math.min(actor.maxHp - actor.hp, Math.floor(amount * 8 / 100));
      if (healed > 0) { actor.hp += healed; emit(battle, { kind: 'heal', text: `${name} — 黄泉の契り`, actorId: actor.uid, targetIds: [actor.uid], amount: healed, unitsAfter: clone(battle.units) }); }
    }
    const killed = battle.units.filter((unit) => unit.hp <= 0 && before.some((old) => old.uid === unit.uid && old.hp > 0));
    for (const boss of battle.units.filter((unit) => unit.boss && unit.hp > 0 && unit.hp <= unit.maxHp / 2 && before.some((old) => old.uid === unit.uid && old.hp > old.maxHp / 2))) {
      const flag = `${boss.uid}:half`;
      if (!battle.talkFlags.includes(flag)) { battle.talkFlags.push(flag); emit(battle, { kind: 'dialogue', actorId: boss.uid, text: bossLine(content, boss.characterId, 'threshold') }); }
    }
    for (const unit of killed) {
      const def = character(content, unit.characterId);
      if (unit.boss && !battle.talkFlags.includes(`${unit.uid}:dead`)) { battle.talkFlags.push(`${unit.uid}:dead`); emit(battle, { kind: 'dialogue', actorId: unit.uid, text: bossLine(content, unit.characterId, 'defeat') }); }
      if (unit.side !== 'enemy' || dungeon(content, battle.dungeonId).kind === 'trial') continue;
      const stage = dungeon(content, battle.dungeonId);
      const event = content.events?.find(item => item.id === stage.eventId);
      const special = unit.boss && event && stage.eventReward && battle.wave === stage.waves.length - 1;
      const random = rng(battle.seed); battle.seed = random.seed;
      const rarity = random.value < 0.75 ? 'common' : random.value < 0.97 ? 'rare' : 'epic';
      const materialId = `${def.speciesId}:${rarity}`;
      if (!special) battle.pendingMaterials[materialId] = (battle.pendingMaterials[materialId] ?? 0) + 1;
      const gold = Math.ceil(def.strength / 2) + (def.encounterLoot?.gold ?? 0); goldEarned += gold; battle.goldEarned += gold;
      if (!discoveredIds.includes(def.id)) discoveredIds.push(def.id);
      if (!special) emit(battle, { kind: 'drop', actorId: unit.uid, text: `${def.name}の素材を仮取得`, materialId, rarity });
      for (const reward of def.encounterLoot?.guaranteed ?? []) {
        battle.pendingMaterials[reward.materialId] = (battle.pendingMaterials[reward.materialId] ?? 0) + reward.count;
        const label = content.materials?.find(item => item.id === reward.materialId)?.name ?? reward.materialId;
        emit(battle, { kind: 'drop', actorId: unit.uid, text: `${label} ×${reward.count}を仮取得`, materialId: reward.materialId, amount: reward.count, rarity: reward.materialId.split(':')[1] as 'common' | 'rare' | 'epic' });
      }
      if (unit.boss && stage.bossLoot) {
        const rewards = [...stage.bossLoot.guaranteed];
        if (stage.bossLoot.bonus) {
          const roll = rng(battle.seed); battle.seed = roll.seed;
          if (roll.value * 100 < stage.bossLoot.bonus.chance) rewards.push(stage.bossLoot.bonus.reward);
        }
        for (const reward of rewards) {
          battle.pendingMaterials[reward.materialId] = (battle.pendingMaterials[reward.materialId] ?? 0) + reward.count;
          const label = content.materials?.find(item => item.id === reward.materialId)?.name ?? reward.materialId;
          emit(battle, { kind: 'drop', actorId: unit.uid, text: `${label} ×${reward.count}を仮取得`, materialId: reward.materialId, amount: reward.count, rarity: reward.materialId.split(':')[1] as 'rare' });
        }
      }
      if (special && event && stage.eventReward) {
        const reward = stage.eventReward;
        battle.pendingMaterials[reward.materialId] = (battle.pendingMaterials[reward.materialId] ?? 0) + reward.count;
        const label = reward.materialId === event.core.id ? event.core.name : event.fragment.name;
        emit(battle, { kind: 'drop', actorId: unit.uid, text: `${label} ×${reward.count}を仮取得`, materialId: reward.materialId, amount: reward.count, rarity: reward.materialId === event.core.id ? 'epic' : 'rare' });
      }
    }
  }
  resolveBossBits(battle, content);
  for (const unit of battle.units.filter(unit => unit.hp > 0 && unit.hp < unit.maxHp && (unit.regenUntil ?? -1) >= battle.round)) {
    const amount = Math.min(unit.maxHp - unit.hp, Math.max(1, Math.floor(unit.maxHp * (40 + (unit.regenStrength ?? 10)) / 1000)));
    unit.hp += amount;
    emit(battle, { kind: 'heal', text: `${character(content, unit.characterId).name} — 月の雫の再生`, actorId: unit.uid, targetIds: [unit.uid], amount, unitsAfter: clone(battle.units) });
  }
  if (leaderEffect(battle, content) === 'regeneration') {
    const targets: string[] = []; let amount = 0;
    for (const unit of alive(battle.units, 'party')) {
      const healed = Math.min(unit.maxHp - unit.hp, Math.max(1, Math.floor(unit.maxHp * .03)));
      if (healed) { unit.hp += healed; amount += healed; targets.push(unit.uid); }
    }
    if (targets.length) emit(battle, { kind: 'heal', text: 'リーダースキル — 月の慈愛', actorId: `party:${battle.leaderId}`, targetIds: targets, amount, unitsAfter: clone(battle.units) });
  }
  if (!alive(battle.units, 'party').length) {
    battle.nextPhase = 'failed'; battle.failureReason = 'パーティが全滅しました';
    emit(battle, { kind: 'defeat', text: dungeon(content, battle.dungeonId).kind === 'trial' ? '挑戦終了 — パーティが全滅しました' : '探索失敗 — 今回の素材はすべて失われます' });
  } else if (!alive(battle.units, 'enemy').length) {
    battle.nextPhase = battle.wave + 1 >= dungeon(content, battle.dungeonId).waves.length ? 'reward' : 'wave';
  } else if (battle.round >= 100) {
    battle.nextPhase = 'failed'; battle.failureReason = 'ラウンド上限に達しました';
    emit(battle, { kind: 'defeat', text: dungeon(content, battle.dungeonId).kind === 'trial' ? '挑戦終了 — ラウンド上限です' : '探索失敗 — ラウンド上限です' });
  }
  battle.round += 1;
  return { battle, goldEarned, discoveredIds };
}
export function advanceReplay(input: Battle, content: Content): Battle {
  if (input.phase !== 'playing') throw new Error('再生中ではありません');
  const battle = clone(input);
  if (battle.cursor < battle.events.length) battle.cursor += 1;
  if (battle.cursor < battle.events.length) return battle;
  switch (battle.nextPhase) {
    case 'wave': battle.wave += 1; return openWave(battle, content, false);
    case 'reward': battle.phase = 'reward'; break;
    case 'failed': battle.phase = 'failed'; battle.pendingMaterials = {}; break;
    case 'ready': battle.phase = 'ready'; battle.potionUsed = false; break;
  }
  return battle;
}
export function usePotion(input: Battle, unitId: string): Battle {
  if (input.phase !== 'ready' || input.potionUsed || input.potionsRemaining <= 0) throw new Error('今は回復薬を使えません');
  const battle = clone(input);
  const unit = battle.units.find((item) => item.uid === unitId && item.side === 'party');
  if (!unit || unit.hp <= 0 || unit.hp >= unit.maxHp) throw new Error('回復できる味方を選んでください');
  unit.hp = Math.min(unit.maxHp, unit.hp + Math.floor(unit.maxHp * 3 / 10));
  battle.potionsRemaining -= 1; battle.potionUsed = true; battle.initialUnits = clone(battle.units);
  return battle;
}
