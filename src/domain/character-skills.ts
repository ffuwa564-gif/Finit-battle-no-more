import type { CharacterDef, Content, SkillDef } from './types';
/** Resolve personal data while preserving skill/cooldown IDs and the base strength. */
export function characterSkills(character: CharacterDef, content: Content): SkillDef[] {
 return character.skillIds.map(id => { const base=content.skills.find(skill=>skill.id===id);if(!base)throw new Error(`不明なスキル: ${id}`);return{...base,...character.skillOverrides?.[id],id:base.id}; });
}
