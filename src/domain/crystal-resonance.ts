import type { Role } from './types';

export const crystalRoles = ['healer', 'tank', 'attacker', 'area_attacker', 'supporter', 'debuffer'] as const satisfies readonly Role[];
export const CRYSTAL_POWER = 1.2;
export function validCrystalRole(value: unknown): value is Role {
  return typeof value === 'string' && (crystalRoles as readonly string[]).includes(value);
}
/** Skill strength stores a baseline offset; scale the actual effect, not the encoding. */
export function resonantStrength(strength: number, power: number, offset = 30): number {
  return Math.round((strength + offset) * power) - offset;
}
