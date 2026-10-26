import { tr, localize } from '../locales/i18n';
import type { CSSProperties, ReactNode } from 'react';
import { Compass, Flag, Flame, FlaskConical, Shield, Swords } from 'lucide-react';
import type { AccelerationEffect } from '../domain/acceleration';
import type { Strategy } from '../domain/types';
import { assetPath } from '../content';
import { Button } from './index';
import './battle-control-pad.css';

export interface BattleControlPadProps {
  acceleration?: AccelerationEffect;
  strategy: Strategy;
  onStrategy: (strategy: Strategy) => void;
  strategyDisabled: boolean;
  advancing: boolean;
  advanceDisabled: boolean;
  onAdvance: () => void;
  potionCount: number;
  potionDisabled: boolean;
  potionSelected: boolean;
  onPotion: () => void;
  onRetreat: () => void;
  retreatDisabled: boolean;
  toolbar: ReactNode;
}

const strategies = [
  { id: 'balanced', label: 'BALANCED', name: '均衡', icon: Compass },
  { id: 'aggressive', label: 'OFFENSE', name: '攻撃重視', icon: Swords },
  { id: 'survival', label: 'DEFENSE', name: '生存重視', icon: Shield },
] as const;

/** One moonlit glass surface for strategy, supplies and round progression. */
export function BattleControlPad(p: BattleControlPadProps) {
  const style = { '--command-moonlight': `url("${new URL(assetPath('command-moonlight'), document.baseURI).href}")` } as CSSProperties;
  return <section className="battle-control-pad" aria-label={tr("戦闘操作")} style={style}>
    {p.acceleration && <div className="battle-acceleration" role="status" aria-label={tr('戦闘加速')}><span><Flame size={13} aria-hidden="true" />{tr(`加速：敵味方の攻撃 +${p.acceleration.percent}%`)}</span><small>{tr(`発動者：${p.acceleration.source}`)} · {tr('毎ターン+5%・Wave切替でリセット')}</small></div>}
    <div className="battle-control-pad__board">
      <div className="battle-control-pad__strategies" data-guide="battle-strategy" role="group" aria-label={tr("作戦を選ぶ")}>
        {localize(strategies.map(({ id, label, name, icon: Icon }) => <Button key={id} variant="secondary" className="moon-command moon-command--strategy" aria-label={tr(name)} title={tr(name)} selected={p.strategy === id} disabled={p.strategyDisabled} onClick={() => p.onStrategy(id)}>
          <Icon aria-hidden="true" /><span>{localize(label)}</span><span className="moon-command__marker" aria-hidden="true" />
        </Button>))}
      </div>
      <Button variant="secondary" className="moon-command moon-command--potion" data-guide="battle-potion" aria-label={tr(`回復薬 ${p.potionCount}`)} title={tr("回復薬")} disabled={p.potionDisabled} selected={p.potionSelected} onClick={p.onPotion}>
        <FlaskConical aria-hidden="true" /><span>ITEM</span><span className="moon-command__count">{localize(p.potionCount)}</span>
      </Button>
      <div className="battle-control-pad__utilities">
        <div className="battle-control-pad__toolbar">{localize(p.toolbar)}</div>
        <Button variant="secondary" className="moon-command moon-command--retreat" aria-label={tr("撤退")} title={tr("撤退")} disabled={p.retreatDisabled} onClick={p.onRetreat}><Flag aria-hidden="true" /><span>RETREAT</span></Button>
      </div>
      <Button className="moon-command moon-command--advance" data-guide="battle-advance" aria-label={tr(p.advancing ? '次の演出へ' : 'ラウンドを進める')} disabled={p.advanceDisabled} onClick={p.onAdvance}>
        <Swords aria-hidden="true" /><span>{localize(p.advancing ? 'NEXT' : 'ATTACK')}</span><span className="moon-command__flourish" aria-hidden="true">✦</span>
      </Button>
    </div>
  </section>;
}
