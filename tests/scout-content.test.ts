import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { SCOUT_SKILLS, scoutSkillContract } from '../src/domain/scout-skills';
import { scoutMaidenCharacters, scoutMaidenSkills } from '../src/content/scout-maidens';

describe('fixed personal mechanic registry', () => {
  it('contains only four engine-backed personal skill contracts', () => {
    expect(scoutMaidenSkills).toHaveLength(4);
    for (const skill of scoutMaidenSkills) expect(scoutSkillContract(skill)?.characterId).toBe(scoutMaidenCharacters.find(c => c.skillIds.includes(skill.id))?.id);
    expect(validateContent(content)).toEqual([]);
  });
  it('does not let another character inherit a registered personal skill', () => {
    const c = structuredClone(content); const target = c.characters.find(c => c.id === 'fio')!;
    target.skillIds = ['heal-17', SCOUT_SKILLS.mark];
    expect(validateContent(c).some(e => e.includes('personal skill belongs to another character'))).toBe(true);
  });
  it('still rejects arbitrary aliases and altered contracts', () => {
    const c = structuredClone(content); const registered = c.skills.find(s => s.id === SCOUT_SKILLS.mark)!;
    c.skills.push({ ...registered, id: 'scout-unregistered-mark' });
    expect(validateContent(c).some(e => e.includes('duplicate semantic key'))).toBe(true);
    registered.template = 'buff'; expect(scoutSkillContract(registered)).toBeUndefined();
    expect(validateContent(c).some(e => e.includes('duplicate semantic key'))).toBe(true);
  });
});
