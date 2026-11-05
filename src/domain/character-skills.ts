import type { Battle, CharacterDef, Content, SkillDef } from './types';
/** Resolve personal data while preserving skill/cooldown IDs and the base strength. */
export function characterSkills(character: CharacterDef, content: Content, battle?: Battle): SkillDef[] {
    return character.skillIds.map(id => { const base = content.skills.find(skill => skill.id === id); if (!base)
        throw new Error(`不明なスキル: ${id}`); const field = battle?.researchSkillIds?.includes(character.id) ? content.fieldSkills?.[character.id] : undefined; return { ...base, ...character.skillOverrides?.[id], ...(field?.skillId === id ? { name: field.name, description: field.description, fieldEffect: field.effect } : {}), id: base.id }; });
}
