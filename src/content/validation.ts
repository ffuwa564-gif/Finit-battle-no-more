import type { Content, Role, SkillTemplate } from '../domain/types';

const required: Record<Role, SkillTemplate> = { healer: 'heal', tank: 'guard', attacker: 'attack', area_attacker: 'area', supporter: 'buff', debuffer: 'debuff' };
const profiles = new Set(['default', 'attack', 'area', 'heal', 'guard', 'buff', 'debuff', 'drop']);
const templates = new Set(['attack', 'area', 'heal', 'guard', 'buff', 'debuff']);
const leaderStats = new Set(['hp', 'attack', 'defense']);
const roles = new Set(Object.keys(required));
const plain = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && !/<\/?[a-z!][^>]*>/i.test(value);
const strengthValid = (value: number) => Number.isInteger(value) && value >= 10 && value <= 30;

/** Shared build/runtime validation. No character-specific validators or executable data. */
export function validateContent(content: Content): string[] {
  const errors: string[] = [];
  const reject = (condition: boolean, message: string) => { if (condition) errors.push(message); };
  for (const key of ['appVersion', 'contentVersion', 'rulesVersion'] as const) reject(!plain(content[key]), `${key}: required version`);
  reject(!Number.isInteger(content.schemaVersion) || content.schemaVersion < 1, 'schemaVersion: positive integer required');
  const allIds = <T extends { id: string }>(items: T[], kind: string) => {
    const ids = new Set<string>();
    for (const item of items) { reject(!/^[a-z0-9][a-z0-9-]*$/.test(item.id), `${kind}/${item.id}: invalid stable ID`); reject(ids.has(item.id), `${kind}/${item.id}: duplicate ID`); ids.add(item.id); }
    return ids;
  };
  const characterIds = allIds(content.characters, 'characters');
  const skillIds = allIds(content.skills, 'skills');
  const speciesIds = allIds(content.species, 'species');
  const assetIds = allIds(content.assets, 'assets');
  allIds(content.dungeons, 'dungeons');
  for (const species of content.species) reject(!plain(species.name), `species/${species.id}: plain name required`);
  for (const asset of content.assets) {
    reject(!['portrait', 'illustration', 'background', 'icon', 'video'].includes(asset.kind), `assets/${asset.id}: invalid kind`);
    reject(!(asset.kind === 'video' ? /^[a-zA-Z0-9][a-zA-Z0-9/_.-]*\.mp4$/ : /^[a-zA-Z0-9][a-zA-Z0-9/_.-]*\.(svg|png|webp|avif|jpg|jpeg)$/).test(asset.path) || asset.path.includes('..'), `assets/${asset.id}: local safe file path required`);
    reject(!Number.isInteger(asset.width) || asset.width <= 0 || !Number.isInteger(asset.height) || asset.height <= 0, `assets/${asset.id}: dimensions required`);
    reject(asset.portraitZoom !== undefined && (!Number.isFinite(asset.portraitZoom) || asset.portraitZoom < 1 || asset.portraitZoom > 3), `assets/${asset.id}: portrait zoom must be 1..3`);
    reject(asset.portraitOrigin !== undefined && !/^\d+(?:\.\d+)?% \d+(?:\.\d+)?%$/.test(asset.portraitOrigin), `assets/${asset.id}: portrait origin must use percentage coordinates`);
    reject(!plain(asset.anchor) || !plain(asset.rights), `assets/${asset.id}: anchor and rights required`);
  }
  const semanticKeys = new Set<string>();
  for (const skill of content.skills) {
    reject(!plain(skill.name), `skills/${skill.id}: plain name required`);
    reject(!templates.has(skill.template), `skills/${skill.id}: unknown template`);
    reject(!strengthValid(skill.strength), `skills/${skill.id}: integer strength 10..30 required`);
    reject(!profiles.has(skill.soundProfile), `skills/${skill.id}: unknown sound profile`);
    const key = `${skill.template}:${skill.strength}`;
    reject(semanticKeys.has(key), `skills/${skill.id}: duplicate semantic key ${key}`);
    semanticKeys.add(key);
    reject(Object.keys(skill).some(key => !['id', 'name', 'template', 'strength', 'soundProfile'].includes(key)), `skills/${skill.id}: derived effect overrides are forbidden`);
  }
  for (const char of content.characters) {
    if (char.motionId) reject(!content.assets.some(asset => asset.id === char.motionId && asset.kind === 'video'), `characters/${char.id}: motion must reference a video asset`);
    reject(!plain(char.name) || !plain(char.epithet) || !plain(char.flavor), `characters/${char.id}: plain name, epithet and flavor required`);
    if (char.dialogue) for (const [event, text] of Object.entries(char.dialogue)) reject(!['intro', 'threshold', 'defeat'].includes(event) || !plain(text), `characters/${char.id}: plain boss dialogue required`);
    if (char.dialogue) reject(!['intro', 'threshold', 'defeat'].every(event => plain(char.dialogue?.[event as keyof NonNullable<typeof char.dialogue>])), `characters/${char.id}: complete boss dialogue required`);
    reject(!roles.has(char.role), `characters/${char.id}: unknown role`);
    reject(!leaderStats.has(char.leaderStat), `characters/${char.id}: invalid leader stat`);
    reject(!strengthValid(char.strength), `characters/${char.id}: integer strength 10..30 required`);
    reject(typeof char.published !== 'boolean', `characters/${char.id}: publication state required`);
    reject(!speciesIds.has(char.speciesId), `characters/${char.id}: missing species ${char.speciesId}`);
    reject(!assetIds.has(char.artId) || !assetIds.has(char.portraitId), `characters/${char.id}: missing art/portrait asset`);
    reject(content.assets.find(asset => asset.id === char.artId)?.kind !== 'illustration' || content.assets.find(asset => asset.id === char.portraitId)?.kind !== 'portrait', `characters/${char.id}: incorrect image kinds`);
    if (char.encounterArtId !== undefined) reject(!assetIds.has(char.encounterArtId) || content.assets.find(asset => asset.id === char.encounterArtId)?.kind !== 'background', `characters/${char.id}: invalid encounter scene`);
    reject(!profiles.has(char.soundProfile), `characters/${char.id}: unknown sound profile`);
    reject(!['R', 'SR', 'SSR'].includes(char.rarity), `characters/${char.id}: invalid rarity`);
    reject(!Array.isArray(char.origin) || char.origin.length === 0 || char.origin.some(origin => !['initial', 'recruit', 'gacha', 'event'].includes(origin)) || new Set(char.origin).size !== char.origin.length, `characters/${char.id}: valid acquisition routes required`);
    reject(char.origin.includes('event') && char.origin.length !== 1, `characters/${char.id}: event-exclusive acquisition required`);
    reject(char.origin.includes('gacha') && (char.origin.includes('recruit') || char.origin.includes('initial')), `characters/${char.id}: gacha-exclusive character has another route`);
    reject(!char.published && char.origin.includes('initial'), `characters/${char.id}: unpublished initial acquisition`);
    reject(char.skillIds.length !== 2 || new Set(char.skillIds).size !== 2, `characters/${char.id}: exactly two distinct skills required`);
    const selected = char.skillIds.map(id => content.skills.find(skill => skill.id === id));
    for (const id of char.skillIds) reject(!skillIds.has(id), `characters/${char.id}: missing skill ${id}`);
    const known = selected.filter((skill): skill is NonNullable<typeof skill> => Boolean(skill));
    reject(known.some(skill => Math.abs(skill.strength - char.strength) > 2), `characters/${char.id}: skill outside strength band`);
    reject(known.reduce((sum, skill) => sum + skill.strength, 0) > char.strength * 2, `characters/${char.id}: skill budget exceeded`);
    reject(new Set(known.map(skill => skill.template)).size !== known.length, `characters/${char.id}: repeated effect template`);
    if (roles.has(char.role)) {
      reject(!known.some(skill => skill.template === required[char.role]), `characters/${char.id}: role required skill missing`);
      const allowed: SkillTemplate[] = char.role === 'attacker' || char.role === 'area_attacker' ? ['attack', 'area'] : [required[char.role], 'attack', 'area'];
      reject(known.some(skill => !allowed.includes(skill.template)), `characters/${char.id}: unreachable second skill`);
    }
  }
  const eventIds = allIds(content.events ?? [], 'events');
  for (const event of content.events ?? []) {
    const normal = content.characters.find(char => char.id === event.normalId);
    const awakened = content.characters.find(char => char.id === event.awakenedId);
    reject(!plain(event.name) || !plain(event.subtitle), `events/${event.id}: plain text required`);
    reject(!normal || !awakened || normal.id === awakened.id || normal.familyId !== event.familyId || awakened.familyId !== event.familyId, `events/${event.id}: distinct forms with one family required`);
    reject(!normal?.origin.includes('event') || !awakened?.origin.includes('event') || Boolean(normal?.motionId) || !awakened?.motionId, `events/${event.id}: still normal and animated awakened event forms required`);
    reject(content.characters.some(char => char.speciesId === event.materialSpeciesId), `events/${event.id}: currency species cannot drop from ordinary enemies`);
    reject(!speciesIds.has(event.materialSpeciesId) || event.fragment.id !== `${event.materialSpeciesId}:rare` || event.core.id !== `${event.materialSpeciesId}:epic`, `events/${event.id}: isolated event materials required`);
    reject(event.normalCost.materialId !== event.fragment.id || event.awakenedCost.materialId !== event.core.id || !Number.isSafeInteger(event.normalCost.count) || event.normalCost.count < 1 || !Number.isSafeInteger(event.awakenedCost.count) || event.awakenedCost.count < 1, `events/${event.id}: valid exchange costs required`);
    reject(event.dungeonIds.length !== 5 || new Set(event.dungeonIds).size !== 5, `events/${event.id}: five distinct difficulties required`);
    event.dungeonIds.forEach((id, index) => {
      const stage = content.dungeons.find(dungeon => dungeon.id === id);
      const top = index === event.dungeonIds.length - 1;
      reject(!stage || stage.eventId !== event.id || stage.published !== event.published, `events/${event.id}: missing or inconsistent difficulty ${id}`);
      if (!stage) return;
      reject(stage.waves.at(-1)?.[0]?.characterId !== (top ? event.awakenedId : event.normalId), `events/${event.id}: incorrect boss form`);
      reject(stage.eventReward?.materialId !== (top ? event.core.id : event.fragment.id), `events/${event.id}: awakened material must be exclusive to highest difficulty`);
      reject(top ? stage.requiresOwnedId !== event.normalId : Boolean(stage.requiresOwnedId), `events/${event.id}: invalid ownership unlock`);
      reject(stage.previousDungeonId !== (index === 0 ? event.entryDungeonId : event.dungeonIds[index - 1]), `events/${event.id}: invalid difficulty progression`);
    });
  }
  for (const dungeon of content.dungeons) {
    reject(dungeon.kind !== undefined && !['normal', 'event'].includes(dungeon.kind), `dungeons/${dungeon.id}: invalid kind`);
    if (dungeon.eventId) reject(dungeon.kind !== 'event', `dungeons/${dungeon.id}: boss event must have event kind`);
    if (dungeon.eventId) reject(!eventIds.has(dungeon.eventId) || !content.events?.some(event => event.id === dungeon.eventId && event.dungeonIds.includes(dungeon.id)), `dungeons/${dungeon.id}: unknown event`);
    if (dungeon.bossScale) reject(!dungeon.eventId || !Number.isSafeInteger(dungeon.bossScale.hp) || dungeon.bossScale.hp < 100 || dungeon.bossScale.hp > 2000 || !Number.isSafeInteger(dungeon.bossScale.attack) || dungeon.bossScale.attack < 25 || dungeon.bossScale.attack > 300, `dungeons/${dungeon.id}: invalid event boss scale`);
    if (dungeon.eventReward) reject(!dungeon.eventId || !Number.isSafeInteger(dungeon.eventReward.count) || dungeon.eventReward.count < 1, `dungeons/${dungeon.id}: invalid event reward`);
    if (dungeon.previousDungeonId) reject(!content.dungeons.some(item => item.id === dungeon.previousDungeonId && item.id !== dungeon.id), `dungeons/${dungeon.id}: missing unlock dungeon`);
    reject(!plain(dungeon.name) || !plain(dungeon.subtitle) || !plain(dungeon.description), `dungeons/${dungeon.id}: plain text required`);
    reject(!assetIds.has(dungeon.artId), `dungeons/${dungeon.id}: missing background`);
    reject(!dungeon.waves.length, `dungeons/${dungeon.id}: empty waves`);
    dungeon.waves.forEach((wave, index) => {
      reject(wave.length < 1 || wave.length > 4, `dungeons/${dungeon.id}/${index}: wave size must be 1..4`);
      for (const enemy of wave) {
        const char = content.characters.find(item => item.id === enemy.characterId);
        reject(!characterIds.has(enemy.characterId), `dungeons/${dungeon.id}: missing enemy ${enemy.characterId}`);
        if (dungeon.published && char) reject(!char.published || !(char.origin.includes('recruit') || (char.origin.includes('event') && content.events?.some(event => event.id === dungeon.eventId && [event.normalId, event.awakenedId].includes(char.id)))), `dungeons/${dungeon.id}: unavailable enemy ${enemy.characterId}`);
        if (dungeon.published && char) reject(!char.encounterArtId, `dungeons/${dungeon.id}: missing encounter scene for ${char.id}`);
        reject(Boolean(enemy.boss) && index !== dungeon.waves.length - 1, `dungeons/${dungeon.id}: boss before final wave`);
      }
    });
    const finalWave = dungeon.waves.at(-1);
    reject(!finalWave || finalWave.length !== 1 || !finalWave[0].boss, `dungeons/${dungeon.id}: final wave must contain one boss`);
  }
  const initial = content.characters.filter(char => char.published && char.origin.includes('initial'));
  reject(initial.length !== 4 || !['healer', 'tank', 'attacker', 'area_attacker'].every(role => initial.some(char => char.role === role)), 'initial party: required four roles missing');
  const gacha = content.characters.filter(char => char.published && char.origin.includes('gacha'));
  reject(!gacha.some(char => char.rarity === 'R') || !gacha.some(char => char.rarity === 'SR') || gacha.filter(char => char.rarity === 'SSR').length < 2, 'gacha: R, SR and two SSR definitions required');
  return errors;
}
