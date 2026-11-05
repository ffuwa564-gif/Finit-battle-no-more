import { characterSkills } from './character-skills';
import type { BarrierMendContract, Content, SkillDef, Unit } from './types';

/** One paid action and a finite inventory of genuinely expired shields. */
export function validBarrierMendContract(value: unknown): value is BarrierMendContract {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).sort().join(',') === 'carryRounds,conversionPercent,donorScope,healingFirst'
    && ['target', 'party'].includes(String(v.donorScope)) && typeof v.healingFirst === 'boolean'
    && Number.isSafeInteger(v.carryRounds) && Number(v.carryRounds) >= 1 && Number(v.carryRounds) <= 3
    && Number.isSafeInteger(v.conversionPercent) && Number(v.conversionPercent) >= 100 && Number(v.conversionPercent) <= 300;
}

/** Public expiry projection allows the ready-state dial and resolver to agree. Never reads intentions/RNG. */
export function projectedMendThread(unit: Unit, round: number, carryRounds: number): { amount: number; until: number } | undefined {
  if (unit.hp <= 0) return;
  const current = unit.mendThread && unit.mendThread.until >= round ? unit.mendThread : undefined;
  const expired = (unit.barrier ?? 0) > 0 && (unit.barrierUntil ?? Infinity) < round ? unit.barrier! : 0;
  if (!current && !expired) return;
  return { amount: Math.min(unit.maxHp, (current?.amount ?? 0) + expired), until: expired ? Math.max(current?.until ?? 0, round + carryRounds - 1) : current!.until };
}

export function harvestMendThreads(units: Unit[], round: number, content: Content): { unitId: string; added: number; until: number }[] {
  const collectors = units.filter(u => u.hp > 0).flatMap(u => {
    const def = content.characters.find(c => c.id === u.characterId);
    const contracts = def ? characterSkills(def, content).flatMap(s => s.barrierMend ? [s.barrierMend] : []) : [];
    return contracts.filter(validBarrierMendContract).map(c => ({ side: u.side, rounds: c.carryRounds }));
  });
  const stored: { unitId: string; added: number; until: number }[] = [];
  for (const unit of units) {
    if (unit.mendThread && (unit.hp <= 0 || unit.mendThread.until < round)) delete unit.mendThread;
    const rules = collectors.filter(c => c.side === unit.side);
    if (!rules.length || unit.hp <= 0 || !(unit.barrier! > 0) || !((unit.barrierUntil ?? Infinity) < round)) continue;
    const previous = unit.mendThread?.amount ?? 0;
    const projected = projectedMendThread(unit, round, Math.max(...rules.map(c => c.rounds)))!;
    unit.mendThread = projected;
    delete unit.barrier; delete unit.barrierUntil; // The same expired shield cannot be harvested twice.
    if (projected.amount > previous) stored.push({ unitId: unit.uid, added: projected.amount - previous, until: projected.until });
  }
  return stored;
}

export interface BarrierMendQuote { healed: number; spent: number; donors: { unitId: string; amount: number; source: 'barrier' | 'thread' }[] }
export function quoteBarrierMend(target: Unit, units: readonly Unit[], round: number, skill: SkillDef, potency = 1): BarrierMendQuote {
  const empty = { healed: 0, spent: 0, donors: [] };
  if (target.hp <= 0 || target.hp >= target.maxHp || !Number.isFinite(potency) || potency <= 0) return empty;
  const contract = skill.barrierMend;
  if (contract && !validBarrierMendContract(contract)) return empty;
  const rate = (contract?.conversionPercent ?? 200) / 100 * potency;
  let left = Math.min(Math.max(1, Math.floor(target.maxHp * .15)), Math.ceil((target.maxHp - target.hp) / rate));
  const withdrawals: BarrierMendQuote['donors'] = [];
  if (contract) {
    const donors = units.filter(u => u.side === target.side && u.hp > 0 && (contract.donorScope === 'party' || u.uid === target.uid))
      .map(u => ({ unit: u, thread: projectedMendThread(u, round, contract.carryRounds) })).filter(x => x.thread && x.thread.amount > 0)
      .sort((a, b) => a.thread!.until - b.thread!.until || a.unit.uid.localeCompare(b.unit.uid));
    for (const donor of donors) {
      const amount = Math.min(left, donor.thread!.amount);
      if (amount > 0) { withdrawals.push({ unitId: donor.unit.uid, amount, source: 'thread' }); left -= amount; }
      if (left <= 0) break;
    }
  }
  const ownBarrier = (target.barrierUntil ?? -1) >= round ? target.barrier ?? 0 : 0;
  const own = Math.min(left, ownBarrier);
  if (own > 0) withdrawals.push({ unitId: target.uid, amount: own, source: 'barrier' });
  const spent = withdrawals.reduce((sum, item) => sum + item.amount, 0);
  const healed = Math.min(target.maxHp - target.hp, Math.floor(spent * rate));
  return healed > 0 ? { healed, spent, donors: withdrawals } : empty;
}

/** Preserve existing shielded recipients; a shieldless critical ally may use saved thread. */
export function barrierMendTarget(units: readonly Unit[], round: number, skill: SkillDef): Unit | undefined {
  const eligible = units.filter(u => u.hp > 0 && u.hp <= u.maxHp * .75 && quoteBarrierMend(u, units, round, skill).healed > 0)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.uid.localeCompare(b.uid));
  if (!skill.barrierMend) return eligible[0];
  return eligible.find(u => u.hp <= u.maxHp * .3) ?? eligible.find(u => (u.barrier ?? 0) > 0 && (u.barrierUntil ?? -1) >= round) ?? eligible[0];
}

export function applyBarrierMend(target: Unit, units: Unit[], round: number, skill: SkillDef, potency = 1): BarrierMendQuote {
  const quote = quoteBarrierMend(target, units, round, skill, potency);
  // Materialize only public expiry projections. No active ally shield is ever withdrawn.
  for (const withdrawal of quote.donors) {
    const donor = units.find(u => u.uid === withdrawal.unitId)!;
    if (withdrawal.source === 'thread') {
      const projected = projectedMendThread(donor, round, skill.barrierMend!.carryRounds)!;
      donor.mendThread = { amount: projected.amount - withdrawal.amount, until: projected.until };
      if ((donor.barrierUntil ?? Infinity) < round) { delete donor.barrier; delete donor.barrierUntil; }
      if (!donor.mendThread.amount) delete donor.mendThread;
    } else donor.barrier = (donor.barrier ?? 0) - withdrawal.amount;
  }
  target.hp += quote.healed;
  return quote;
}
