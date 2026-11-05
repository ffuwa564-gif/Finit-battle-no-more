import type { Battle, BattleEvent, SkillDef, Unit } from './types';
import { gainUltimate } from './ultimates';
export type FieldEffect = 'stitch' | 'rest' | 'receipt' | 'supply' | 'capacity';
export interface FieldState {
    duty?: number;
    stock?: number;
    woundUntil?: number;
    restRound?: number;
    originalMaxHp?: number;
    receipt?: {
        sourceId: string;
        targetId: string;
        until: number;
    };
}
export interface SupplyBox {
    amount: number;
    until: number;
    usedRound?: number;
}
const living = (b: Battle) => b.units.filter(u => u.side === 'party' && u.hp > 0);
const lowest = (a: Unit, c: Unit) => a.hp / a.maxHp - c.hp / c.maxHp || a.uid.localeCompare(c.uid);
export function fieldSkill(b: Battle, u: Unit, s: SkillDef, potency: number) {
    if (!s.fieldEffect || u.side !== 'party' || u.hp <= 0)
        return;
    const allies = living(b), enemy = b.units.find(t => t.uid === b.focusTargetId && t.side === 'enemy' && t.hp > 0) ?? b.units.find(t => t.side === 'enemy' && t.hp > 0);
    let target: Unit | undefined;
    let amount = 0;
    const messages: string[] = [];
    if (s.fieldEffect === 'stitch') {
        const stock = u.field?.stock ?? ((u.scoutThreadUntil ?? -1) >= b.round ? 1 : 0);
        if (stock < 1 || !enemy)
            return { handled: true as const, amount: 0, targetIds: [], messages: ['留め縫い — 残り糸が足りない'] };
        u.field ??= {};
        u.field.stock = Math.max(0, stock - 1);
        delete u.scoutThreadUntil;
        enemy.field ??= {};
        enemy.field.woundUntil = b.round + 1;
        target = enemy;
        messages.push('留め縫い — 次ラウンド終了までHP回復を阻止');
    }
    else if (s.fieldEffect === 'rest') {
        target = [...allies].filter(t => t.field?.restRound !== b.round && t.field?.restRound !== b.round + 1).sort((a, c) => (c.field?.duty ?? 0) - (a.field?.duty ?? 0) || Number(Boolean(c.ailments?.charm || c.ailments?.confusion)) - Number(Boolean(a.ailments?.charm || a.ailments?.confusion)) || lowest(a, c))[0];
        if (target) {
            target.field ??= {};
            target.field.restRound = b.round + 1;
            messages.push('休番の札 — 次ラウンドの全行動を休み、その後に復帰');
        }
    }
    else if (s.fieldEffect === 'receipt') {
        target = [...allies].filter(t => t.uid !== u.uid).sort((a, c) => Number(Boolean(c.ailments?.charm || c.ailments?.confusion)) - Number(Boolean(a.ailments?.charm || a.ailments?.confusion)) || lowest(a, c))[0];
        if (target && enemy) {
            for (const t of b.units)
                if (t.field?.receipt?.sourceId === u.uid)
                    delete t.field.receipt;
            target.field ??= {};
            target.field.receipt = { sourceId: u.uid, targetId: enemy.uid, until: b.round + 1 };
            messages.push('宛先の控え — 混乱・魅了による通常攻撃の誤配を一度だけ差し戻す');
        }
    }
    else if (s.fieldEffect === 'supply') {
        target = [...allies].sort(lowest)[0];
        if (target) {
            const ref = Math.round(u.attack * ((u.buffUntil ?? -1) >= b.round ? 230 + (u.buffStrength ?? 10) : 200) / 200), raw = Math.max(1, Math.floor(ref * 47 / 40 * potency));
            amount = Math.min(target.maxHp - target.hp, raw);
            target.hp += amount;
            const reserve = Math.min(60, Math.floor((raw - amount) * .75));
            b.fieldSupplies ??= {};
            const old = b.fieldSupplies[u.uid];
            if (reserve > 0 && (!old || old.amount <= 0 || old.until < b.round)) {
                b.fieldSupplies[u.uid] = { amount: reserve, until: b.round + 3 };
                if (b.leaderId === u.characterId && !b.fieldSupplyLeaderUsed) {
                    b.fieldSupplyLeaderUsed = true;
                    gainUltimate(u, 10);
                }
                messages.push(`預かり箱 — 余剰回復から薬布${reserve}を備蓄`);
            }
        }
    }
    else {
        target = allies.filter(t => (t.field?.originalMaxHp ?? t.maxHp) > t.maxHp).sort((a, c) => a.maxHp / a.field!.originalMaxHp! - c.maxHp / c.field!.originalMaxHp! || a.uid.localeCompare(c.uid))[0];
        if (target) {
            target.maxHp += Math.min(target.field!.originalMaxHp! - target.maxHp, Math.ceil(target.field!.originalMaxHp! * .25));
            messages.push('帰還の鉢皿 — 最大HP容量を復元（現在HPは増えない）');
        }
    }
    return { handled: true as const, amount, targetIds: target ? [target.uid] : [], messages };
}
/** Collect only genuinely expired shields; stored thread is finite and wave-local. */
export function beginFieldRound(b: Battle): void {
    const owner = living(b).find(u => u.characterId === 'ruka' && b.leaderId === 'ruka' && b.researchSkillIds?.includes('ruka'));
    if (owner && living(b).some(u => (u.barrier ?? 0) > 0 && u.barrierUntil !== undefined && u.barrierUntil < b.round)) {
        owner.field ??= {};
        owner.field.stock = Math.min(2, (owner.field.stock ?? 0) + 1);
    }
    if (b.fieldScenario)
        b.fieldScenario.spent = 0;
    for (const u of b.units) {
        if (u.field?.restRound === b.round)
            u.field.duty = 0;
        if (u.field?.receipt && u.field.receipt.until < b.round)
            delete u.field.receipt;
        if (u.field?.woundUntil !== undefined && u.field.woundUntil < b.round)
            delete u.field.woundUntil;
        if (u.field?.restRound === b.round) {
            delete u.guardTarget;
            delete u.guardUntil;
            delete u.guardStrength;
            delete u.defendingUntil;
        }
    }
    for (const [id, box] of Object.entries(b.fieldSupplies ?? {}))
        if (box.until < b.round || box.amount <= 0)
            delete b.fieldSupplies![id];
}
export function repairFieldReceipt(b: Battle, u: Unit, action: {
    template: string;
    targets: Unit[];
    forcedBy?: string;
    skill?: SkillDef;
    ultimate?: boolean;
}): Unit | undefined {
    const receipt = u.field?.receipt;
    if (!receipt || receipt.until < b.round || !['charm', 'confusion'].includes(action.forcedBy ?? '') || action.template !== 'attack' || action.skill || action.ultimate || action.targets.length !== 1 || action.targets[0].side !== u.side)
        return;
    const target = b.units.find(t => t.uid === receipt.targetId && t.side === 'enemy' && t.hp > 0);
    if (target)
        delete u.field!.receipt;
    return target;
}
export function payFieldSupply(b: Battle, actor: Unit, before: Unit[], ordinary: boolean): BattleEvent[] {
    if (actor.side !== 'enemy' || !ordinary)
        return [];
    const events: BattleEvent[] = [];
    for (const [id, box] of Object.entries(b.fieldSupplies ?? {})) {
        if (box.until < b.round || box.amount <= 0 || box.usedRound === b.round)
            continue;
        const target = living(b).filter(u => before.some(old => old.uid === u.uid && old.hp > u.hp)).sort(lowest)[0];
        if (!target)
            continue;
        const amount = Math.min(30, box.amount, target.maxHp - target.hp);
        if (amount <= 0)
            continue;
        box.amount -= amount;
        box.usedRound = b.round;
        target.hp += amount;
        events.push({ id: `supply:${b.id}:${b.round}:${id}`, kind: 'heal', actorId: id, targetIds: [target.uid], amount, text: `預かり箱 — 薬布でHP${amount}回復`, unitsAfter: structuredClone(b.units) });
    }
    return events;
}
export function fieldSuggested(b: Battle, u: Unit, skills: SkillDef[]) {
    if (u.side !== 'party')
        return;
    const skill = skills.find(s => s.fieldEffect);
    if (!skill)
        return;
    const allies = living(b);
    const useful = skill.fieldEffect === 'stitch' ? ((u.field?.stock ?? 0) > 0 || ((u.scoutThreadUntil ?? -1) >= b.round)) && b.units.some(t => t.side === 'enemy' && t.hp > 0 && (t.field?.woundUntil ?? -1) < b.round) : skill.fieldEffect === 'receipt' ? allies.some(t => t.uid !== u.uid && (t.ailments?.confusion || t.ailments?.charm) && !t.field?.receipt) : skill.fieldEffect === 'supply' ? allies.every(t => t.hp / t.maxHp > .6) && !Object.values(b.fieldSupplies ?? {}).some(q => q.amount > 0 && q.until >= b.round) : skill.fieldEffect === 'capacity' ? allies.some(t => (t.field?.originalMaxHp ?? t.maxHp) - t.maxHp >= Math.ceil((t.field?.originalMaxHp ?? t.maxHp) / 4)) : skill.fieldEffect === 'rest' ? allies.some(t => (b.fieldScenario?.kind === 'duty' && (t.field?.duty ?? 0) >= 1) || Boolean(t.ailments?.charm || t.ailments?.confusion)) : false;
    return useful ? { skill, template: skill.template, targets: skill.fieldEffect === 'stitch' ? b.units.filter(t => t.side === 'enemy' && t.hp > 0).slice(0, 1) : [u] } : undefined;
}
export interface FieldScenario {
    kind: 'rewind' | 'duty' | 'capacity';
    rounds: number;
    spent?: number;
    failed?: boolean;
    complete?: boolean;
}
export function capFieldDamage(b: Battle, u: Unit, amount: number): number {
    if (b.fieldScenario?.kind !== 'rewind' || u.side !== 'enemy' || !u.boss)
        return amount;
    const left = Math.max(0, Math.ceil(u.maxHp * .2) - (b.fieldScenario.spent ?? 0)), actual = Math.min(amount, left);
    b.fieldScenario.spent = (b.fieldScenario.spent ?? 0) + actual;
    return actual;
}
export function finishFieldRound(b: Battle): BattleEvent[] {
    const q = b.fieldScenario;
    if (!q)
        return [];
    const events: BattleEvent[] = [];
    const emit = (kind: BattleEvent['kind'], text: string, targetIds?: string[]) => events.push({ id: `field:${b.id}:${b.round}:${events.length}`, kind, text, targetIds, unitsAfter: structuredClone(b.units) });
    if (q.kind === 'rewind' && b.round % 3 === 0) {
        for (const u of b.units.filter(u => u.side === 'enemy' && u.hp > 0)) {
            if ((u.field?.woundUntil ?? -1) >= b.round) {
                emit('buff', '留め縫いが巻戻しを止めた', [u.uid]);
                continue;
            }
            u.hp = u.maxHp;
            emit('heal', '回廊の巻戻し — HP全回復', [u.uid]);
        }
    }
    if (q.kind === 'duty') {
        for (const u of living(b)) {
            u.field ??= {};
            u.field.duty = u.field.restRound === b.round ? 0 : (u.field.duty ?? 0) + 1;
            if (u.field.duty >= 12) {
                u.hp = 0;
                emit('defeat', '当番の限界 — 休番を取れず離脱', [u.uid]);
            }
        }
    }
    if (q.kind === 'capacity') {
        const target = b.units.find(u => u.side === 'party' && u.characterId === b.partyIds[0]);
        if (target && target.hp > 0) {
            target.field ??= {};
            target.field.originalMaxHp ??= target.maxHp;
            const original = target.field.originalMaxHp;
            let rate = .2;
            if ((target.defendingUntil ?? -1) >= b.round)
                rate *= .75;
            if (living(b).some(g => g.uid !== target.uid && g.guardTarget === target.uid && (g.guardUntil ?? -1) >= b.round))
                rate *= .75;
            if (target.field.restRound === b.round)
                rate *= .75;
            const loss = Math.min(target.maxHp, Math.max(Math.ceil(original * .1), Math.ceil(original * rate)));
            const exhausted = loss >= target.maxHp;
            target.maxHp = Math.max(1, target.maxHp - loss);
            if (target.mendThread) target.mendThread.amount = Math.min(target.mendThread.amount, target.maxHp);
            target.hp = exhausted ? 0 : Math.min(target.hp, target.maxHp);
            emit('debuff', `夜露の萎れ — 最大HP容量${loss}減少`, [target.uid]);
        }
        if (!target || target.hp <= 0)
            q.failed = true;
    }
    if (q.kind === 'duty' && living(b).length < 3)
        q.failed = true;
    if (q.kind !== 'rewind' && b.round >= q.rounds) {
        q.failed = q.failed || living(b).length < (q.kind === 'duty' ? 3 : 1);
        q.complete = !q.failed;
        if (q.complete)
            emit('wave', '研究護衛を完了');
        else
            emit('defeat', '研究護衛の条件を満たせなかった');
    }
    return events;
}
export function validFieldState(value: unknown): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return false;
    const q = value as Record<string, unknown>;
    if (Object.keys(q).some(k => !['stock', 'woundUntil', 'restRound', 'originalMaxHp', 'receipt', 'duty'].includes(k)))
        return false;
    for (const k of ['stock', 'woundUntil', 'restRound', 'originalMaxHp', 'duty'])
        if (q[k] !== undefined && (!Number.isSafeInteger(q[k]) || (q[k] as number) < 0 || (q[k] as number) > 1e9))
            return false;
    if (q.stock !== undefined && (q.stock as number) > 2)
        return false;
    if (q.receipt !== undefined) {
        const r = q.receipt as Record<string, unknown>;
        if (!r || typeof r !== 'object' || typeof r.sourceId !== 'string' || typeof r.targetId !== 'string' || !Number.isSafeInteger(r.until) || (r.until as number) < 0)
            return false;
    }
    return true;
}
