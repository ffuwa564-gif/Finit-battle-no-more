import type { DungeonDef, SkillTemplate, Unit } from './types';

const healing: readonly SkillTemplate[] = ['heal', 'mend_pair', 'barrier_mend', 'regen'];

/** Tower phantoms have a finite support budget; other encounters keep their own rules. */
export function enemySupportAvailable(actor: Unit, template: SkillTemplate, stage: DungeonDef): boolean {
  if (actor.side !== 'enemy' || !stage.towerBattle) return true;
  if (healing.includes(template)) return (actor.towerSupportUsed?.healing ?? 0) < stage.towerBattle.healLimit;
  if (template === 'barrier') return (actor.towerSupportUsed?.barrier ?? 0) < stage.towerBattle.barrierLimit;
  return true;
}

export function spendEnemySupport(actor: Unit, template: SkillTemplate, stage: DungeonDef): void {
  if (actor.side !== 'enemy' || !stage.towerBattle || !healing.includes(template) && template !== 'barrier') return;
  actor.towerSupportUsed ??= { healing: 0, barrier: 0 };
  if (template === 'barrier') actor.towerSupportUsed.barrier += 1;
  else actor.towerSupportUsed.healing += 1;
}
