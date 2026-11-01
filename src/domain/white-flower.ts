import type { Battle, Unit } from './types';

export const WHITE_FLOWER_STONE_ID = 'white-flower-seed';
export const WHITE_FLOWER_INITIAL_HEAL = 20;
export const WHITE_FLOWER_DELAYED_HEAL = 50;
export const WHITE_FLOWER_FUTURE_ROUNDS = 2;

export interface WhiteFlowerPlantResult {
  targetId?: string;
  initialHealing: number;
  planted: boolean;
  messages: string[];
}
export interface WhiteFlowerGuardResult { healed: number; consumed: boolean }

/** The stored amount is fixed once here: no gem, crystal, leader or attack multiplier. */
export function plantWhiteFlower(battle: Battle, actor: Unit): WhiteFlowerPlantResult {
  const result: WhiteFlowerPlantResult = { initialHealing: 0, planted: false, messages: [] };
  if (actor.side !== 'party' || actor.hp <= 0 || !battle.partyIds.includes(actor.characterId)) return result;
  const target = battle.units.find(unit => unit.side === 'party' && unit.characterId === battle.partyIds[0]);
  // The departure-time pilot is a fixed address. Death never silently changes it.
  if (!target) return result;
  expireWhiteFlower(target, battle.round);
  if (target.hp <= 0) return result;
  result.targetId = target.uid;
  result.initialHealing = Math.max(0, Math.min(WHITE_FLOWER_INITIAL_HEAL, target.maxHp - target.hp));
  target.hp += result.initialHealing;
  if (target.whiteFlower) {
    result.messages.push('摘まない白花 — 種は重ねず、期限も更新しない');
    return result;
  }
  target.whiteFlower = { amount: WHITE_FLOWER_DELAYED_HEAL, until: battle.round + WHITE_FLOWER_FUTURE_ROUNDS };
  result.planted = true;
  result.messages.push('摘まない白花 — 先頭の仲間へ種を預けた');
  return result;
}

/** Call only after the recipient really spends her ordinary action on manual guard. */
export function consumeWhiteFlowerOnGuard(unit: Unit, round: number, ordinaryGuardExecuted = false): WhiteFlowerGuardResult {
  expireWhiteFlower(unit, round);
  if (!ordinaryGuardExecuted || unit.side !== 'party' || unit.hp <= 0 || !unit.whiteFlower) return { healed: 0, consumed: false };
  const amount = unit.whiteFlower.amount;
  // Consume first. The direct HP write cannot retrigger healing, a seed, thread or charge hooks.
  delete unit.whiteFlower;
  const healed = Math.max(0, Math.min(amount, unit.maxHp - unit.hp));
  unit.hp += healed;
  return { healed, consumed: true };
}

/** Expiry is inclusive: a seed planted inR1 can bloom through the end ofR3. */
export function expireWhiteFlower(unit: Unit, round: number): boolean {
  const flower = unit.whiteFlower;
  if (!flower) return false;
  const invalid = !Number.isSafeInteger(flower.amount) || flower.amount <= 0 || flower.amount > WHITE_FLOWER_DELAYED_HEAL || !Number.isSafeInteger(flower.until) || flower.until < 1;
  if (unit.side !== 'party' || unit.hp <= 0 || invalid || flower.until < round) {
    delete unit.whiteFlower;
    return true;
  }
  return false;
}
export function clearWhiteFlower(unit: Unit): void { delete unit.whiteFlower; }

export const WHITE_FLOWER_DESCRIPTION = '固定T3・特性なし。出発時の先頭が生存中ならHP20回復し、HP50回復の種を1個置く。種は付与ラウンド+2の終了まで、本人が通常の「身を守る」を実行した時だけ消費して回復。種は重ねず期限も更新しない。防御予約・作戦変更・かばう・行動不能・必殺・戦場の花では開花しない。数値は固定で石・結晶倍率を再適用せず、余剰は消える。再使用4ラウンド。';
