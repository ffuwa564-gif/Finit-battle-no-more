import type { CharacterDef, LeaderEffect, SkillDef, SkillTemplate } from './types';

export const skillTemplates: SkillTemplate[] = ['attack', 'area', 'heal', 'guard', 'buff', 'debuff', 'pierce', 'drain', 'regen', 'barrier', 'cleanse'];
export const skillNames: Record<SkillTemplate, string> = {
  attack: '月影の一閃', area: '静寂の雨', heal: '白花の祈り', guard: '守りの誓い', buff: '星灯の導き', debuff: '朽ちゆく祝福',
  pierce: '銀閃の貫突', drain: '夜露の吸命', regen: '巡る月の雫', barrier: '月光の障壁', cleanse: '白花の浄化',
};
const descriptions: Record<SkillTemplate, string> = {
  attack: '敵1体に強力な攻撃。', area: '敵全体を攻撃。かばうを無視する。', heal: 'HPが低い味方1人を回復。生存重視では早めに使用する。',
  guard: '味方1人への単体攻撃を次ラウンドまで引き受け、ダメージを軽減。', buff: '攻撃力が高い味方1人の攻撃力を次ラウンドまで強化。', debuff: '敵1体の防御力を次ラウンドまで下げる。',
  pierce: '敵1体の防御力を65%無視する攻撃。堅い敵・ボスや攻撃重視で優先。',
  drain: '敵1体を攻撃し、実際に与えたダメージの35%を自分のHPに吸収。負傷時に優先。',
  regen: '負傷した味方1人に3回のラウンド終了時回復。回復量は最大HPの約5〜7%。',
  barrier: '味方1人に最大HPの12%＋使用者の攻撃力の60%の障壁。次ラウンド終了までダメージを肩代わり。重ね掛けは増加しない。',
  cleanse: '防御低下中の味方1人を浄化し、小回復。重傷者がいる時は通常の回復を優先。',
};
export function skillCooldown(template: SkillTemplate): number { return template === 'guard' ? 2 : 3; }
export function skillDescription(skill: SkillDef): string { return `${descriptions[skill.template]} 再使用まで${skillCooldown(skill.template)}ラウンド。`; }
const leaderDescriptions: Record<LeaderEffect, string> = {
  regeneration: '月の慈愛：ラウンド終了時、味方全員の最大HPの3%を回復。',
  finisher: '薄明の追撃：残りHP35%以下の敵へのダメージが20%上昇。',
  lifesteal: '黄泉の契り：味方の攻撃で与えた実ダメージの8%を、攻撃した本人のHPに吸収。',
  bulwark: '銀灯の庇護：味方全員の被ダメージを10%軽減。',
  resonance: '星の共鳴：味方全員の全体攻撃の威力が15%上昇。',
};
export function leaderEffectDescription(character: CharacterDef): string {
  return character.leaderEffect ? `${leaderDescriptions[character.leaderEffect]} リーダー生存中のみ有効。` : '';
}
