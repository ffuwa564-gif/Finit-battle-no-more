import { gainUltimate } from './ultimates';
import type { Battle, SkillDef, SkillTemplate, Unit } from './types';

/** Ordinary character skills only. The engine must not route gems, ultimates or forced actions here. */
export const SCOUT_SKILLS = {
  mark: 'scout-ione-mark', lantern: 'scout-neri-lantern', overflow: 'scout-fio-overflow', shear: 'scout-ruka-shear',
} as const;
export const SCOUT_SKILL_CONTRACTS: Record<string, { characterId: string; template: SkillTemplate; strength: number }> = {
  [SCOUT_SKILLS.mark]: { characterId: 'ione', template: 'debuff', strength: 16 },
  [SCOUT_SKILLS.lantern]: { characterId: 'neri', template: 'barrier', strength: 13 },
  [SCOUT_SKILLS.overflow]: { characterId: 'fio', template: 'heal', strength: 17 },
  [SCOUT_SKILLS.shear]: { characterId: 'ruka', template: 'attack', strength: 19 },
};
export function scoutSkillContract(skill: SkillDef) {
  const contract = SCOUT_SKILL_CONTRACTS[skill.id];
  return contract && contract.template === skill.template && contract.strength === skill.strength ? contract : undefined;
}
const names: Record<string, string> = { ione: 'イオネ', neri: 'ネリ', fio: 'フィオ', ruka: 'ルカ' };
const living = (battle: Battle, side: Unit['side']) => battle.units.filter(u => u.side === side && u.hp > 0);
const lowestHP = (a: Unit, b: Unit) => a.hp / a.maxHp - b.hp / b.maxHp || a.uid.localeCompare(b.uid);
const activeLeader = (battle: Battle, id: string) => battle.leaderId === id && battle.units.some(u => u.side === 'party' && u.characterId === id && u.hp > 0);
function shield(target: Unit, value: number, round: number): number {
  const old = (target.barrierUntil ?? -1) >= round ? target.barrier ?? 0 : 0;
  const next = Math.max(0, Math.floor(value));
  if (next <= old) return 0;
  target.barrier = next;
  target.barrierUntil = round + 1;
  return next - old;
}
export interface ScoutActionResult { handled: true; amount: number; targetIds: string[]; messages?: string[] }

/** Custom actions retain native skill cooldown handling and ordinary-action charge. */
export function scoutSkillAction(battle: Battle, actor: Unit, skillId: string, potency: number, targetIds?: readonly string[]): ScoutActionResult | undefined {
  if (actor.side !== 'party' || actor.hp <= 0 || !Number.isFinite(potency) || potency <= 0) return;
  if (actor.characterId === 'ione' && skillId === SCOUT_SKILLS.mark) {
    const target = living(battle, 'enemy').find(u => u.uid === targetIds?.[0]) ?? living(battle, 'enemy').find(u => u.uid === battle.focusTargetId) ?? living(battle, 'enemy')[0];
    if (!target) return { handled: true, amount: 0, targetIds: [] };
    // One source can keep only one mark: switching targets never stacks charges.
    for (const unit of battle.units) if (unit.scoutMark?.sourceId === actor.uid) delete unit.scoutMark;
    target.scoutMark = { sourceId: actor.uid, until: battle.round + 1 };
    return { handled: true, amount: 0, targetIds: [target.uid], messages: ['イオネ — 宛先の余白を綴じた'] };
  }
  if (actor.characterId === 'neri' && skillId === SCOUT_SKILLS.lantern) {
    const pilot = living(battle, 'party').find(u => u.characterId === battle.partyIds[0]);
    if (!pilot) return { handled: true, amount: 0, targetIds: [] };
    pilot.scoutLanternUntil = battle.round + 1;
    return { handled: true, amount: 0, targetIds: [pilot.uid], messages: ['ネリ — 先頭の仲間へ交代の灯を託した'] };
  }
  if (actor.characterId === 'fio' && skillId === SCOUT_SKILLS.overflow) {
    const target = living(battle, 'party').sort(lowestHP)[0];
    if (!target) return { handled: true, amount: 0, targetIds: [] };
    // Half a native ordinary heal; only this action's true excess can become a barrier.
    const referenceAttack = Math.round(actor.attack * ((actor.buffUntil ?? -1) >= battle.round ? 230 + (actor.buffStrength ?? 10) : 200) / 200);
    const raw = Math.max(1, Math.floor(referenceAttack * (17 + 30) / 40 * potency));
    const healed = Math.min(target.maxHp - target.hp, raw);
    target.hp += healed;
    const extra = Math.min(Math.floor(target.maxHp * .15), Math.floor((raw - healed) * .3));
    const gained = shield(target, extra, battle.round);
    const messages: string[] = [];
    if (gained > 0) {
      messages.push(`フィオ — 余り布が障壁${gained}になった`);
      if (activeLeader(battle, 'fio') && !battle.scoutState?.fioLeaderTriggered) {
        battle.scoutState ??= {}; battle.scoutState.fioLeaderTriggered = true;
        gainUltimate(actor, 10);
        messages.push('フィオ — 余り布の支度');
      }
    }
    return { handled: true, amount: healed, targetIds: [target.uid], messages };
  }
  return;
}

