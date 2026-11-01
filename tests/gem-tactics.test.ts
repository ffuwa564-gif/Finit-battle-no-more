import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { createInitialSave } from '../src/application/game';
import { findGemSources } from '../src/domain/builds';

describe('fixed crafted stone acquisition guide', () => {
  it('does not invent loot or refinement paths for a finished T3 Wick Stone', () => {
    const save=createInitialSave(content);
    const sources=findGemSources(content,save,'wick-stone');
    expect(sources).toHaveLength(1);
    expect(sources[0].kind).toBe('craft');
    expect(sources[0].maxTier).toBe(3);
    expect(sources[0].dungeonId).toBeUndefined();
    expect(findGemSources(content,save,'wick-stone',{defId:'wick-stone',variant:'pure',power:220})).toEqual([]);
    expect(findGemSources(content,save,'wick-stone',{defId:'wick-stone',variant:'pure',power:80,trait:'chain',value:0})).toEqual([]);
  });
});
