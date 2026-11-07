import{content}from'./policy.mts';
const initial=content.commandRules;export type Mode='before'|'after';export function setMode(mode:Mode){if(!initial?.respectReadyResources)throw Error('Noelle research flag required');(content as any).commandRules=mode==='after'?initial:undefined;}export function resetMode(){(content as any).commandRules=initial;}
