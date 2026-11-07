import type { Battle, Content } from './types';
/** Finish already-started 1.10–1.13 expeditions with their original skill data. */
export function combatContent(battle: Battle | null | undefined, content: Content): Content {
    if(battle?.rulesVersion==='3'&&content.rulesVersion==='4'&&RULE3_CONTENT.includes(battle.contentVersion))return {...content,contentVersion:battle.contentVersion,rulesVersion:'3'};
    if (!battle || (battle.rulesVersion ?? '2') !== '2' || !content.legacyCombat)
        return content;
    return { ...content, ...content.legacyCombat, commandRules: undefined, contentVersion: 'v1.10-r1', rulesVersion: '2' };
}

export const RULE3_CONTENT=['v1.20-r1','v1.21-r1','v1.22-r1','v1.23-r1','v1.24-r1','v1.25-r1','v1.26-r1','v1.27-r1','v1.28-r1'];
