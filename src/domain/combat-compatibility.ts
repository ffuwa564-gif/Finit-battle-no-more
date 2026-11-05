import type { Battle, Content } from './types';
/** Finish already-started 1.10–1.13 expeditions with their original skill data. */
export function combatContent(battle: Battle | null | undefined, content: Content): Content {
    if (!battle || (battle.rulesVersion ?? '2') !== '2' || !content.legacyCombat)
        return content;
    return { ...content, ...content.legacyCombat, commandRules: undefined, contentVersion: 'v1.10-r1', rulesVersion: '2' };
}
