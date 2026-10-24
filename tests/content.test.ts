import { describe, expect, it } from 'vitest';
import { content, materialName } from '../src/content';
import { validateContent } from '../src/content/validation';

describe('shared content contract', () => {
  it('accepts the complete first playable registry and guarantees launch acquisition', () => {
    expect(validateContent(content)).toEqual([]);
    expect(content.dungeons).toHaveLength(10);
    expect(content.characters.filter(char => char.origin.includes('initial'))).toHaveLength(4);
  });
  it('rejects alias skills that bypass cooldown and role requirements', () => {
    const invalid = structuredClone(content);
    const original = invalid.skills.find(skill => skill.template === 'attack' && skill.strength === 14)!;
    invalid.skills.push({ ...original, id: 'alias-attack' });
    invalid.characters[0].skillIds = [original.id, 'alias-attack'];
    const errors = validateContent(invalid);
    expect(errors.some(message => message.includes('duplicate semantic key'))).toBe(true);
    expect(errors.some(message => message.includes('repeated effect template'))).toBe(true);
    expect(errors.some(message => message.includes('role required skill missing'))).toBe(true);
  });
  it('rejects a published dungeon referencing an unavailable enemy', () => {
    const invalid = structuredClone(content);
    invalid.characters.find(char => char.id === 'pale-wolf')!.published = false;
    expect(validateContent(invalid).some(message => message.includes('unavailable enemy'))).toBe(true);
  });
  it('rejects absent assets, HTML text, and editable derived skill effects', () => {
    const invalid = structuredClone(content);
    invalid.characters[0].portraitId = 'missing';
    invalid.characters[0].flavor = '<button>override</button>';
    invalid.characters[0].dialogue = { intro: '<script>bad</script>', threshold: '……', defeat: '……' };
    Object.assign(invalid.skills[0], { coefficient: 100 });
    const errors = validateContent(invalid);
    expect(errors.some(message => message.includes('missing art/portrait'))).toBe(true);
    expect(errors.some(message => message.includes('plain name, epithet and flavor'))).toBe(true);
    expect(errors.some(message => message.includes('derived effect overrides'))).toBe(true);
    expect(errors.some(message => message.includes('plain boss dialogue'))).toBe(true);
  });
  it('rejects missing SSR guarantee coverage and maps collected material IDs', () => {
    const invalid = structuredClone(content);
    invalid.characters = invalid.characters.filter(char => char.id !== 'evelyn');
    expect(validateContent(invalid).some(message => message.includes('two SSR'))).toBe(true);
    expect(materialName('mist:rare')).toBe('白霧の結晶');
  });
});
