import { skillCooldown } from './skill-info';
import type { Battle, BattleEvent, CharacterDef, Content, DungeonDef, LeaderStat, MaterialCost, RoundResult, SkillDef, SkillTemplate, Stats, Strategy, Unit } from './types';

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
export function characterStats(def: CharacterDef, leader?: CharacterDef, boss = false): Stats {
  const stats = baseStats(def);
  if (boss) { stats.hp *= 3; stats.attack = Math.round(stats.attack * 12 / 10); }
  if (leader) {
    const bonus = leaderBonus(leader);
    const rate = bonus.stat === 'hp' ? 8 : bonus.stat === 'attack' ? 3 : 10;
    stats[bonus.stat] = Math.round(stats[bonus.stat] * (1000 + rate * leader.strength) / 1000);
  }
  return stats;
}
export function dungeonDifficulty(def: DungeonDef, content: Content): number {
  const waves = def.waves.map((wave) => wave.reduce((sum, enemy) => sum + character(content, enemy.characterId).strength / 10 * (enemy.boss ? Math.sqrt(3 * 1.2) : 1), 0));
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
  const stats = characterStats(def, leader, boss);
  const random = rng(battle.seed); battle.seed = random.seed;
  return { uid: side === 'party' ? `party:${characterId}` : `enemy:w${battle.wave}:${index}:${characterId}`, characterId, side, boss, hp: stats.hp, maxHp: stats.hp, attack: stats.attack, defense: stats.defense, speed: stats.speed, tie: random.seed, cooldowns: {} };
}
function clearEffects(unit: Unit): void {
  delete unit.guardTarget; delete unit.guardUntil; delete unit.guardStrength;
  delete unit.buffUntil; delete unit.buffStrength; delete unit.debuffUntil; delete unit.debuffStrength;
  delete unit.barrier; delete unit.barrierUntil; delete unit.regenUntil; delete unit.regenStrength;
}
function openWave(battle: Battle, content: Content, first: boolean): Battle {
  const def = dungeon(content, battle.dungeonId);
  const wave = def.waves[battle.wave];
  if (!wave?.length || wave.length > 4) throw new Error('Waveの敵編成が不正です');
  const party = first ? battle.partyIds.map((id, i) => makeUnit(battle, content, id, 'party', i)) : battle.units.filter((unit) => unit.side === 'party');
  party.forEach((unit) => { clearEffects(unit); unit.cooldowns = {}; });
  battle.units = [...party, ...wave.map((enemy, i) => makeUnit(battle, content, enemy.characterId, 'enemy', i, !!enemy.boss))];
  battle.round = 1; battle.potionUsed = false;
  battle.initialUnits = clone(battle.units); battle.events = []; battle.cursor = 0;
  battle.phase = 'playing'; battle.nextPhase = 'ready';
  emit(battle, { kind: 'wave', text: `Wave ${battle.wave + 1} / ${def.waves.length}`, unitsAfter: clone(battle.units) });
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
  if (partyIds.length < 1 || partyIds.length > 4 || new Set(partyIds).size !== partyIds.length || !partyIds.includes(leaderId)) throw new Error('編成とリーダーを確認してください');
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
  return [...enemies].sort((a, b) => {
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
interface Action { skill?: SkillDef; template: SkillTemplate; targets: Unit[] }
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
  const afflicted = allies.filter(unit => (unit.debuffUntil ?? -1) >= battle.round).sort(lowerHP)[0];
  if (cleanse && afflicted) return { skill: cleanse, template: 'cleanse', targets: [afflicted] };
  const barrier = get('barrier');
  const exposed = allies.filter(unit => !(unit.barrier && (unit.barrierUntil ?? -1) >= battle.round)).sort(lowerHP)[0];
  if (barrier && exposed && (strategy === 'survival' || exposed.hp < exposed.maxHp * .8 || enemies.some(unit => unit.boss))) return { skill: barrier, template: 'barrier', targets: [exposed] };
  const regen = get('regen');
  const recovering = allies.filter(unit => (unit.regenUntil ?? -1) < battle.round && unit.hp < unit.maxHp * (strategy === 'aggressive' ? .65 : .9)).sort(lowerHP)[0];
  if (regen && recovering) return { skill: regen, template: 'regen', targets: [recovering] };
  if (role === 'tank') {
    const target = allies.filter((unit) => unit.uid !== actor.uid && !allies.some((guard) => guard.uid !== actor.uid && guard.guardTarget === unit.uid && (guard.guardUntil ?? -1) >= battle.round)).sort(lowerHP)[0];
    const skill = get('guard');
    if (skill && target && !actor.guardTarget) return { skill, template: 'guard', targets: [target] };
  }
  if (role === 'supporter') {
    const target = allies.filter((unit) => (unit.buffUntil ?? -1) < battle.round).sort((a, b) => b.attack - a.attack || byId(a, b))[0];
    const skill = get('buff');
    if (skill && target) return { skill, template: 'buff', targets: [target] };
  }
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
  const pierce = get('pierce');
  if (pierce && (strategy === 'aggressive' || target.boss || effectiveDefense(target, battle.round) >= actor.attack * .45 || !get('attack'))) return { skill: pierce, template: 'pierce', targets: [target] };
  const attack = get('attack');
  if (attack) return { skill: attack, template: 'attack', targets: [chooseTarget(enemies, strategy, content)] };
  if (area) return { skill: area, template: 'area', targets: enemies };
  return { template: 'attack', targets: [chooseTarget(enemies, strategy, content)] };
}
function damage(actor: Unit, target: Unit, numerator: number, denominator: number, battle: Battle, guardable: boolean, content: Content, piercing = false): { unit: Unit; amount: number; absorbed: number } {
  const guard = guardable ? battle.units.find(unit => unit.hp > 0 && unit.side === target.side && unit.uid !== target.uid && unit.guardTarget === target.uid && (unit.guardUntil ?? -1) >= battle.round) : undefined;
  const recipient = guard ?? target;
  const passive = leaderEffect(battle, content);
  const resonance = actor.side === 'party' && passive === 'resonance' && !guardable ? 115 : 100;
  const powerNumerator = effectiveAttack(actor, battle.round) * numerator * resonance;
  const powerDenominator = denominator * 100;
  let amount = Math.max(1, Math.floor((powerNumerator * 200 - effectiveDefense(recipient, battle.round) * powerDenominator * (piercing ? 35 : 100)) / (powerDenominator * 200)));
  if (actor.side === 'party' && passive === 'finisher' && recipient.hp <= recipient.maxHp * .35) amount = Math.max(1, Math.floor(amount * 120 / 100));
  if (guard) amount = Math.max(1, Math.floor(amount * (370 - (guard.guardStrength ?? 10)) / 400));
  if (recipient.side === 'party' && passive === 'bulwark') amount = Math.max(1, Math.floor(amount * 90 / 100));
  const absorbed = Math.min(amount, (recipient.barrierUntil ?? -1) >= battle.round ? recipient.barrier ?? 0 : 0);
  if (absorbed) recipient.barrier = (recipient.barrier ?? 0) - absorbed;
  const actual = Math.min(recipient.hp, amount - absorbed); recipient.hp -= actual;
  return { unit: recipient, amount: actual, absorbed };
}
const eventKind: Record<SkillTemplate, BattleEvent['kind']> = {
  attack: 'attack', area: 'area', heal: 'heal', guard: 'guard', buff: 'buff', debuff: 'debuff',
  pierce: 'attack', drain: 'attack', regen: 'heal', barrier: 'guard', cleanse: 'buff',
};
export function resolveRound(input: Battle, content: Content): RoundResult {
  if (input.phase !== 'ready') throw new Error('今はラウンドを進められません');
  if (input.contentVersion !== content.contentVersion || input.rulesVersion !== content.rulesVersion) throw new Error('探索とコンテンツの版が一致しません');
  const battle = clone(input);
  battle.initialUnits = clone(battle.units); battle.events = []; battle.cursor = 0; battle.phase = 'playing'; battle.nextPhase = 'ready';
  let goldEarned = 0; const discoveredIds: string[] = [];
  for (const unit of battle.units) {
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
    const action = chooseAction(actor, battle, content);
    const name = character(content, actor.characterId).name;
    const actionName = action.skill?.name ?? '通常攻撃';
    const targetIds: string[] = []; let amount = 0; let absorbed = 0; let drained = 0;
    if (action.template === 'heal') {
      const target = action.targets[0]!;
      amount = Math.min(target.maxHp - target.hp, Math.max(1, Math.floor(effectiveAttack(actor, battle.round) * (action.skill!.strength + 30) / 20)));
      target.hp += amount; targetIds.push(target.uid);
    } else if (action.template === 'regen') {
      const target = action.targets[0]!; target.regenUntil = battle.round + 2; target.regenStrength = action.skill!.strength; targetIds.push(target.uid);
    } else if (action.template === 'barrier') {
      const target = action.targets[0]!; target.barrier = Math.max(target.barrier ?? 0, Math.floor((target.maxHp * 12 + effectiveAttack(actor, battle.round) * 60) / 100)); target.barrierUntil = battle.round + 1; targetIds.push(target.uid);
    } else if (action.template === 'cleanse') {
      const target = action.targets[0]!; delete target.debuffUntil; delete target.debuffStrength;
      amount = Math.min(target.maxHp - target.hp, Math.floor(effectiveAttack(actor, battle.round) * 60 / 100)); target.hp += amount; targetIds.push(target.uid);
    } else if (action.template === 'guard') {
      actor.guardTarget = action.targets[0]!.uid; actor.guardUntil = battle.round + 1; actor.guardStrength = action.skill!.strength; targetIds.push(actor.guardTarget);
    } else if (action.template === 'buff') {
      const target = action.targets[0]!; target.buffUntil = battle.round + 1; target.buffStrength = action.skill!.strength; targetIds.push(target.uid);
    } else if (action.template === 'debuff') {
      const target = action.targets[0]!; target.debuffUntil = battle.round + 1; target.debuffStrength = action.skill!.strength; targetIds.push(target.uid);
    } else {
      const numerator = action.template === 'pierce' ? action.skill!.strength + 30 : action.template === 'drain' ? 9 * (action.skill!.strength + 30) : action.template === 'area' ? 13 * (action.skill!.strength + 30) : action.skill ? 3 * (action.skill.strength + 30) : 1;
      const denominator = action.template === 'pierce' ? 40 : action.template === 'drain' ? 400 : action.template === 'area' ? 800 : action.skill ? 80 : 1;
      for (const target of action.targets) {
        const hit = damage(actor, target, numerator, denominator, battle, action.template !== 'area', content, action.template === 'pierce'); amount += hit.amount; absorbed += hit.absorbed; targetIds.push(hit.unit.uid);
      }
    }
    if (action.template === 'drain' && amount > 0) {
      drained = Math.min(actor.maxHp - actor.hp, Math.floor(amount * 35 / 100)); actor.hp += drained;
    }
    if (action.skill) actor.cooldowns[action.skill.id] = battle.round + skillCooldown(action.template);
    clearInvalidGuards(battle);
    emit(battle, { kind: eventKind[action.template], text: `${name} — ${actionName}${absorbed ? `（障壁が${absorbed}軽減）` : ''}${drained ? `（HP${drained}吸収）` : ''}`, actorId: actor.uid, targetIds: [...new Set(targetIds)], skillId: action.skill?.id, amount, unitsAfter: clone(battle.units) });
    if (actor.side === 'party' && ['attack', 'area', 'pierce', 'drain'].includes(action.template) && amount > 0 && leaderEffect(battle, content) === 'lifesteal') {
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
      if (unit.side !== 'enemy') continue;
      const random = rng(battle.seed); battle.seed = random.seed;
      const rarity = random.value < 0.75 ? 'common' : random.value < 0.97 ? 'rare' : 'epic';
      const materialId = `${def.speciesId}:${rarity}`;
      battle.pendingMaterials[materialId] = (battle.pendingMaterials[materialId] ?? 0) + 1;
      const gold = Math.ceil(def.strength / 2); goldEarned += gold; battle.goldEarned += gold;
      if (!discoveredIds.includes(def.id)) discoveredIds.push(def.id);
      emit(battle, { kind: 'drop', actorId: unit.uid, text: `${def.name}の素材を仮取得`, materialId, rarity });
    }
  }
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
    emit(battle, { kind: 'defeat', text: '探索失敗 — 今回の素材はすべて失われます' });
  } else if (!alive(battle.units, 'enemy').length) {
    battle.nextPhase = battle.wave + 1 >= dungeon(content, battle.dungeonId).waves.length ? 'reward' : 'wave';
  } else if (battle.round >= 100) {
    battle.nextPhase = 'failed'; battle.failureReason = 'ラウンド上限に達しました';
    emit(battle, { kind: 'defeat', text: '探索失敗 — ラウンド上限です' });
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
