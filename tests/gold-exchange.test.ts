import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { createInitialSave, applyCommand } from '../src/application/game';
import { gachaCollections, gachaPoolIds } from '../src/content/gacha';
import { encodeBackup, decodeBackup } from '../src/platform/save-backup';
import { assertSaveCompatibility } from '../src/platform/save';
import type { Content } from '../src/domain/types';

const exchange = { type: 'goldRecruit', exchangeId: 'fortuna-gold' } as const;
describe('permanent gold SSR exchange', () => {
  it('exchanges exactly 50,000 gold once, with no changes to gacha, materials or active party', () => {
    const save = createInitialSave(content, 42); save.gold = 50_007; save.stones = 73; save.drawCount = 80; save.ssrPity = 27;
    const before = structuredClone(save); const next = applyCommand(save, exchange, content);
    expect(next.gold).toBe(7); expect(next.ownedIds).toEqual([...save.ownedIds, 'fortuna']); expect(next.revision).toBe(save.revision + 1);
    for (const key of ['stones', 'drawCount', 'ssrPity', 'seed', 'partyIds', 'leaderId', 'materials', 'potions', 'discoveredIds'] as const) expect(next[key]).toEqual(save[key]);
    expect(save).toEqual(before); assertSaveCompatibility(next, content);
    next.gold = 50_000; const owned = structuredClone(next);
    expect(() => applyCommand(next, exchange, content)).toThrow('すでに仲間'); expect(next).toEqual(owned);
  });
  it('requires all 50,000 gold and refuses missing, hidden, unavailable and malformed exchanges atomically', () => {
    const save = createInitialSave(content, 42); save.gold = 49_999; const before = structuredClone(save);
    expect(() => applyCommand(save, exchange, content)).toThrow('ゴールド'); expect(save).toEqual(before); save.gold = 50_000;
    const variants: Content[] = [
      { ...content, goldExchanges: [] },
      { ...content, goldExchanges: [{ ...content.goldExchanges![0]!, published: false }] },
      ...[0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1].map(goldCost => ({ ...content, goldExchanges: [{ ...content.goldExchanges![0]!, goldCost }] })),
      { ...content, characters: content.characters.map(char => char.id === 'fortuna' ? { ...char, published: false } : char) },
    ];
    for (const definitions of variants) { const initial = structuredClone(save); expect(() => applyCommand(save, exchange, definitions)).toThrow(); expect(save).toEqual(initial); }
    expect(() => applyCommand(save, { ...exchange, exchangeId: 'selene' }, content)).toThrow('見つかりません');
  });
  it('rejects an exchange during exploration without consuming anything', () => {
    let save = createInitialSave(content, 42); save.gold = 50_000;
    save = applyCommand(save, { type: 'depart', dungeonId: 'silent-cathedral', potions: 0 }, content); const before = structuredClone(save);
    expect(() => applyCommand(save, exchange, content)).toThrow('探索'); expect(save).toEqual(before);
  });
  it('retains ownership through backup, permits party and home selection, and preserves old saves', () => {
    const old = createInitialSave(content, 42); old.gold = 50_000;
    const restored = decodeBackup(encodeBackup(old, content), content).save; expect(restored.ownedIds).not.toContain('fortuna');
    const bought = applyCommand(restored, exchange, content);
    const party = applyCommand(bought, { type: 'party', partyIds: ['fortuna', 'seris', 'elaine', 'liora'], leaderId: 'fortuna' }, content);
    const home = applyCommand(party, { type: 'settings', settings: { homeCharacterId: 'fortuna' } }, content);
    const imported = decodeBackup(encodeBackup(home, content), content).save;
    expect(imported).toEqual(home); expect(imported.settings.homeCharacterId).toBe('fortuna'); assertSaveCompatibility(imported, content);
    imported.gold = 50_000; expect(() => applyCommand(imported, exchange, content)).toThrow('すでに仲間');
  });
  it('keeps Fortuna static, gold-exclusive, and outside every gacha and enemy material route', () => {
    expect(validateContent(content)).toEqual([]); expect(content.goldExchanges).toEqual([{ id: 'fortuna-gold', characterId: 'fortuna', goldCost: 50_000, published: true }]);
    const character = content.characters.find(char => char.id === 'fortuna')!;
    expect(character).toMatchObject({ rarity: 'SSR', strength: 23, role: 'supporter', origin: ['gold_exchange'] }); expect(character.motionId).toBeUndefined();
    expect(character.skillIds.map(id => content.skills.find(skill => skill.id === id)!.template)).toEqual(['buff', 'barrier']);
    for (const collection of gachaCollections) expect(gachaPoolIds(collection)).not.toContain('fortuna');
    const save = createInitialSave(content, 42); save.discoveredIds.push('fortuna');
    expect(() => applyCommand(save, { type: 'recruit', characterId: 'fortuna' }, content)).toThrow('仲間化可能');
  });
  it('rejects invalid price, duplicate targets, missing offers and mixed acquisition routes at the content gate', () => {
    for (const mutate of [
      (data: Content) => { data.goldExchanges![0]!.goldCost = 0; },
      (data: Content) => { data.goldExchanges!.push({ ...data.goldExchanges![0]!, id: 'duplicate-fortuna' }); },
      (data: Content) => { data.goldExchanges = []; },
      (data: Content) => { data.characters.find(char => char.id === 'fortuna')!.origin.push('gacha'); },
    ]) {
      const data = structuredClone(content); mutate(data); expect(validateContent(data).some(error => /goldExchanges|gold-exclusive/.test(error))).toBe(true);
    }
  });
});
