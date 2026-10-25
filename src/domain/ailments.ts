import type { Ailment, SkillTemplate, Unit } from './types';

export const ailments = ['confusion', 'sleep', 'paralysis', 'charm'] as const;
export const isAilment = (template: SkillTemplate): template is Ailment => (ailments as readonly string[]).includes(template);
export const ailmentNames: Record<Ailment, string> = { confusion: '混乱', sleep: '睡眠', paralysis: '麻痺', charm: '魅了' };
export const ailmentDescriptions: Record<Ailment, string> = {
  confusion: 'スキルを使わず、50%で味方（自分を含む）、それ以外は敵へ通常攻撃。',
  sleep: '行動できない。HPにダメージを受けると目覚める。障壁だけへのダメージでは起きない。',
  paralysis: '自分の行動時に40%の確率で行動できない。',
  charm: 'スキルを使わず、自分以外の味方へ通常攻撃。味方がいなければ行動できない。付与者が倒れると解除。',
};
export const hasAilment = (unit: Unit): boolean => ailments.some(id => Boolean(unit.ailments?.[id]));
export function cureAilments(unit: Unit, round: number): void {
  if (hasAilment(unit)) { delete unit.ailments; unit.statusWardUntil = round + 1; }
}
export function ailmentChance(target: Unit): number { return target.boss ? 35 : 70; }