/** Consume only for an actual enemy telegraphed strike, after guard redirection. */
export function consumeScoutLantern(recipient: Unit, round: number, isBossStrike: boolean): number {
  if (!isBossStrike || recipient.side !== 'party' || recipient.hp <= 0 || (recipient.scoutLanternUntil ?? -1) < round) return 1;
  delete recipient.scoutLanternUntil;
  return .75;
}

/** Called once per ordinary attack action, never for a gem, forced hit, ultimate, bit or echo. */
export function scoutDamageMultiplier(battle: Battle, actor: Unit, skillId?: string): number {
  if (actor.side !== 'party' || actor.hp <= 0 || actor.characterId !== 'ruka' || skillId !== SCOUT_SKILLS.shear) return 1;
  const threaded = (actor.scoutThreadUntil ?? -1) >= battle.round;
  delete actor.scoutThreadUntil;
  return 1.3 * (threaded ? 1.3 : 1);
}

/** Natural expiry is detected before native expiry clears the remaining barrier amount. */
export function expireScoutEffects(battle: Battle): string[] {
  const ruka = living(battle, 'party').find(u => u.characterId === 'ruka');
  let hadUnusedBarrier = false;
  for (const unit of battle.units) {
    if (unit.scoutMark && unit.scoutMark.until < battle.round) delete unit.scoutMark;
    if ((unit.scoutLanternUntil ?? Infinity) < battle.round) delete unit.scoutLanternUntil;
    if ((unit.scoutThreadUntil ?? Infinity) < battle.round) delete unit.scoutThreadUntil;
    if (unit.side === 'party' && unit.hp > 0 && (unit.barrier ?? 0) > 0 && unit.barrierUntil !== undefined && unit.barrierUntil < battle.round) hadUnusedBarrier = true;
  }
  if (!ruka || !hadUnusedBarrier || (ruka.scoutThreadUntil ?? -1) >= battle.round) return [];
  ruka.scoutThreadUntil = battle.round + 1;
  return ['ルカ — 使われなかった守りを残り糸へ継いだ'];
}
export function clearScoutEffects(unit: Unit): void {
  delete unit.scoutMark; delete unit.scoutLanternUntil; delete unit.scoutThreadUntil;
}

export interface ScoutAfterAction { skillId?: string; ordinary: boolean; guardedDuringWindup?: boolean }
export function afterScoutAction(battle: Battle, actor: Unit, beforeUnits: Unit[], action: ScoutAfterAction): string[] {
  if (actor.side !== 'party' || actor.hp <= 0 || !action.ordinary) return [];
  const messages: string[] = [];
  const hitEnemies = battle.units.filter(u => u.side === 'enemy' && beforeUnits.some(old => old.uid === u.uid && old.hp > u.hp));
  // Collectors have to be a different living ally. Gem echoes and forced actions never enter this hook.
  for (const target of hitEnemies) {
    const mark = target.scoutMark;
    if (!mark || mark.until < battle.round || mark.sourceId === actor.uid) continue;
    const source = battle.units.find(u => u.uid === mark.sourceId && u.side === 'party' && u.characterId === 'ione');
    if (!source) continue;
    delete target.scoutMark;
    gainUltimate(actor, 10);
    messages.push(`${names[actor.characterId] ?? '仲間'} — 宛先の余白を受け取った`);
    if (activeLeader(battle, 'ione') && !battle.scoutState?.ioneLeaderTriggered) {
      battle.scoutState ??= {}; battle.scoutState.ioneLeaderTriggered = true;
      for (const friend of living(battle, 'party')) gainUltimate(friend, 5);
      messages.push('イオネ — 名前の余白');
    }
  }
  if (activeLeader(battle, 'neri') && action.guardedDuringWindup && !battle.scoutState?.neriLeaderTriggered) {
    battle.scoutState ??= {}; battle.scoutState.neriLeaderTriggered = true;
    const neri = living(battle, 'party').find(u => u.characterId === 'neri')!;
    if (shield(neri, neri.maxHp * .1, battle.round) > 0) messages.push('ネリ — 夜番の引き継ぎ');
  }
  if (actor.characterId === 'ruka' && action.skillId === SCOUT_SKILLS.shear && hitEnemies.length > 0 && activeLeader(battle, 'ruka')) {
    const before = beforeUnits.find(u => u.uid === actor.uid);
    if ((before?.scoutThreadUntil ?? -1) >= battle.round && (battle.scoutState?.rukaHeals ?? 0) < 3 && battle.scoutState?.rukaHealRound !== battle.round) {
      const target = living(battle, 'party').sort(lowestHP)[0];
      if (target) {
        const healed = Math.min(target.maxHp - target.hp, Math.max(1, Math.floor(target.maxHp * .05)));
        if (healed > 0) {
          target.hp += healed;
          battle.scoutState ??= {}; battle.scoutState.rukaHeals = (battle.scoutState.rukaHeals ?? 0) + 1; battle.scoutState.rukaHealRound = battle.round;
          messages.push(`ルカ — 継がれる灯でHP${healed}回復`);
        }
      }
    }
  }
  return messages;
}

