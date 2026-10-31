import { describe, expect, it } from 'vitest';
import { GEM_DEFINITIONS, gemDescription, gemName } from '../src/domain/memory-gems';
import { tr } from '../src/locales/i18n';

const japanese = /[\u3040-\u30ff\u3400-\u9fff]/;
describe('Memory Gem English presentation', () => {
  it('translates complete gem names without splitting Japanese possessives inside their names', () => {
    expect(tr('澄明の巻戻しの石', 'en')).toBe('Pure Rewind Gem');
    expect(tr('澄明の祓いの涙石', 'en')).toBe('Pure Cleansing Teardrop');
    expect(tr('残響の暁冠の記憶', 'en')).toBe('Echo Memory of the Dawn Crown');
  });

  it('translates every playable gem description and secured-loot log', () => {
    for (const definition of GEM_DEFINITIONS) for (const variant of definition.variants) {
      const gem = { id: 'translation-check', defId: definition.id, variant };
      expect(tr(gemName(gem), 'en'), gemName(gem)).not.toMatch(japanese);
      expect(tr(gemDescription(gem), 'en'), gemDescription(gem)).not.toMatch(japanese);
      expect(tr(`宝箱から${gemName(gem)}を確保しました。`, 'en')).not.toMatch(japanese);
    }
  });
});
