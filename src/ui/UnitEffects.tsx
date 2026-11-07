import { tr, localize } from '../locales/i18n';
import { useState } from 'react';
import { Modal } from './index';
import { Clock3, Shield, Sparkles, HeartPulse, Swords, ShieldCheck, ShieldOff, CloudFog, Moon, Zap, Heart, Flag, Lamp, Scissors, Sprout, Flower2 } from 'lucide-react';
import { ailments, ailmentNames, ailmentDescriptions } from '../domain/ailments';
import type { Ailment, Unit } from '../domain/types';
import './unit-effects.css';

export function UnitEffects({ unit, round, compact = false }: { unit: Unit; round: number; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  if (unit.hp <= 0) return null;
  const effects: { label: string; title: string; bad?: boolean; ailment?: Ailment; icon?: typeof Shield }[] = [];
  if ((unit.field?.woundUntil??-1)>=round) effects.push({icon:Scissors,label:'留め縫い',title:'次ラウンド終了までHP回復を阻止',bad:true});
  if (unit.field?.restRound===round) effects.push({icon:Clock3,label:'休番',title:'このラウンドの全行動を休む'});
  if (unit.field?.receipt && unit.field.receipt.until>=round) effects.push({icon:Flag,label:'宛先の控え',title:'混乱・魅了の通常攻撃の誤配を1回だけ差し戻す'});
  if ((unit.field?.stock??0)>0) effects.push({icon:Scissors,label:`残り糸 ${unit.field!.stock}`,title:'留め縫いに使う有限の備蓄'});
  if ((unit.defendingUntil ?? -1) >= round) effects.push({ icon: Shield, label: '身を守る', title: '次の行動まで被ダメージを半減' });
  if ((unit.barrier ?? 0) > 0 && (unit.barrierUntil ?? -1) >= round) effects.push({ icon: Shield, label: `障壁 ${unit.barrier}`, title: `残り${unit.barrierUntil! - round + 1}ラウンド・${unit.barrier}ダメージを肩代わり` });
  if ((unit.regenUntil ?? -1) >= round) effects.push({ icon: HeartPulse, label: tr('status.regen'), title: `ラウンド終了時回復・残り${unit.regenUntil! - round + 1}回` });
  if (unit.guardTarget && (unit.guardUntil ?? -1) >= round) effects.push({ icon: ShieldCheck, label: 'かばう', title: '味方への単体攻撃を引き受ける' });
  if ((unit.buffUntil ?? -1) >= round) effects.push({ icon: Swords, label: '攻撃↑', title: '攻撃力上昇中' });
  if(unit.jamDampening&&unit.jamDampening.until>=round)effects.push({icon:Clock3,label:`余白の緩衝 ${unit.jamDampening.percent}%`,title:`次の通常攻撃1回を軽減。第${unit.jamDampening.until}ラウンド終了まで。スキル・必殺・予告大技・ビットは対象外。`,bad:true});
  if ((unit.debuffUntil ?? -1) >= round) effects.push({ icon: ShieldOff, label: '防御↓', title: '防御力低下中・浄化で解除できる', bad: true });
  if (unit.scoutMark && unit.scoutMark.until >= round) effects.push({ icon: Flag, label: '宛先の標', title: '別の味方の通常攻撃・固有技でHPダメージを与えると回収し、必殺ゲージ+10。本人・石・必殺・追加攻撃は対象外。', bad: true });
  if ((unit.scoutLanternUntil ?? -1) >= round) effects.push({ icon: Lamp, label: '交代の灯', title: '次の予告大技1回の被害を25%軽減。通常攻撃・ビット射撃は対象外。次ラウンド終了まで。' });
  if ((unit.scoutThreadUntil ?? -1) >= round) effects.push({ icon: Scissors, label: '残り糸', title: '夜継ぎの鋏を1回だけ強化する。最大1つ、次ラウンド終了まで。' });
  if (unit.whiteFlower && unit.whiteFlower.until >= round) effects.push({ icon: Sprout, label: '摘まない白花の種', title: `本人が通常の「身を守る」を実行するとHP${unit.whiteFlower.amount}回復。第${unit.whiteFlower.until}ラウンド終了まで。種は重ねず期限も更新しない。防御予約・作戦変更・戦場の花では開花しない。余剰回復は消える。` });
  if(unit.barrierReturn&&unit.barrierReturn.power>0&&unit.barrierReturn.until>=round)effects.push({icon:Flower2,label:`桜の返礼 +${unit.barrierReturn.power}%`,title:`次の主攻撃の最初の対象への実HPダメージを強化。追撃は対象外。第${unit.barrierReturn.until}ラウンド終了まで。`});
  if(unit.mendThread&&unit.mendThread.amount>0&&unit.mendThread.until>=round)effects.push({icon:Scissors,label:`修繕糸 ${unit.mendThread.amount}`,title:`失効した障壁の残り。第${unit.mendThread.until}ラウンド終了まで修繕に使用できる。有効な障壁とは別の有限資源。`});
  if(unit.gemPreparation)effects.push({icon:Lamp,label:unit.gemPreparation.kind==='camp'?`野営の準備 ${unit.gemPreparation.kills}/3`:`ボスへの備え ${unit.gemPreparation.kills}/12`,title:unit.gemPreparation.kind==='camp'?'主攻撃で3体討伐すると一度だけ全体回復。期限内の討伐が必要。':'道中の討伐を蓄え、ボス出現時に本人のゲージと障壁へ変換。'});
  if(unit.concordMark&&unit.concordMark.until>=round)effects.push({icon:Flag,label:`共鳴標 ${unit.concordMark.contributors.length}/2`,title:'異なる味方2人の主攻撃でHPを削ると追加攻撃。追撃では進まない。',bad:true});
  for (const id of ailments) {
    const state = unit.ailments?.[id];
    if (state) effects.push({ label: `${ailmentNames[id]} · ${state.turns}`, title: `${ailmentDescriptions[id]} 残り${state.turns}回の行動。`, bad: true, ailment: id });
  }
  if ((unit.statusWardUntil ?? -1) >= round) effects.push({ icon: Sparkles, label: '状態耐性', title: `混乱・睡眠・麻痺・魅了の再付与を防ぐ・残り${unit.statusWardUntil! - round + 1}ラウンド` });
  const icons = { confusion: CloudFog, sleep: Moon, paralysis: Zap, charm: Heart };
  if (!effects.length) return null;
  const scoutEffect = Boolean(unit.scoutMark && unit.scoutMark.until >= round || (unit.scoutLanternUntil ?? -1) >= round || (unit.scoutThreadUntil ?? -1) >= round);
  if (compact || Boolean(unit.gemPreparation||unit.concordMark) || Boolean(unit.field) || Boolean(unit.jamDampening&&unit.jamDampening.until>=round) || Boolean(unit.mendThread && unit.mendThread.until >= round) || scoutEffect || Boolean(unit.barrierReturn && unit.barrierReturn.power > 0 && unit.barrierReturn.until >= round) || Boolean(unit.whiteFlower && unit.whiteFlower.until >= round)) {
    effects.sort((a, b) => Number(!!b.bad) - Number(!!a.bad));
    const iconFor = (effect: typeof effects[number]) => effect.ailment ? icons[effect.ailment] : effect.icon ?? Sparkles;
    const controls = <>
      <button type="button" className="unit-effects-summary" aria-label={`${tr('付与効果')}: ${effects.map(effect => tr(effect.label)).join(', ')}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {effects.slice(0, 2).map(effect => { const Icon = iconFor(effect); return <span key={effect.label} className={effect.bad ? 'is-debuff' : ''} title={tr(effect.label)}><Icon size={12} aria-hidden="true" /></span>; })}
        {effects.length > 2 && <small>+{effects.length - 2}</small>}
      </button>
      <Modal open={open} title={tr('付与効果')} onClose={() => setOpen(false)} className="unit-effects-modal">
        <ul className="unit-effects-details">{effects.map(effect => { const Icon = iconFor(effect); return <li key={effect.label} className={effect.bad ? 'is-debuff' : ''}><Icon size={18} aria-hidden="true" /><div><strong>{localize(effect.label)}</strong><p>{localize(effect.title)}</p></div></li>; })}</ul>
      </Modal>
    </>;
    return compact ? controls : <div className="unit-effects">{controls}</div>;
  }
  return <div className="unit-effects" role="group" tabIndex={0} aria-label={tr("付与効果")}>{localize(effects.map(effect => { const Icon = effect.ailment ? icons[effect.ailment] : null; return <span key={effect.label} className={`${effect.bad ? 'is-debuff' : ''}${effect.ailment ? ' is-ailment' : ''}`} data-ailment={effect.ailment} title={tr(effect.title)} aria-label={tr(effect.label) + ' / ' + tr(effect.title)}>{Icon && <Icon size={10} aria-hidden="true" />}{localize(effect.label)}</span>; }))}</div>;
}
