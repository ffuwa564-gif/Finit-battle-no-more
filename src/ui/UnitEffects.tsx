import { tr, localize } from '../locales/i18n';
import { CloudFog, Moon, Zap, Heart } from 'lucide-react';
import { ailments, ailmentNames, ailmentDescriptions } from '../domain/ailments';
import type { Ailment, Unit } from '../domain/types';
import './unit-effects.css';

export function UnitEffects({ unit, round }: { unit: Unit; round: number }) {
  if (unit.hp <= 0) return null;
  const effects: { label: string; title: string; bad?: boolean; ailment?: Ailment }[] = [];
  if ((unit.barrier ?? 0) > 0 && (unit.barrierUntil ?? -1) >= round) effects.push({ label: `障壁 ${unit.barrier}`, title: `残り${unit.barrierUntil! - round + 1}ラウンド・${unit.barrier}ダメージを肩代わり` });
  if ((unit.regenUntil ?? -1) >= round) effects.push({ label: tr('status.regen'), title: `ラウンド終了時回復・残り${unit.regenUntil! - round + 1}回` });
  if (unit.guardTarget && (unit.guardUntil ?? -1) >= round) effects.push({ label: 'かばう', title: '味方への単体攻撃を引き受ける' });
  if ((unit.buffUntil ?? -1) >= round) effects.push({ label: '攻撃↑', title: '攻撃力上昇中' });
  if ((unit.debuffUntil ?? -1) >= round) effects.push({ label: '防御↓', title: '防御力低下中・浄化で解除できる', bad: true });
  for (const id of ailments) {
    const state = unit.ailments?.[id];
    if (state) effects.push({ label: `${ailmentNames[id]} · ${state.turns}`, title: `${ailmentDescriptions[id]} 残り${state.turns}回の行動。`, bad: true, ailment: id });
  }
  if ((unit.statusWardUntil ?? -1) >= round) effects.push({ label: '状態耐性', title: `混乱・睡眠・麻痺・魅了の再付与を防ぐ・残り${unit.statusWardUntil! - round + 1}ラウンド` });
  const icons = { confusion: CloudFog, sleep: Moon, paralysis: Zap, charm: Heart };
  if (!effects.length) return null;
  return <div className="unit-effects" aria-label={tr("付与効果")}>{localize(effects.map(effect => { const Icon = effect.ailment ? icons[effect.ailment] : null; return <span key={effect.label} className={`${effect.bad ? 'is-debuff' : ''}${effect.ailment ? ' is-ailment' : ''}`} data-ailment={effect.ailment} title={tr(effect.title)} aria-label={tr(effect.label) + ' / ' + tr(effect.title)}>{Icon && <Icon size={10} aria-hidden="true" />}{localize(effect.label)}</span>; }))}</div>;
}
