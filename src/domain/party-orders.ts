import { ultimateFor, ultimateReady } from './ultimates';
import type { Battle, Content, PartyOrder, SkillDef, SkillTemplate, Unit } from './types';

export interface OrderOption { id: string; label: string; template: SkillTemplate | 'auto'; order: PartyOrder | null; disabled: boolean }
export function validPartyOrder(value: unknown): value is PartyOrder {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return typeof v.kind === 'string' && ['attack', 'guard', 'ultimate'].includes(v.kind) && v.skillId === undefined || v.kind === 'skill' && typeof v.skillId === 'string' && v.skillId.length > 0;
}
/** Snapshot the player has seen, without leaking the precomputed end of the round. */
export function commandUnits(battle: Battle): Unit[] {
  if (battle.phase !== 'playing') return battle.units;
  let units = battle.initialUnits;
  for (const event of battle.events.slice(0, battle.cursor)) if (event.unitsAfter) units = event.unitsAfter;
  return units;
}
export function orderTargets(actor: Unit, battle: Battle, template: SkillTemplate): Unit[] {
  const friends = battle.units.filter(u => u.side === actor.side && u.hp > 0);
  const enemies = battle.units.filter(u => u.side !== actor.side && u.hp > 0);
  const wounded = [...friends].sort((a,b) => a.hp / a.maxHp - b.hp / b.maxHp || a.uid.localeCompare(b.uid));
  if (template === 'rally') return friends;
  if (template === 'mend_pair') return wounded.slice(0, 2);
  if (template === 'overclock') return friends.filter(u => u.uid !== actor.uid && (u.ultimateCharge ?? 0) <= 65).sort((a,b) => b.attack - a.attack).slice(0, 1);
  if (template === 'barrier_mend') return wounded.filter(u => (u.barrier ?? 0) > 0 && (u.barrierUntil ?? -1) >= battle.round && u.hp <= u.maxHp * .75).slice(0, 1);
  if (template === 'guard') return wounded.filter(u => u.uid !== actor.uid).slice(0, 1);
  if (template === 'buff') return [...friends].sort((a,b) => b.attack - a.attack).slice(0, 1);
  if (template === 'cleanse') return [...wounded].sort((a,b) => Number(Boolean(b.ailments || (b.debuffUntil ?? -1) >= battle.round)) - Number(Boolean(a.ailments || (a.debuffUntil ?? -1) >= battle.round))).slice(0, 1);
  if (['heal', 'regen', 'barrier'].includes(template)) return wounded.slice(0, 1);
  if (template === 'area') return enemies;
  return [enemies.find(u => u.uid === battle.focusTargetId) ?? enemies[0]].filter((u): u is Unit => !!u);
}
export function orderSkillReady(actor: Unit, battle: Battle, skill: SkillDef): boolean {
  return (actor.cooldowns[skill.id] ?? 0) <= battle.round && (skill.template !== 'overclock' || actor.hp > actor.maxHp * .2) && orderTargets(actor, battle, skill.template).length > 0;
}
export function partyOrderOptions(actor: Unit, battle: Battle, content: Content): OrderOption[] {
  const def = content.characters.find(c => c.id === actor.characterId)!;
  return [
    { id: 'auto', label: 'おまかせ', template: 'auto', order: null, disabled: false },
    { id: 'attack', label: '通常攻撃', template: 'attack', order: { kind: 'attack' }, disabled: false },
    ...def.skillIds.map(id => { const skill = content.skills.find(s => s.id === id)!; return { id: 'skill:' + id, label: skill.name, template: skill.template, order: { kind: 'skill' as const, skillId: id }, disabled: !orderSkillReady(actor, battle, skill) }; }),
    { id: 'guard', label: '身を守る', template: 'guard', order: { kind: 'guard' }, disabled: false },
    { id: 'ultimate', label: ultimateFor(def).name, template: ultimateFor(def).template, order: { kind: 'ultimate' }, disabled: !ultimateReady(actor) },
  ];
}
