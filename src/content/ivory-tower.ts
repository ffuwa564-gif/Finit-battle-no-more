import type { DungeonDef, EnemyDef } from '../domain/types';
import { ivoryTowerId } from '../domain/ivory-tower';

const strata = [
  ['白亜の門', 'pale-wolf', 'moon-moth'],
  ['巡礼の階段', 'hollow-keeper', 'veil-priestess'],
  ['荊の回廊', 'thorn-witch', 'pale-wolf'],
  ['月蝕の庭', 'moon-moth', 'veil-priestess'],
  ['石燐の祭壇', 'stone-drake', 'thorn-witch'],
  ['祈りの牢', 'veil-priestess', 'hollow-keeper'],
  ['沈黙の尖塔', 'hollow-keeper', 'moon-moth'],
  ['白夜の裁定', 'stone-drake', 'veil-priestess'],
  ['灰月の玉座', 'thorn-witch', 'hollow-keeper'],
  ['天蓋の終端', 'hollow-keeper', 'veil-priestess'],
] as const;

export const IVORY_TOWER_CURVE = {
  hpBase: 4, hpGrowthDivisor: 80,
  attackBase: 1.05, attackGrowthDivisor: 60,
  defensePerFloor: .005,
} as const;

/** HP is bounded for a 40-round encounter; attack keeps deep floors dangerous. */
export function towerEnemyScale(floor: number): NonNullable<DungeonDef['enemyScale']> {
  const step = floor - 1;
  return {
    hp: Number((IVORY_TOWER_CURVE.hpBase * Math.exp(step / IVORY_TOWER_CURVE.hpGrowthDivisor)).toFixed(4)),
    attack: Number((IVORY_TOWER_CURVE.attackBase * Math.exp(step / IVORY_TOWER_CURVE.attackGrowthDivisor)).toFixed(4)),
    defense: Number((1 + step * IVORY_TOWER_CURVE.defensePerFloor).toFixed(4)),
  };
}

export const ivoryTowerDungeons: DungeonDef[] = Array.from({ length: 100 }, (_, index) => {
  const floor = index + 1, stratum = strata[Math.floor(index / 10)];
  const milestone = floor % 10 === 0;
  const main = floor % 3 === 1 && !milestone ? 'pale-wolf' : floor % 3 === 2 && !milestone ? 'stone-drake' : stratum[1];
  const escorts = floor < 5 ? [] : floor >= 40 || milestone ? [stratum[2], floor % 2 ? 'moon-moth' : 'thorn-witch'] : [stratum[2]];
  const final: EnemyDef[] = [{ characterId: main, boss: true }, ...escorts.map(characterId => ({ characterId }))];
  const pressure = floor >= 10 && floor % 5 === 0;
  return {
    id: ivoryTowerId(floor), towerFloor: floor, kind: 'normal', published: true,
    name: `白亜の塔・第${floor}層`, subtitle: stratum[0], artId: 'cathedral',
    description: milestone ? '節目の守護者。護衛を見極め、予告された大技を崩すか守り抜こう。各Wave40ラウンド以内に突破し、記憶石を磨いて次の層へ。' : '白亜の塔の一層に挑む。各Wave40ラウンド以内に突破し、記憶石を磨いてより深い層を解放しよう。',
    previousDungeonId: floor === 1 ? 'silent-cathedral' : ivoryTowerId(floor - 1),
    enemyScale: towerEnemyScale(floor),
    waves: milestone && floor >= 30 ? [[{ characterId: 'moon-moth' }, { characterId: 'thorn-witch' }], final] : [final],
    ...(pressure ? { bossStrike: { every: 3, power: 190 + Math.floor(floor / 10) * 3, name: '白亜の断罪', target: 'pilot' as const, windup: { breakPercent: floor < 30 ? 8 : 4, weakenedPower: 65, recoveryPercent: 50 } } } : {}),
    bossDialogue: { intro: 'ここから先へ、何を携えてゆく。', threshold: 'まだ、白亜の夜は深い。', defeat: 'その記憶が、次の扉を開く。' },
  };
});
