import { characterRarities } from '../domain/xr-gacha';
import { gachaCollections, gachaPoolIds, sharedGoddessIds, sharedSSRIds } from './gacha';
import { skillTemplates } from '../domain/skill-info';
import type { Content, Role, SkillTemplate } from '../domain/types';

const required: Record<Role, SkillTemplate> = { healer: 'heal', tank: 'guard', attacker: 'attack', area_attacker: 'area', supporter: 'buff', debuffer: 'debuff' };
const profiles = new Set(['default', 'attack', 'area', 'heal', 'guard', 'buff', 'debuff', 'drop']);
const templates = new Set<string>(skillTemplates);
const leaderStats = new Set(['hp', 'attack', 'defense']);
const roles = new Set(Object.keys(required));
const plain = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && !/<\/?[a-z!][^>]*>/i.test(value);
const strengthValid = (value: number, maximum = 40, minimum = 10) => Number.isInteger(value) && value >= minimum && value <= maximum;

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
    if (asset.kind === 'video') {
      const poster = content.assets.find(item => item.id === asset.posterId);
      reject(!poster || poster.kind === 'video' || !poster.path.endsWith('.png'), `assets/${asset.id}: lossless video poster required`);
      reject(Boolean(poster && (poster.width !== asset.width || poster.height !== asset.height)), `assets/${asset.id}: video/poster dimensions must match`);
    } else reject(asset.posterId !== undefined, `assets/${asset.id}: only videos may declare posterId`);

  }
  allIds(content.novels ?? [], 'novels');
  const novelTriggers = new Set<string>();
  for (const scene of content.novels ?? []) {
    reject(!plain(scene.title) || !Array.isArray(scene.pages) || !scene.pages.length || scene.pages.length > 200, `novels/${scene.id}: title and 1..200 pages required`);
    const trigger = scene.trigger.kind === 'opening' ? 'opening' : scene.trigger.kind === 'dungeon-clear' ? scene.trigger.dungeonId : '';
    reject(!trigger || novelTriggers.has(trigger), `novels/${scene.id}: unique trigger required`); novelTriggers.add(trigger);
    if (scene.trigger.kind === 'dungeon-clear') { const stageId = scene.trigger.dungeonId; reject(!content.dungeons.some(stage => stage.id === stageId && stage.published && stage.chapterId && (stage.kind ?? 'normal') === 'normal'), `novels/${scene.id}: published normal chapter stage required`); }
    for (const page of scene.pages) {
      reject(!plain(page.text) || (page.speaker !== undefined && !plain(page.speaker)), `novels/${scene.id}: plain page text required`);
      reject(!content.assets.some(asset => asset.id === page.backgroundId && ['background', 'illustration'].includes(asset.kind)), `novels/${scene.id}: background required`);
      reject(page.shade !== undefined && !['dark', 'black'].includes(page.shade), `novels/${scene.id}: invalid shade`);
    }
  }
  const semanticKeys = new Set<string>();
  for (const skill of content.skills) {
    reject(!plain(skill.name), `skills/${skill.id}: plain name required`);
    reject(!templates.has(skill.template), `skills/${skill.id}: unknown template`);
    reject(!strengthValid(skill.strength), `skills/${skill.id}: integer strength 10..40 required`);
    reject(!profiles.has(skill.soundProfile), `skills/${skill.id}: unknown sound profile`);
    const key = `${skill.template}:${skill.strength}`;
    reject(semanticKeys.has(key), `skills/${skill.id}: duplicate semantic key ${key}`);
    semanticKeys.add(key);
    reject(Object.keys(skill).some(key => !['id', 'name', 'template', 'strength', 'soundProfile'].includes(key)), `skills/${skill.id}: derived effect overrides are forbidden`);
  }
  for (const char of content.characters) {
    if (char.encounterLoot) {
      const loot = char.encounterLoot;
      reject(!char.origin.includes('recruit') || !Number.isSafeInteger(loot.gold) || loot.gold < 0 || loot.gold > 10000 || !loot.guaranteed.length || loot.guaranteed.length > 3, `characters/${char.id}: invalid encounter loot`);
      reject(new Set(loot.guaranteed.map(item => item.materialId)).size !== loot.guaranteed.length || loot.guaranteed.some(item => !['common', 'rare', 'epic'].some(rarity => item.materialId === `${char.speciesId}:${rarity}`) || !Number.isSafeInteger(item.count) || item.count < 1 || item.count > 999), `characters/${char.id}: invalid encounter material`);
    }

    if (char.portraitMotionId) reject(!char.motionId || !content.assets.some(asset => asset.id === char.portraitMotionId && asset.kind === 'video'), `characters/${char.id}: portrait motion must reference a video and full animation`);
    if (char.motionId) reject(!content.assets.some(asset => asset.id === char.motionId && asset.kind === 'video'), `characters/${char.id}: motion must reference a video asset`);
    reject(!plain(char.name) || !plain(char.epithet) || !plain(char.flavor), `characters/${char.id}: plain name, epithet and flavor required`);
    if (char.dialogue) for (const [event, text] of Object.entries(char.dialogue)) reject(!['intro', 'threshold', 'defeat'].includes(event) || !plain(text), `characters/${char.id}: plain boss dialogue required`);
    if (char.dialogue) reject(!['intro', 'threshold', 'defeat'].every(event => plain(char.dialogue?.[event as keyof NonNullable<typeof char.dialogue>])), `characters/${char.id}: complete boss dialogue required`);
    reject(!roles.has(char.role), `characters/${char.id}: unknown role`);
    reject(char.leaderEffect !== undefined && !['acceleration', 'regeneration', 'finisher', 'lifesteal', 'bulwark', 'resonance'].includes(char.leaderEffect), `characters/${char.id}: invalid leader effect`);
    reject(!leaderStats.has(char.leaderStat), `characters/${char.id}: invalid leader stat`);
    reject(!strengthValid(char.strength, char.rarity === 'XR' ? 40 : 30, char.rarity === 'XR' ? 31 : 10), `characters/${char.id}: ${char.rarity === 'XR' ? 'XR strength 31..40 required' : 'integer strength 10..30 required'}`);
    reject(typeof char.published !== 'boolean', `characters/${char.id}: publication state required`);
    reject(!speciesIds.has(char.speciesId), `characters/${char.id}: missing species ${char.speciesId}`);
    reject(!assetIds.has(char.artId) || !assetIds.has(char.portraitId), `characters/${char.id}: missing art/portrait asset`);
    reject(content.assets.find(asset => asset.id === char.artId)?.kind !== 'illustration' || content.assets.find(asset => asset.id === char.portraitId)?.kind !== 'portrait', `characters/${char.id}: incorrect image kinds`);
    if (char.encounterArtId !== undefined) reject(!assetIds.has(char.encounterArtId) || content.assets.find(asset => asset.id === char.encounterArtId)?.kind !== 'background', `characters/${char.id}: invalid encounter scene`);
    reject(!profiles.has(char.soundProfile), `characters/${char.id}: unknown sound profile`);
    reject(!characterRarities.includes(char.rarity), `characters/${char.id}: invalid rarity`);
    reject(char.rarity === 'XR' && (char.origin.length !== 1 || !char.origin.includes('xr_gacha')), `characters/${char.id}: XR must be exclusive to premium summons`);
    reject(!Array.isArray(char.origin) || char.origin.length === 0 || char.origin.some(origin => !['initial', 'recruit', 'gacha', 'event', 'awakening', 'gold_exchange', 'trial', 'xr_gacha'].includes(origin)) || new Set(char.origin).size !== char.origin.length, `characters/${char.id}: valid acquisition routes required`);
    reject(char.origin.includes('awakening') && (char.origin.length !== 1 || !content.awakenings?.some(def => def.awakenedId === char.id)), `characters/${char.id}: awakening-exclusive form required`);
    reject(char.origin.includes('trial') && (char.origin.length !== 1 || char.rarity !== 'SSR' || !content.dungeons.some(stage => stage.kind === 'trial' && stage.waves.some(wave => wave.some(enemy => enemy.characterId === char.id)))), `characters/${char.id}: exclusive trial boss required`);
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
      const allowed: SkillTemplate[] = [required[char.role], 'overclock', 'barrier_mend', 'jam', 'rally', 'attack', 'area', 'pierce', 'drain', 'regen', 'barrier', 'cleanse', 'mend_pair', 'shatter', 'dispel', 'dawn', 'confusion', 'sleep', 'paralysis', 'charm'];
      reject(known.some(skill => !allowed.includes(skill.template)), `characters/${char.id}: unreachable second skill`);
    }
  }
  allIds(content.goldExchanges ?? [], 'goldExchanges');
  const exchangeCharacters = new Set<string>();
  for (const offer of content.goldExchanges ?? []) {
    const char = content.characters.find(item => item.id === offer.characterId);
    reject(typeof offer.published !== 'boolean' || !Number.isSafeInteger(offer.goldCost) || offer.goldCost <= 0, `goldExchanges/${offer.id}: positive safe integer gold cost and publication required`);
    reject(!char || char.origin.length !== 1 || !char.origin.includes('gold_exchange') || char.rarity !== 'SSR' || (offer.published && !char.published), `goldExchanges/${offer.id}: exclusive SSR character required`);
    reject(exchangeCharacters.has(offer.characterId), `goldExchanges/${offer.id}: duplicate exchange character`);
    exchangeCharacters.add(offer.characterId);
  }
  for (const char of content.characters.filter(item => item.origin.includes('gold_exchange'))) {
    reject(char.origin.length !== 1 || !content.goldExchanges?.some(offer => offer.characterId === char.id && (!char.published || offer.published)), `characters/${char.id}: gold-exclusive exchange required`);
  }
  const eventIds = allIds(content.events ?? [], 'events');
  for (const event of content.events ?? []) {
    for (const label of [event.normalLabel, event.recruitLabel, event.awakenLabel, event.ruleDescription]) reject(label !== undefined && !plain(label), `events/${event.id}: plain presentation text required`);
    const normal = content.characters.find(char => char.id === event.normalId);
    const awakened = content.characters.find(char => char.id === event.awakenedId);
    reject(!plain(event.name) || !plain(event.subtitle), `events/${event.id}: plain text required`);
    reject(!normal || !awakened || normal.id === awakened.id || normal.familyId !== event.familyId || awakened.familyId !== event.familyId, `events/${event.id}: distinct forms with one family required`);
    reject(!normal?.origin.includes('event') || !awakened?.origin.includes('event'), `events/${event.id}: event-exclusive forms required`);
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
  const chapters = content.chapters ?? [];
  const chapterIds = allIds(chapters, 'chapters');
  const campaignStages = new Set<string>();
  const chapterStages = chapters.flatMap(chapter => chapter.dungeonIds);
  for (const [index, chapter] of chapters.entries()) {
    reject(chapter.number !== index + 1 || !plain(chapter.title) || !plain(chapter.subtitle) || !plain(chapter.bossHint) || chapter.dungeonIds.length < 2, `chapters/${chapter.id}: ordered number, text and stages required`);
    for (const id of chapter.dungeonIds) {
      const stage = content.dungeons.find(item => item.id === id);
      reject(campaignStages.has(id) || !stage?.published || stage.chapterId !== chapter.id || (stage.kind ?? 'normal') !== 'normal', `chapters/${chapter.id}: unique published campaign stage required`);
      campaignStages.add(id);
      const at = chapterStages.indexOf(id);
      reject(stage?.previousDungeonId !== (at > 0 ? chapterStages[at - 1] : undefined), `chapters/${chapter.id}: sequential route required`);
    }
    const finale = content.dungeons.find(stage => stage.id === chapter.dungeonIds.at(-1));
    reject(!finale?.bossScale || !finale.waves.at(-1)?.[0]?.boss, `chapters/${chapter.id}: scaled finale boss required`);
  }
  for (const dungeon of content.dungeons) {
    if (dungeon.tacticalCommands !== undefined) reject(dungeon.tacticalCommands !== true || dungeon.kind !== 'trial' || (!dungeon.bossStrike && !dungeon.bossClock), `dungeons/${dungeon.id}: tactical commands require a telegraphed trial`);
    if (dungeon.chapterId) reject(!chapterIds.has(dungeon.chapterId) || !campaignStages.has(dungeon.id), `dungeons/${dungeon.id}: unknown chapter`);
    reject(dungeon.kind !== undefined && !['normal', 'event', 'trial'].includes(dungeon.kind), `dungeons/${dungeon.id}: invalid kind`);
    if (dungeon.kind === 'trial') {
      reject(Boolean(dungeon.eventId || dungeon.eventReward || dungeon.bossLoot || dungeon.rareEncounter || dungeon.bossBits || dungeon.storyId), `dungeons/${dungeon.id}: trials cannot carry loot or special encounters`);
      reject(dungeon.waves.length < (dungeon.bossClock ? 1 : 2) || dungeon.waves.some(wave => wave.length !== 1 || !wave[0]?.boss || !content.characters.some(char => char.id === wave[0]!.characterId && char.published && (char.origin.includes('gacha') || char.origin.includes('trial')) && char.rarity === 'SSR')), `dungeons/${dungeon.id}: trials require sequential SSR goddess bosses`);
    }
    if (dungeon.eventId) reject(dungeon.kind !== 'event', `dungeons/${dungeon.id}: boss event must have event kind`);
    if (dungeon.eventId) reject(!eventIds.has(dungeon.eventId) || !content.events?.some(event => event.id === dungeon.eventId && event.dungeonIds.includes(dungeon.id)), `dungeons/${dungeon.id}: unknown event`);
    if (dungeon.bossScale) reject((!dungeon.eventId && !dungeon.storyId && !dungeon.chapterId && dungeon.kind !== 'trial') || !Number.isSafeInteger(dungeon.bossScale.hp) || dungeon.bossScale.hp < 100 || dungeon.bossScale.hp > (dungeon.kind === 'trial' ? 10000 : 2000) || !Number.isSafeInteger(dungeon.bossScale.attack) || dungeon.bossScale.attack < 25 || dungeon.bossScale.attack > (dungeon.kind === 'trial' ? 1000 : 300), `dungeons/${dungeon.id}: invalid event boss scale`);
    if (dungeon.bossStrike) { const strike = dungeon.bossStrike; reject(!(dungeon.kind === 'trial' && dungeon.tacticalCommands === true) && (!dungeon.chapterId || !chapters.some(chapter => chapter.id === dungeon.chapterId && chapter.dungeonIds.at(-1) === dungeon.id)) || !Number.isSafeInteger(strike.every) || strike.every < 2 || strike.every > 5 || !Number.isSafeInteger(strike.power) || strike.power < 120 || strike.power > 300 || !plain(strike.name), `dungeons/${dungeon.id}: invalid chapter boss strike`); }
    if (dungeon.bossClock) {
      const clock = dungeon.bossClock;
      reject(dungeon.kind !== 'trial' || dungeon.waves.length !== 1 || Boolean(dungeon.bossBits || dungeon.bossStrike) || ![clock.shield, clock.brokenDefensePercent, clock.deadline, clock.finalePower].every(Number.isSafeInteger) || clock.shield < 1 || clock.shield > 10000 || clock.brokenDefensePercent < 1 || clock.brokenDefensePercent > 99 || clock.deadline < 5 || clock.deadline > 40 || clock.finalePower < 1000 || clock.finalePower > 100000 || !plain(clock.shieldName) || !plain(clock.finaleName), `dungeons/${dungeon.id}: invalid boss clock`);
    }
    if (dungeon.bossBits) {
      const bits = dungeon.bossBits;
      reject(!dungeon.eventId || ![bits.every, bits.count, bits.duration, bits.power].every(Number.isSafeInteger) || bits.every < 2 || bits.every > 6 || bits.count < 1 || bits.count > 4 || bits.duration < 1 || bits.duration >= bits.every || bits.power < 20 || bits.power > 80, `dungeons/${dungeon.id}: invalid boss bit pattern`);
    }
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
        if (dungeon.published && char) reject(!char.published || !((dungeon.kind === 'trial' && char.rarity === 'SSR' && (char.origin.includes('gacha') || char.origin.includes('trial'))) || char.origin.includes('recruit') || (char.origin.includes('awakening') && Boolean(dungeon.storyId) && Boolean(content.awakenings?.some(def => def.awakenedId === char.id))) || (char.origin.includes('event') && content.events?.some(event => event.id === dungeon.eventId && [event.normalId, event.awakenedId].includes(char.id)))), `dungeons/${dungeon.id}: unavailable enemy ${enemy.characterId}`);
        if (dungeon.published && char) reject(!char.encounterArtId && dungeon.kind !== 'trial', `dungeons/${dungeon.id}: missing encounter scene for ${char.id}`);
        reject(Boolean(enemy.boss) && dungeon.kind !== 'trial' && index !== dungeon.waves.length - 1, `dungeons/${dungeon.id}: boss before final wave`);
      }
    });
    if (dungeon.rareEncounter) {
      const encounter = dungeon.rareEncounter;
      reject(dungeon.kind === 'event' || dungeon.kind === 'trial' || dungeon.waves.length < 2 || dungeon.waves[dungeon.waves.length - 2]?.some(enemy => enemy.boss) === true, `dungeons/${dungeon.id}: rare encounter requires an ordinary non-boss wave`);
      reject(!Number.isFinite(encounter.chance) || encounter.chance <= 0 || encounter.chance > 100 || !encounter.characterIds.length || encounter.characterIds.length > 8 || new Set(encounter.characterIds).size !== encounter.characterIds.length, `dungeons/${dungeon.id}: invalid rare encounter probability or pool`);
      for (const id of encounter.characterIds) {
        const char = content.characters.find(item => item.id === id);
        reject(!char || !char.published || !char.origin.includes('recruit') || !char.encounterArtId || !char.encounterLoot, `dungeons/${dungeon.id}: unavailable rare enemy ${id}`);
      }
    }
    const finalWave = dungeon.waves.at(-1);
    reject(!finalWave || finalWave.length !== 1 || !finalWave[0].boss, `dungeons/${dungeon.id}: final wave must contain one boss`);
  }
  allIds(content.awakenings ?? [], 'awakenings');
  const awakeningForms = new Set<string>();
  const awakeningBases = new Set<string>();
  const validCost = (cost: { materialId: string; count: number }) => Boolean(content.materials?.some(item => item.id === cost.materialId)) && Number.isSafeInteger(cost.count) && cost.count > 0;
  for (const def of content.awakenings ?? []) {
    const base = content.characters.find(char => char.id === def.baseId);
    const form = content.characters.find(char => char.id === def.awakenedId);
    reject(!base || !form || base.id === form.id || !base.familyId || base.familyId !== form.familyId || !form.origin.includes('awakening') || base.origin.includes('awakening'), `awakenings/${def.id}: distinct base and exclusive form with one family required`);
    reject(awakeningBases.has(def.baseId) || !base?.published || !form?.published, `awakenings/${def.id}: unique published base and form required`); awakeningBases.add(def.baseId);
    reject(awakeningForms.has(def.awakenedId), `awakenings/${def.id}: duplicate form`); awakeningForms.add(def.awakenedId);
    reject(!validCost(def.cost), `awakenings/${def.id}: invalid isolated material cost`);
    reject(new Set(def.requiredOwnedIds).size !== def.requiredOwnedIds.length || def.requiredOwnedIds.some(id => !content.awakenings?.some(item => item.awakenedId === id) || id === def.awakenedId), `awakenings/${def.id}: invalid prerequisite forms`);
    reject(new Set(def.requiredDungeonIds).size !== def.requiredDungeonIds.length || def.requiredDungeonIds.some(id => !content.dungeons.some(stage => stage.id === id && stage.published)), `awakenings/${def.id}: missing prerequisite dungeon`);
  }
  const visit = (id: string, path: Set<string>): boolean => {
    if (path.has(id)) return true;
    const def = content.awakenings?.find(item => item.awakenedId === id);
    return Boolean(def?.requiredOwnedIds.some(next => visit(next, new Set([...path, id]))));
  };
  for (const def of content.awakenings ?? []) reject(visit(def.awakenedId, new Set()), `awakenings/${def.id}: circular prerequisites`);
  const materialIds = new Set<string>();
  for (const item of content.materials ?? []) {
    reject(materialIds.has(item.id) || !/^[a-z0-9-]+:(common|rare|epic)$/.test(item.id) || !speciesIds.has(item.id.split(':')[0]!) || !plain(item.name), `materials/${item.id}: invalid named material`);
    const species = item.id.split(':')[0];
    const isolated = content.awakenings?.some(def => def.cost.materialId.split(':')[0] === species) || content.events?.some(event => event.materialSpeciesId === species);
    reject(Boolean(isolated) && content.characters.some(char => char.speciesId === species), `materials/${item.id}: isolated currency cannot drop from ordinary enemies`);
    materialIds.add(item.id);
  }
  allIds(content.storylines ?? [], 'storylines');
  for (const story of content.storylines ?? []) {
    reject(!plain(story.title) || !plain(story.subtitle) || !characterIds.has(story.protagonistId) || new Set(story.relatedIds).size !== story.relatedIds.length || story.relatedIds.some(id => !characterIds.has(id) || id === story.protagonistId), `storylines/${story.id}: invalid cast`);
    const final = content.awakenings?.find(def => def.baseId === story.protagonistId);
    const expected = story.relatedIds.map(id => content.awakenings?.find(def => def.baseId === id)?.awakenedId);
    reject(!final || expected.some(id => !id || !final.requiredOwnedIds.includes(id)) || final.requiredOwnedIds.length !== expected.length, `storylines/${story.id}: awakening cast must exactly match prerequisites`);
  }
  const memoryIds = new Set<string>();
  for (const memory of content.memories ?? []) {
    reject(!characterIds.has(memory.characterId) || memoryIds.has(memory.characterId) || !plain(memory.encounter) || !plain(memory.companion) || !plain(memory.awakened), `memories/${memory.characterId}: valid unique character and chapters required`); memoryIds.add(memory.characterId);
  }
  for (const stage of content.dungeons) {
    if (stage.bossDialogue) reject(!['intro', 'threshold', 'defeat'].every(phase => plain(stage.bossDialogue?.[phase as keyof NonNullable<typeof stage.bossDialogue>])), `dungeons/${stage.id}: complete plain boss dialogue required`);
    if (stage.narrative) reject(!plain(stage.narrative.before) || !plain(stage.narrative.after), `dungeons/${stage.id}: plain narrative before and after required`);
    if (stage.storyId) reject(!content.storylines?.some(story => story.id === stage.storyId) || stage.kind === 'event', `dungeons/${stage.id}: valid normal storyline required`);
    if (stage.requiresOwnedIds) reject(stage.requiresOwnedIds.some(id => !awakeningForms.has(id)), `dungeons/${stage.id}: invalid awakened ownership lock`);
    if (stage.bossLoot) {
      reject(!stage.storyId || !stage.bossLoot.guaranteed.length || stage.bossLoot.guaranteed.some(cost => !validCost(cost)), `dungeons/${stage.id}: invalid guaranteed boss loot`);
      if (stage.bossLoot.bonus) reject(!validCost(stage.bossLoot.bonus.reward) || !Number.isInteger(stage.bossLoot.bonus.chance) || stage.bossLoot.bonus.chance < 1 || stage.bossLoot.bonus.chance > 100, `dungeons/${stage.id}: invalid bonus boss loot`);
    }
  }
  const initial = content.characters.filter(char => char.published && char.origin.includes('initial'));
  reject(initial.length !== 4 || !['healer', 'tank', 'attacker', 'area_attacker'].every(role => initial.some(char => char.role === role)), 'initial party: required four roles missing');
  const premium = content.xrGacha;
  if (premium) {
    reject(!Number.isSafeInteger(premium.unlockChapter) || premium.unlockChapter !== 10 || !Number.isSafeInteger(premium.stoneCost) || premium.stoneCost < 1 || typeof premium.published !== 'boolean', 'xrGacha: invalid unlock or cost');
    reject(characterRarities.some(rarity => !Number.isFinite(premium.rates[rarity]) || premium.rates[rarity] < 0) || Math.abs(Object.values(premium.rates).reduce((sum, rate) => sum + rate, 0) - 100) > 1e-9 || premium.rates.XR <= 0 || premium.rates.XR > 0.1, 'xrGacha: valid rates and XR rate at most 0.1% required');
    reject(characterRarities.some(rarity => !Number.isSafeInteger(premium.duplicateRefund[rarity]) || premium.duplicateRefund[rarity] < 0 || premium.duplicateRefund[rarity] > Math.min(3, premium.stoneCost)), 'xrGacha: invalid premium refund');
    const pool = content.characters.filter(character => premium.characterIds.includes(character.id));
    reject(new Set(premium.characterIds).size !== premium.characterIds.length || pool.length !== premium.characterIds.length || pool.some(character => !character.origin.some(origin => origin === 'gacha' || origin === 'xr_gacha')), 'xrGacha: invalid character pool');
    if (premium.published) reject(characterRarities.some(rarity => premium.rates[rarity] > 0 && !pool.some(character => character.published && character.rarity === rarity)), 'xrGacha: all positive rates need published characters');
  }
  const gacha = content.characters.filter(char => char.published && char.origin.includes('gacha'));
  reject(sharedGoddessIds.some(id => !gacha.some(char => char.id === id && ['R', 'SR'].includes(char.rarity))), 'gacha/common: published R/SR base forms required');
  reject(sharedSSRIds.some(id => !gacha.some(char => char.id === id && char.rarity === 'SSR')), 'gacha/common: published common SSR forms required');
  for (const collection of gachaCollections) {
    const ids = gachaPoolIds(collection);
    const pool = gacha.filter(char => ids.includes(char.id));
    reject(new Set(ids).size !== ids.length || ids.some(id => !pool.some(char => char.id === id)), `gacha/${collection.id}: missing or duplicate character definition`);
    reject(Object.values(collection.rates).some(rate => !Number.isFinite(rate) || rate < 0) || Object.values(collection.rates).reduce((sum,rate) => sum + rate,0) !== 100, `gacha/${collection.id}: valid rates totaling 100 required`);
    reject((['R','SR','SSR'] as const).some(rarity => collection.rates[rarity] > 0 && !pool.some(char => char.rarity === rarity)), `gacha/${collection.id}: each positive rarity rate needs matching characters`);
    reject(pool.some(char => char.rarity === 'XR' || collection.rates[char.rarity] === 0), `gacha/${collection.id}: zero-rate rarity must not have characters`);
    reject(collection.featuredIds.length < 1 || new Set(collection.featuredIds).size !== collection.featuredIds.length || pool.filter(char => char.rarity === 'SSR').length !== collection.featuredIds.length + sharedSSRIds.length, `gacha/${collection.id}: featured and common SSR definitions required`);
    reject(!Number.isFinite(collection.featuredSSRShare) || collection.featuredSSRShare <= 0 || collection.featuredSSRShare >= 100 || collection.featuredIds.some(id => sharedSSRIds.includes(id)), `gacha/${collection.id}: invalid featured SSR share`);
    reject(collection.featuredIds.some(id => !pool.some(char => char.id === id && char.rarity === 'SSR')), `gacha/${collection.id}: featured SSR must belong to collection`);
  }
  return errors;
}
