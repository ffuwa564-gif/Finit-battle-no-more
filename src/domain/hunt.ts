import { dungeonIndustryProfile, industryItem } from './industry';
import type { Battle, Content, DungeonDef } from './types';

/** A hand is one party action (including a skipped action), not a replay effect. */
export interface HuntState { actions: number; kills: number; serial: number; stage: 'hunting' | 'boss' }
export const HUNT_HANDS = 100;
export const HUNT_RULES={initialEnemies:3,lateEnemies:4,rampAt:50,hp:.65,attack:.45,pressure:.8,eliteEvery:10,eliteHp:1.8,eliteAttack:1.35} as const;
export const HUNT_RANKS = [
  { rank: 'C', kills: 0, rare: 4, epic: 1, gem: 10, tier4: .02, tier5: 0 },
  { rank: 'B', kills: 12, rare: 8, epic: 2, gem: 13, tier4: .06, tier5: .01 },
  { rank: 'A', kills: 24, rare: 13, epic: 4, gem: 17, tier4: .12, tier5: .025 },
  { rank: 'S', kills: 40, rare: 19, epic: 7, gem: 22, tier4: .22, tier5: .06 },
  { rank: 'SS', kills: 60, rare: 25, epic: 10, gem: 27, tier4: .30, tier5: .10 },
] as const;
export function huntRank(kills: number) { return [...HUNT_RANKS].reverse().find(r => kills >= r.kills)!; }
export function canHunt(d: DungeonDef): boolean { return (d.kind ?? 'normal') === 'normal' && !d.towerFloor && !d.fieldLesson && d.waves.length > 1 && d.waves.at(-1)!.some(e=>e.boss) && d.waves.slice(0,-1).some(w=>w.some(e=>!e.boss)); }
export function huntPool(d: DungeonDef): string[] { return [...new Set(d.waves.slice(0,-1).flatMap(w=>w.filter(e=>!e.boss).map(e=>e.characterId)))]; }
export function huntChapter(d: DungeonDef, c: Content): number { return c.chapters?.find(ch=>ch.dungeonIds.includes(d.id))?.number ?? 1; }
const HUNT_PARTS: Record<string,{rare:string[][];epic:string[][]}> = {
 mining:{rare:[['iron','copper-ingot'],['iron','copper-ingot'],['gear','plate']],epic:[['iron','copper-ingot'],['gear','plate'],['precision','charged-crystal'],['luminous-alloy']]},
 fishing:{rare:[['rope'],['rope','wire'],['pure-water','oil']],epic:[['rope','copper-ingot'],['wire','gear'],['sealant','pure-water'],['resonant-circuit']]},
 logging:{rare:[['plank','brick'],['plank','glass'],['sealant','plate']],epic:[['glass','brick'],['plate','glass'],['charged-crystal','sealant'],['luminous-alloy','resonant-circuit']]},
};
export function huntPartPool(d: DungeonDef, c: Content, epic: boolean): string[] {
  const chapter=huntChapter(d,c),profile=HUNT_PARTS[dungeonIndustryProfile(d,c).id]!,pool=epic?profile.epic:profile.rare;
  return pool[Math.min(chapter-1,pool.length-1)]!;
}
export function validHunt(value: unknown): value is HuntState {
  if(!value||typeof value!=='object')return false;const h=value as HuntState;
  return Number.isSafeInteger(h.actions)&&h.actions>=0&&h.actions<=HUNT_HANDS&&Number.isSafeInteger(h.kills)&&h.kills>=0&&h.kills<=2000&&Number.isSafeInteger(h.serial)&&h.serial>=0&&h.serial<=2010&&h.serial>=h.kills&&['hunting','boss'].includes(h.stage)&&(h.stage!=='boss'||h.actions===HUNT_HANDS);
}
export function huntProgress(b: Battle) { return b.hunt ? { ...b.hunt } : undefined; }

export function validateHuntContent(c: Content): string[] {
  const errors:string[]=[];
  for(const d of c.dungeons.filter(canHunt)){
    if(!HUNT_PARTS[dungeonIndustryProfile(d,c).id]){errors.push(`${d.id}: missing hunt component profile`);continue;}
    for(const id of [...huntPartPool(d,c,false),...huntPartPool(d,c,true)])if(industryItem(id)?.kind!=='part')errors.push(`${d.id}: hunt loot must reference an existing craft component: ${id}`);
  }
  return errors;
}
