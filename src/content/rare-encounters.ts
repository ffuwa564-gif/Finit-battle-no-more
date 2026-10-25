import type { DungeonDef, NamedMaterialDef, SpeciesDef } from '../domain/types';

export const rareEnemyArt: Record<string, string> = { lucielle: 'rare-lucielle', nemuria: 'rare-nemuria' };
export const rareEnemySpecies: SpeciesDef[] = [
  { id: 'silverwing', name: '銀灯' }, { id: 'nightmoth', name: '夢蛾' },
];
export const rareEnemyMaterials: NamedMaterialDef[] = [
  { id: 'silverwing:common', name: '銀灯の羽片' }, { id: 'silverwing:rare', name: '銀鈴の灯芯' }, { id: 'silverwing:epic', name: '星を宿す銀灯' },
  { id: 'nightmoth:common', name: '夜蛾の鱗粉' }, { id: 'nightmoth:rare', name: '夢織りの翅' }, { id: 'nightmoth:epic', name: '眠り星の雫' },
];
/** One roll at the penultimate wave per ordinary dungeon run. */
export function rareEncounterFor(index: number): DungeonDef['rareEncounter'] {
  return { chance: 8, characterIds: [index < 5 ? 'lucielle' : 'nemuria'] };
}
