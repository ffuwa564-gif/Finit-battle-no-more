import type { CharacterDef, Role, SkillTemplate, Unit } from './types';

const forms: Record<Role, { name: string; description: string; template: SkillTemplate; theme: string }> = {
  attacker: { name: '終夜の一閃', description: '敵1体に攻撃力の280%で攻撃し、防御の65%を無視する。', template: 'pierce', theme: 'blade' },
  area_attacker: { name: '星降る終奏', description: '敵全体に攻撃力の190%で攻撃。かばうを無視する。', template: 'area', theme: 'stars' },
  healer: { name: '命花の奇跡', description: '生存中の味方全員を最大HPの40%回復し、状態異常と防御低下を解除する。', template: 'heal', theme: 'bloom' },
  tank: { name: '不落の誓約', description: '生存中の味方全員に最大HPの30%と使用者の防御力2倍の障壁。次ラウンド終了まで有効。', template: 'barrier', theme: 'aegis' },
  supporter: { name: '黎明の祝祭', description: '生存中の味方全員の攻撃力を40%上昇し、最大HPの15%の障壁を付与。次ラウンド終了まで有効。強化は重複せず強い効果を優先する。', template: 'rally', theme: 'dawn' },
  debuffer: { name: '夜をほどく呪詩', description: '敵全体に攻撃力の150%で攻撃し、防御を35%低下させる。次ラウンド終了まで有効。', template: 'area', theme: 'eclipse' },
};
const personalNames: Record<string, string> = {
  vespera: '星炉・限界臨界の夜明け', miette: '修繕・世界を縫う金糸', tikka: '秒針・零時の侵入者',
  elaine: '白花・命を結ぶ祈り', liora: '錆銀・帰還の聖盾', seris: '薄明・夜を断つ剣', noelle: '星詠・失われた天河',
  'elaine-awakened': '白暁・還り咲く命', 'liora-awakened': '銀誓・不滅の帰還門', 'seris-awakened': '約束・明日を拓く剣', 'noelle-awakened': '星録・夜明けの天河',
  athena: '軍神・蒼天の絶対守護', 'athena-standard': '梟翼・知恵の城塞', selene: '月宴・永遠の抱擁', 'selene-standard': '月白・静寂の祝福',
  lunette: 'うさぎ隊・いっせいほうげき！', 'lunette-awakened': '星時計・うさぎ座の大行進！', nox: '零式・終極執行', fortuna: '運命・黄金の祝祭',
};

/** Every character has a personal title/art; combat follows six inspectable role contracts. */
export function ultimateFor(character: CharacterDef) {
  const form = forms[character.role];
  return { ...form, name: personalNames[character.id] ?? `${character.epithet}・${form.name}` };
}
export function ultimateCharge(unit: Unit): number { return Math.max(0, Math.min(100, unit.ultimateCharge ?? 0)); }
export function ultimateReady(unit: Unit): boolean { return unit.side === 'party' && unit.hp > 0 && ultimateCharge(unit) >= 100; }
export function gainUltimate(unit: Unit, amount: number): void {
  if (unit.side === 'party' && unit.hp > 0) unit.ultimateCharge = Math.min(100, ultimateCharge(unit) + amount);
}
