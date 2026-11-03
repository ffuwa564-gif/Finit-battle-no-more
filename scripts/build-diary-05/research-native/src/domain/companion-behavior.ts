import { hasAilment } from './ailments';
import type { Battle, CharacterDef, Content, Role } from './types';

export type CompanionCue = 'watch' | 'weapon' | 'prayer' | 'uncertain';
export interface CompanionSignal { actorId: string; cue: CompanionCue; label: string }
/** These describe public role policies, never the privately committed command. */
const tendencies: Record<Role, string> = {
  healer: '傷の深い仲間の回復を優先する。余裕があれば攻撃に加わる。作戦や使える技によって判断は変わる。',
  tank: '仲間をかばい、守りが続いている間は攻撃に移る。誰を守るかは仲間の傷や技の状態で決める。',
  attacker: '弱った敵を狙い、ボスや堅い相手には貫通技を選びやすい。使える技と作戦によって一手は変わる。',
  area_attacker: '複数の敵が残っていれば範囲攻撃を選びやすい。回復や補助の技を持つ場合は仲間の状態も見る。',
  supporter: '仲間の強化や回復を優先し、必要がなければ攻撃に加わる。誰を支えるかは戦況と技で変わる。',
  debuffer: '敵の強化や状態を見て弱体・妨害を選ぶ。有効な妨害がなければ攻撃に加わる。',
};
export const companionTendency = (character: CharacterDef) => tendencies[character.role];

/** Broad body language: no skill IDs, targets, exact action categories or hidden-plan lookup. */
export function companionSignals(battle: Battle, content: Content): CompanionSignal[] {
  if (battle.phase !== 'ready') return [];
  const party = battle.units.filter(u => u.side === 'party' && u.hp > 0);
  const tension = party.some(u => u.hp / u.maxHp <= .6);
  return battle.partyIds.slice(1).flatMap(id => {
    const unit = party.find(u => u.characterId === id);
    const character = content.characters.find(c => c.id === id);
    if (!unit || !character) return [];
    const cue: CompanionCue = hasAilment(unit) ? 'uncertain' : character.role === 'healer' || character.role === 'supporter' ? tension ? 'prayer' : 'watch' : character.role === 'tank' || character.role === 'debuffer' ? 'watch' : 'weapon';
    const label = cue === 'uncertain' ? '動きが定まらない' : cue === 'prayer' ? '静かに息を整える' : cue === 'watch' ? '視線を巡らせる' : '武器に手を添える';
    return [{ actorId: unit.uid, cue, label }];
  });
}
