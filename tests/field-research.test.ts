import { describe, it, expect } from 'vitest';
import { content, validateContent } from '../src/content';
import { createBattle, advanceReplay, resolveRound } from '../src/domain/engine';
import { createInitialSave } from '../src/application/game';
import { characterSkills } from '../src/domain/character-skills';
import { fieldSkill, beginFieldRound, payFieldSupply, finishFieldRound, capFieldDamage, repairFieldReceipt } from '../src/domain/field-research';
import { assertSaveCompatibility } from '../src/platform/save';
function ready(stage = 'silent-cathedral') {
    let b = createBattle(content, ['ruka', 'neri', 'ione', 'fio'], 'ruka', stage, 0, 42, 'field');
    while (b.phase === 'playing')
        b = advanceReplay(b, content);
    b.researchSkillIds = ['ruka', 'neri', 'ione', 'fio'];
    return b;
}
function skill(id: string) { return characterSkills(content.characters.find(c => c.id === id)!, content, { researchSkillIds: [id] } as ReturnType<typeof ready>).find(s => s.fieldEffect)!; }
describe('1.20 adopted field research', () => {
    it('validates the combined release and keeps personal skills opt-in', () => {
        expect(validateContent(content)).toEqual([]);
        for (const id of Object.keys(content.fieldSkills!)) {
            const c = content.characters.find(c => c.id === id)!;
            expect(characterSkills(c, content).some(s => s.fieldEffect)).toBe(false);
            expect(skill(id).name).toBe(content.fieldSkills![id].name);
        }
    });
    it('collects expired leader shields once, spends finite thread, and caps boss damage', () => {
        const b = ready('research-rewinding-hall'), r = b.units[0], e = b.units.find(u => u.side === 'enemy')!;
        b.round = 2;
        r.barrier = 10;
        r.barrierUntil = 1;
        beginFieldRound(b);
        expect(r.field?.stock).toBe(1);
        fieldSkill(b, r, skill('ruka'), 1);
        expect(r.field?.stock).toBe(0);
        expect(e.field?.woundUntil).toBe(3);
        expect(capFieldDamage(b, e, e.maxHp)).toBe(Math.ceil(e.maxHp * .2));
        expect(capFieldDamage(b, e, 100)).toBe(0);
        b.round = 3;
        e.hp = 1;
        finishFieldRound(b);
        expect(e.hp).toBe(1);
        b.round = 6;
        finishFieldRound(b);
        expect(e.hp).toBe(e.maxHp);
    });
    it('uses rest to reset duty and fails immediately when fewer than three survive', () => {
        const b = ready('research-duty-ferry'), n = b.units.find(u => u.characterId === 'neri')!;
        b.units[0].field = { duty: 11 };
        fieldSkill(b, n, skill('neri'), 1);
        b.round++;
        beginFieldRound(b);
        finishFieldRound(b);
        expect(b.units[0].field?.duty).toBe(0);
        b.units.filter(u => u.side === 'party').slice(0, 2).forEach(u => u.hp = 0);
        finishFieldRound(b);
        expect(b.fieldScenario?.failed).toBe(true);
    });
    it('redirects only one confused ordinary friendly attack', () => {
        const b = ready(), i = b.units.find(u => u.characterId === 'ione')!, target = b.units[0], enemy = b.units.find(u => u.side === 'enemy')!;
        target.ailments = { confusion: { turns: 2, sourceId: enemy.uid } };
        fieldSkill(b, i, skill('ione'), 1);
        expect(repairFieldReceipt(b, target, { template: 'attack', targets: [i], forcedBy: 'confusion' })?.uid).toBe(enemy.uid);
        expect(repairFieldReceipt(b, target, { template: 'attack', targets: [i], forcedBy: 'confusion' })).toBeUndefined();
    });
    it('stores only real surplus and pays at most once per round without refilling', () => {
        const b = ready(), f = b.units.find(u => u.characterId === 'fio')!, target = b.units[0], enemy = b.units.find(u => u.side === 'enemy')!;
        fieldSkill(b, f, skill('fio'), 1);
        const stock = b.fieldSupplies![f.uid].amount;
        expect(stock).toBeGreaterThan(0);
        const before = structuredClone(b.units);
        target.hp -= 50;
        expect(payFieldSupply(b, enemy, before, true)).toHaveLength(1);
        expect(payFieldSupply(b, enemy, before, true)).toHaveLength(0);
        expect(b.fieldSupplies![f.uid].amount).toBe(Math.max(0, stock - 30));
    });
    it('keeps repair threads finite when the capacity rule shrinks their owner', () => {
        const b = ready('research-whiteflower-return'), target = b.units[0];
        target.mendThread = { amount: target.maxHp, until: b.round + 2 };
        finishFieldRound(b);
        expect(target.mendThread.amount).toBe(target.maxHp);
        const save = createInitialSave(content, 42); save.ownedIds = content.characters.filter(c => c.published).map(c => c.id); save.partyIds = b.partyIds; save.leaderId = b.leaderId; save.battle = b;
        expect(() => assertSaveCompatibility(save, content)).not.toThrow();
    });
    it('restores capacity without healing current HP', () => {
        const b = ready(), e = b.units[0];
        e.field = { originalMaxHp: e.maxHp };
        const original = e.maxHp;
        e.maxHp = Math.floor(original * .5);
        e.hp = e.maxHp - 1;
        const hp = e.hp;
        fieldSkill(b, e, skill('elaine'), 1);
        expect(e.hp).toBe(hp);
        expect(e.maxHp).toBe(Math.floor(original * .5) + Math.ceil(original * .25));
    });
    it('completes a timed trial through the normal replay transition with no dead-enemy early win', () => {
        let b = ready('research-duty-ferry');
        b.round = 12;
        b.units.forEach(u => { if (u.side === 'enemy')
            u.hp = 0;
        else
            u.field = { duty: 0 }; });
        b = resolveRound(b, content).battle;
        while (b.phase === 'playing')
            b = advanceReplay(b, content);
        expect(b.phase).toBe('reward');
        expect(b.pendingMaterials).toEqual({});
    });
    it('keeps selected skills and finite state across JSON save validation', () => {
        const s = createInitialSave(content, 42);
        s.ownedIds = content.characters.filter(c => c.published).map(c => c.id);
        s.partyIds = ['ruka', 'neri', 'ione', 'fio'];
        s.leaderId = 'ruka';
        s.researchSkillIds = ['ruka'];
        s.battle = ready();
        expect(() => assertSaveCompatibility(JSON.parse(JSON.stringify(s)), content)).not.toThrow();
        (s as unknown as {
            researchSkillIds: unknown;
        }).researchSkillIds = 'ruka';
        expect(() => assertSaveCompatibility(s, content)).toThrow();
    });
});
