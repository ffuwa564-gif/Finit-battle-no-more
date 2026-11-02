import { gainUltimate } from './ultimates';
import type { Battle, SkillTemplate, Unit } from './types';

export interface CharacterRescueDefinition { id: string; name: string; description: string }

/** Named personal talents, never a hidden rarity/score-based balance switch. */
export const characterRescues: readonly CharacterRescueDefinition[] = [
  ...['veil-priestess', 'hebe-standard', 'flora-standard'].map(id => ({
    id, name: '祈りの後押し',
    description: '本人の通常の単体・二人回復後、対象の最大HPの10%（上限35）を追加回復。石・必殺・再生・薬では発動しない。',
  })),
  { id: 'noelle', name: '星図の露出', description: '本人の通常全体技を2体以上へ当てると、生き残った敵へ強さ30の防御低下を次ラウンド終了まで付与。既存の強い弱体は下げない。石・必殺は対象外。' },
  { id: 'tikka', name: '故障診断', description: '本人の通常の封印で敵の再使用を実際に延ばすと、自分の必殺ゲージを8充填。1行動1回、上限100。ボス大技・ビットを封印する効果ではない。' },
  { id: 'lucielle', name: '銀灯の保護', description: '本人の通常の攻撃強化で、既存のより強い・同じ強さの強化の値と長い残り時間を維持する。追加の充填や無限延長はしない。' },
];

export function characterRescueDefinition(id: string): CharacterRescueDefinition | undefined {
  return characterRescues.find(talent => talent.id === id);
}

export interface RescueAction {
  ordinary: boolean;
  template: SkillTemplate;
  targetIds: readonly string[];
}

/** Apply once to a real ordinary action, before its single replay snapshot is emitted. */
export function applyCharacterRescue(battle: Battle, actor: Unit, before: readonly Unit[], action: RescueAction): { amount: number; note?: string } {
  if (!action.ordinary || actor.side !== 'party' || actor.hp <= 0) return { amount: 0 };
  const talent = characterRescueDefinition(actor.characterId);
  if (!talent) return { amount: 0 };
  const targets = action.targetIds.flatMap(id => battle.units.filter(unit => unit.uid === id && unit.hp > 0));
  if (['veil-priestess', 'hebe-standard', 'flora-standard'].includes(actor.characterId) && ['heal', 'mend_pair'].includes(action.template)) {
    let amount = 0;
    for (const target of targets.filter(unit => unit.side === actor.side)) {
      const healed = Math.min(target.maxHp - target.hp, 35, Math.floor(target.maxHp * .1));
      target.hp += healed; amount += healed;
    }
    return { amount, note: amount > 0 ? talent.name : undefined };
  }
  if (actor.characterId === 'noelle' && action.template === 'area' && action.targetIds.length >= 2) {
    let changed = false;
    for (const target of targets.filter(unit => unit.side !== actor.side)) {
      const active = (target.debuffUntil ?? -1) >= battle.round;
      if (active && (target.debuffStrength ?? 10) >= 30) continue;
      target.debuffStrength = 30; target.debuffUntil = Math.max(target.debuffUntil ?? 0, battle.round + 1); changed = true;
    }
    return { amount: 0, note: changed ? talent.name : undefined };
  }
  if (actor.characterId === 'tikka' && action.template === 'jam') {
    const extended = targets.some(target => {
      const old = before.find(unit => unit.uid === target.uid);
      return target.side !== actor.side && old && Object.entries(target.cooldowns).some(([id, until]) => until > (old.cooldowns[id] ?? 0));
    });
    if (extended) { const old = actor.ultimateCharge ?? 0; gainUltimate(actor, 8); return { amount: 0, note: (actor.ultimateCharge ?? 0) > old ? talent.name : undefined }; }
  }
  if (actor.characterId === 'lucielle' && action.template === 'buff') {
    let preserved = false;
    for (const target of targets.filter(unit => unit.side === actor.side)) {
      const old = before.find(unit => unit.uid === target.uid);
      if (!old || (old.buffUntil ?? -1) < battle.round || (old.buffStrength ?? 10) < (target.buffStrength ?? 10)) continue;
      preserved ||= (old.buffStrength ?? 10) > (target.buffStrength ?? 10) || (old.buffUntil ?? -1) > (target.buffUntil ?? -1);
      target.buffStrength = old.buffStrength ?? 10; target.buffUntil = Math.max(old.buffUntil ?? 0, target.buffUntil ?? 0);
    }
    return { amount: 0, note: preserved ? talent.name : undefined };
  }
  return { amount: 0 };
}