export function scoutSkillDescription(skillId: string): string | undefined {
  return {
    [SCOUT_SKILLS.mark]: '敵1体へ次ラウンド終了まで標を残す。別の味方の通常攻撃・キャラクター通常技が実HPダメージを与えると1回消費し、その味方の必殺ゲージ+10。本人・石・必殺・追加攻撃では回収しない。同時に標は1つ、再使用4ラウンド。',
    [SCOUT_SKILLS.lantern]: '先頭の仲間へ次ラウンド終了まで灯を託す。敵の予告大技1回だけ被害25%軽減。通常攻撃・ビット射撃は対象外。同じ灯は重複せず、再使用4ラウンド。',
    [SCOUT_SKILLS.overflow]: '通常単体回復の半量で手当し、本当に余った回復の30%を障壁へ変える。対象最大HP15%まで、次ラウンド終了まで。強い既存障壁を弱めたり延長しない。再使用4ラウンド。',
    [SCOUT_SKILLS.shear]: '単体へ通常スキルの1.3倍の攻撃。残り糸を1つ使うとさらに威力30%増。味方の正の残量の障壁が自然失効すると糸を得る。糸は1つまで、次ラウンド終了まで。破壊・上書き・砕盾消費では得ない。再使用3ラウンド。',
  }[skillId];
}
export function scoutLeaderDescription(characterId: string): string | undefined {
  return {
    ione: '名前の余白：戦闘中最初に標を回収した時、生存味方全員の必殺ゲージ+5。リーダー生存中のみ。',
    neri: '夜番の引き継ぎ：予告中の初めての防御時、自身へ最大HP10%の障壁。戦闘中1回。強い既存障壁を弱めない。',
    fio: '余り布の支度：余花の包帯で実際に新しい障壁を作れた時、本人の必殺ゲージ+10。戦闘中1回。',
    ruka: '継がれる灯：残り糸を使った夜継ぎの鋏が実HPダメージを与えると、HP割合が最も低い味方を最大HP5%回復。1ラウンド1回・戦闘中3回。',
  }[characterId];
}

/** Character skill durations are deliberately independent of their presentation templates. */
export function scoutSkillCooldown(skillId: string): number | undefined {
  if ([SCOUT_SKILLS.mark, SCOUT_SKILLS.lantern, SCOUT_SKILLS.overflow].includes(skillId as typeof SCOUT_SKILLS.mark)) return 4;
  if (skillId === SCOUT_SKILLS.shear) return 3;
  return;
}
/** Available skills are already filtered by the engine's readiness rules. */
export function scoutSuggestedAction(actor: Unit, battle: Battle, skills: SkillDef[], windupCharging: boolean): { skill: SkillDef; template: SkillTemplate; targets: Unit[] } | undefined {
  if (actor.side !== 'party' || actor.hp <= 0) return;
  const available = (id: string) => skills.find(skill => skill.id === id);
  if (actor.characterId === 'ione') {
    const skill = available(SCOUT_SKILLS.mark);
    const collector = living(battle, 'party').find(u => u.uid !== actor.uid && (u.ultimateCharge ?? 0) < 100);
    const target = living(battle, 'enemy').find(u => u.uid === battle.focusTargetId) ?? living(battle, 'enemy')[0];
    if (skill && collector && target && !battle.units.some(u => u.scoutMark?.sourceId === actor.uid && u.scoutMark.until >= battle.round)) return { skill, template: skill.template, targets: [target] };
  }
  if (actor.characterId === 'neri' && windupCharging) {
    const skill = available(SCOUT_SKILLS.lantern);
    const pilot = living(battle, 'party').find(u => u.characterId === battle.partyIds[0]);
    if (skill && pilot && (pilot.scoutLanternUntil ?? -1) < battle.round) return { skill, template: skill.template, targets: [pilot] };
  }
  if (actor.characterId === 'fio') {
    const skill = available(SCOUT_SKILLS.overflow);
    const target = living(battle, 'party').sort(lowestHP)[0];
    // Emergency full healing remains native priority; this is the low-pressure preparation window.
    if (skill && target && target.hp > target.maxHp * .6) {
      const reference = Math.round(actor.attack * ((actor.buffUntil ?? -1) >= battle.round ? 230 + (actor.buffStrength ?? 10) : 200) / 200);
      const excess = Math.max(0, Math.floor(reference * 47 / 40) - (target.maxHp - target.hp));
      const extra = Math.min(Math.floor(target.maxHp * .15), Math.floor(excess * .3));
      const old = (target.barrierUntil ?? -1) >= battle.round ? target.barrier ?? 0 : 0;
      if (extra > old) return { skill, template: skill.template, targets: [target] };
    }
  }
  if (actor.characterId === 'ruka' && (actor.scoutThreadUntil ?? -1) >= battle.round) {
    const skill = available(SCOUT_SKILLS.shear);
    const target = living(battle, 'enemy').find(u => u.uid === battle.focusTargetId) ?? living(battle, 'enemy')[0];
    if (skill && target) return { skill, template: skill.template, targets: [target] };
  }
  return;
}
