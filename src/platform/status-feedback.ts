import type { Ailment, BattleEvent, SkillTemplate, Unit } from '../domain/types';
import { ailments, ailmentNames } from '../domain/ailments';

export type StatusVisual = Ailment | 'buff' | 'debuff' | 'resist' | 'recover' | 'barrier' | 'break';
export interface StatusNotice { unitId: string; characterId: string; side: Unit['side']; label: string; visual: StatusVisual }

/** Presentation of recorded outcomes only: never roll, infer damage bonuses, or mutate combat. */
export function statusNotices(event: BattleEvent, before: Unit[], round: number, template?: SkillTemplate): StatusNotice[] {
  const after = event.unitsAfter;
  if (!after || event.kind === 'wave' || event.kind === 'drop' || event.kind === 'dialogue') return [];
  const notices: StatusNotice[] = [];
  const add = (unit: Unit, label: string, visual: StatusVisual) => notices.push({unitId: unit.uid, characterId: unit.characterId, side: unit.side, label, visual});
  for (const unit of after) {
    const old = before.find(candidate => candidate.uid === unit.uid);
    if (!old) continue;
    const explicit = event.targetIds?.includes(unit.uid);
    if (explicit && event.ailment && event.statusAction === 'resist') add(unit, `${ailmentNames[event.ailment]} RESIST`, 'resist');
    if (unit.uid === event.actorId && event.ailment && event.statusAction === 'skip') add(unit, `${ailmentNames[event.ailment]}・行動不能`, event.ailment);
    if (unit.uid === event.actorId && event.ailment && event.statusAction === 'friendly_fire') add(unit, `${ailmentNames[event.ailment]}・同士討ち`, event.ailment);
    for (const ailment of ailments) {
      const previous = old.ailments?.[ailment], next = unit.ailments?.[ailment];
      if (next && (!previous || next.turns > previous.turns || next.sourceId !== previous.sourceId)) add(unit, ailmentNames[ailment], ailment);
      if (previous && !next && unit.hp > 0) add(unit, `${ailmentNames[ailment]}解除`, 'recover');
    }
    for (const [until, strength, label, visual] of [
      ['buffUntil', 'buffStrength', '攻撃↑', 'buff'],
      ['debuffUntil', 'debuffStrength', '防御↓', 'debuff'],
      ['regenUntil', 'regenStrength', '継続回復', 'buff'],
    ] as const) {
      const active = unit.hp > 0 && (unit[until] ?? -1) >= round;
      const wasActive = (old[until] ?? -1) >= round;
      if (active && (!wasActive || (unit[until] ?? -1) > (old[until] ?? -1) || (unit[strength] ?? 0) > (old[strength] ?? 0))) add(unit, label, visual);
      if (unit.hp > 0 && wasActive && !active) add(unit, `${label}解除`, 'recover');
    }
    if (unit.hp > 0) {
      for (const [until, label] of [['statusWardUntil', '状態耐性'], ['defendingUntil', '身を守る'], ['guardUntil', 'かばう']] as const) {
        if ((unit[until] ?? -1) >= round && (unit[until] ?? -1) > (old[until] ?? -1)) add(unit, label, 'buff');
      }
    }
    const shield = (unit.barrierUntil ?? -1) >= round ? unit.barrier ?? 0 : 0;
    const previousShield = (old.barrierUntil ?? -1) >= round ? old.barrier ?? 0 : 0;
    if (shield > previousShield) add(unit, `障壁 +${shield - previousShield}`, 'barrier');
    // Only damaging events with recorded absorption count as shield hits. Recycling,
    // expiry and a boss voluntarily opening its shield must never look like RESIST.
    if (['attack', 'area'].includes(event.kind) && explicit && previousShield > shield) {
      if (template === 'shatter' && explicit) add(unit, '障壁破壊', 'break');
      else if ((event.absorbed ?? 0) > 0) {
        add(unit, `${unit.hp === old.hp ? 'RESIST · ' : ''}障壁吸収 ${previousShield - shield}`, 'barrier');
        if (!shield) add(unit, '障壁消失', 'break');
      }
    }
  }
  return notices;
}
