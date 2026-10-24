import type { Unit } from '../domain/types';
import './unit-effects.css';

export function UnitEffects({ unit, round }: { unit: Unit; round: number }) {
  if (unit.hp <= 0) return null;
  const effects: { label: string; title: string; bad?: boolean }[] = [];
  if ((unit.barrier ?? 0) > 0 && (unit.barrierUntil ?? -1) >= round) effects.push({ label: `障壁 ${unit.barrier}`, title: `残り${unit.barrierUntil! - round + 1}ラウンド・${unit.barrier}ダメージを肩代わり` });
  if ((unit.regenUntil ?? -1) >= round) effects.push({ label: '再生', title: `ラウンド終了時回復・残り${unit.regenUntil! - round + 1}回` });
  if (unit.guardTarget && (unit.guardUntil ?? -1) >= round) effects.push({ label: 'かばう', title: '味方への単体攻撃を引き受ける' });
  if ((unit.buffUntil ?? -1) >= round) effects.push({ label: '攻撃↑', title: '攻撃力上昇中' });
  if ((unit.debuffUntil ?? -1) >= round) effects.push({ label: '防御↓', title: '防御力低下中・浄化で解除できる', bad: true });
  if (!effects.length) return null;
  return <div className="unit-effects" aria-label="付与効果">{effects.map(effect => <span key={effect.label} className={effect.bad ? 'is-debuff' : ''} title={effect.title}>{effect.label}</span>)}</div>;
}
