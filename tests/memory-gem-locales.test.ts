import { describe, expect, it } from 'vitest';
import { GEM_DEFINITIONS, gemDescription, gemName, gemTraitInfo, gemRollDescription } from '../src/domain/memory-gems';
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

  it('translates T6 skill effects and expanded trait ranges completely', () => {
    for (const definition of GEM_DEFINITIONS) for (const variant of definition.variants) {
      const gem = {id:'tier6-translation',defId:definition.id,variant,roll:{power:239,trait:'bulwark' as const,value:239}};
      expect(tr(gemDescription(gem),'en')).not.toMatch(japanese);
      expect(tr(gemRollDescription(gem),'en')).not.toMatch(japanese);
    }
    for (const trait of Object.values(gemTraitInfo)) expect(tr(trait.description,'en')).not.toMatch(japanese);
  });

  it('shows the T6 furnace charge gain without a shorter cooldown or trait-based charge bonus', () => {
    for (const [power, charge] of [[220,80],[239,80],[179,70]]) {
      const gem = {id:'furnace-translation',defId:'star-furnace',variant:'pure' as const,roll:{power,trait:'bulwark' as const,value:239}};
      const japaneseDescription = gemDescription(gem);
      const description = tr(japaneseDescription,'en');
      expect(japaneseDescription).toContain(`必殺ゲージを${charge}充填`);
      expect(description).not.toMatch(japanese);
      expect(description).toContain(`ultimate gauge by ${charge}.`);
      expect(description).toContain('Reuse interval: 3 rounds.');
    }
  });

  it('explains the upper-tier Dream Gem charge bonus without implying a shorter cooldown', () => {
    for (const [power, bonus] of [[120, 15], [160, 30], [220, 45]]) {
      const gem = { id: 'dream-translation', defId: 'dream-lace', variant: 'pure' as const, roll: { power, trait: 'bulwark' as const, value: 50 } };
      const description = tr(gemDescription(gem), 'en');
      expect(description).not.toMatch(japanese);
      expect(description).toContain(`Gain ${bonus} extra Ultimate charge whether sleep succeeds or fails.`);
      expect(description).toContain('Reuse interval: 4 rounds.');
    }
  });
});
