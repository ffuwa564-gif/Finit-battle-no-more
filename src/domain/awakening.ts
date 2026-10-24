import type { AwakeningDef, CharacterMemoryDef, Content, GameSave } from './types';

export function awakeningRequirements(def: AwakeningDef, save: Pick<GameSave, 'ownedIds' | 'completedDungeonIds' | 'materials'>, content: Content) {
  const name = (id: string) => content.characters.find(char => char.id === id)?.name ?? id;
  return [
    { label: `${name(def.baseId)}を仲間にする`, met: save.ownedIds.includes(def.baseId) },
    ...def.requiredOwnedIds.map(id => ({ label: `${name(id)}の覚醒`, met: save.ownedIds.includes(id) })),
    ...def.requiredDungeonIds.map(id => ({ label: `${content.dungeons.find(stage => stage.id === id)?.name ?? id}を踏破`, met: save.completedDungeonIds.includes(id) })),
    { label: `${content.materials?.find(item => item.id === def.cost.materialId)?.name ?? def.cost.materialId} ${save.materials[def.cost.materialId] ?? 0} / ${def.cost.count}`, met: (save.materials[def.cost.materialId] ?? 0) >= def.cost.count },
  ];
}
export function awakeningLock(def: AwakeningDef, save: GameSave, content: Content): string | null {
  if (save.ownedIds.includes(def.awakenedId)) return '覚醒済み';
  return awakeningRequirements(def, save, content).find(item => !item.met)?.label ?? null;
}
export function memoryChapters(memory: CharacterMemoryDef, save: Pick<GameSave, 'ownedIds' | 'discoveredIds'>, content: Content) {
  const awakened = content.awakenings?.find(def => def.baseId === memory.characterId)?.awakenedId;
  const owned = save.ownedIds.includes(memory.characterId) || Boolean(awakened && save.ownedIds.includes(awakened));
  const chapters = [
    { title: '出会いの記憶', text: memory.encounter, unlocked: owned || save.discoveredIds.includes(memory.characterId) },
    { title: '共に歩む記憶', text: memory.companion, unlocked: owned },
    { title: '取り戻した記憶', text: memory.awakened, unlocked: Boolean(awakened && save.ownedIds.includes(awakened)) },
  ];
  return awakened ? chapters : chapters.slice(0, 2);
}
export function isolatedMaterialSpecies(content: Content, id: string): boolean {
  return Boolean(content.events?.some(event => event.materialSpeciesId === id) || content.materials?.some(material => material.id.split(':')[0] === id));
}
