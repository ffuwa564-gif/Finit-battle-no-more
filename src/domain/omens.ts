import type { Battle, Content, WaveOmens } from './types';

export const omenChoices = [
  { id: 'bell', label: '音のない鈴に触れる', detail: '揺らしても鳴らない。指先だけが、かすかに震えた。' },
  { id: 'thread', label: 'ほどけた糸を結ぶ', detail: '誰のものでもない糸が、石畳の向こうへ続いている。' },
  { id: 'ash', label: '灰の中に名を書く', detail: '風は止んでいる。書いた名を読める者はいない。' },
  { id: 'mirror', label: '曇った鏡を裏返す', detail: 'そこに映っていた空は、今夜のものではなかった。' },
  { id: 'key', label: '鍵のない扉を叩く', detail: '返事の代わりに、遠くで足音がひとつ消えた。' },
  { id: 'feather', label: '白い羽根を置いていく', detail: '飛ぶもののいない回廊に、羽根だけが残っていた。' },
] as const;
export const omenRecipes = [
  { id: 'returning-voices', needs: ['bell', 'thread'], title: '帰り路の声', result: '鈴と糸が響き合い、生きている仲間のHPが最大値の25%回復した。', effect: 'heal' },
  { id: 'unseen-edge', needs: ['ash', 'mirror'], title: '映らない刃', result: '灰に残した名が鏡を渡る。この探索中、仲間の攻撃力が12%上がった。', effect: 'attack' },
  { id: 'winged-door', needs: ['key', 'feather'], title: '翼のある扉', result: '扉の向こうで羽音がした。この探索中、仲間の防御力が12%上がった。', effect: 'defense' },
  { id: 'forgotten-offering', needs: ['bell', 'mirror', 'key'], title: '忘れられた供物', result: '三つの痕跡が重なり、持ち帰る素材が見つかった。報酬確定まで仮取得。', effect: 'material' },
] as const;
export function offerOmens(battle: Battle, random: (seed: number) => { seed: number; value: number }): void {
  const pool: string[] = omenChoices.map(choice => choice.id);
  for (let index = pool.length - 1; index > 0; index--) {
    const roll = random(battle.seed); battle.seed = roll.seed;
    const selected = Math.floor(roll.value * (index + 1));
    [pool[index], pool[selected]] = [pool[selected]!, pool[index]!];
  }
  battle.omens!.pending = pool.slice(0, 3);
}
export function chooseOmen(battle: Battle, choiceId: string, content: Content): void {
  const state = battle.omens;
  if (!state?.pending?.includes(choiceId) || battle.phase !== 'playing' || battle.cursor !== battle.events.length || !['wave', 'reward'].includes(battle.nextPhase) || state.picks.length !== battle.wave) throw new Error('この痕跡は選べません。');
  state.picks.push(choiceId); delete state.pending;
  for (const recipe of omenRecipes) {
    if (state.activated.includes(recipe.id) || !recipe.needs.every(id => state.picks.includes(id))) continue;
    state.activated.push(recipe.id);
    for (const unit of battle.units.filter(unit => unit.side === 'party')) {
      if (recipe.effect === 'heal' && unit.hp > 0) unit.hp = Math.min(unit.maxHp, unit.hp + Math.max(1, Math.floor(unit.maxHp * .25)));
      if (recipe.effect === 'attack') unit.attack += Math.max(1, Math.floor(unit.attack * .12));
      if (recipe.effect === 'defense') unit.defense += Math.max(1, Math.floor(unit.defense * .12));
    }
    if (recipe.effect === 'material') {
      const stage = content.dungeons.find(stage => stage.id === battle.dungeonId)!;
      const enemyId = stage.waves[0]![0]!.characterId;
      const species = content.characters.find(character => character.id === enemyId)!.speciesId;
      const id = `${species}:common`;
      battle.pendingMaterials[id] = (battle.pendingMaterials[id] ?? 0) + 2;
    }
  }
}
/** Optional on legacy expeditions; new records are bounded to one choice per cleared wave. */
export function validOmens(value: unknown, battle: { wave: number; phase: string; nextPhase: string; cursor: number; events: unknown[] }): value is WaveOmens {
  if (!value || typeof value !== 'object') return false;
  const state = value as WaveOmens;
  const known = (id: unknown) => omenChoices.some(choice => choice.id === id);
  if (!Array.isArray(state.picks) || state.picks.length > battle.wave + 1 || !state.picks.every(known) || !Array.isArray(state.activated) || new Set(state.activated).size !== state.activated.length) return false;
  const expected = omenRecipes.filter(recipe => recipe.needs.every(id => state.picks.includes(id))).map(recipe => recipe.id);
  if (state.activated.length !== expected.length || !expected.every(id => state.activated.includes(id))) return false;
  if (state.pending !== undefined && (!Array.isArray(state.pending) || state.pending.length !== 3 || new Set(state.pending).size !== 3 || !state.pending.every(known) || state.picks.length !== battle.wave || battle.phase !== 'playing' || battle.cursor !== battle.events.length || !['wave', 'reward'].includes(battle.nextPhase))) return false;
  if (state.picks.length < battle.wave || (battle.phase === 'reward' && state.picks.length !== battle.wave + 1)) return false;
  return true;
}
