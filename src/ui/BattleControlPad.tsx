import type { CSSProperties, ReactNode } from 'react';
import { Compass, Flag, FlaskConical, Shield, Swords } from 'lucide-react';
import type { Strategy } from '../domain/types';
import { assetPath } from '../content';
import { Button } from './index';
import './battle-control-pad.css';

export interface BattleControlPadProps {
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
  return <section className="battle-control-pad" aria-label="戦闘操作" style={style}>
    <div className="battle-control-pad__board">
      <div className="battle-control-pad__strategies" role="group" aria-label="作戦を選ぶ">
        {strategies.map(({ id, label, name, icon: Icon }) => <Button key={id} variant="secondary" className="moon-command moon-command--strategy" aria-label={name} title={name} selected={p.strategy === id} disabled={p.strategyDisabled} onClick={() => p.onStrategy(id)}>
          <Icon aria-hidden="true" /><span>{label}</span><span className="moon-command__marker" aria-hidden="true" />
        </Button>)}
      </div>
      <Button variant="secondary" className="moon-command moon-command--potion" aria-label={`回復薬 ${p.potionCount}`} title="回復薬" disabled={p.potionDisabled} selected={p.potionSelected} onClick={p.onPotion}>
        <FlaskConical aria-hidden="true" /><span>ITEM</span><span className="moon-command__count">{p.potionCount}</span>
      </Button>
      <div className="battle-control-pad__utilities">
        <div className="battle-control-pad__toolbar">{p.toolbar}</div>
        <Button variant="secondary" className="moon-command moon-command--retreat" aria-label="撤退" title="撤退" disabled={p.retreatDisabled} onClick={p.onRetreat}><Flag aria-hidden="true" /><span>RETREAT</span></Button>
      </div>
      <Button className="moon-command moon-command--advance" aria-label={p.advancing ? '次の演出へ' : 'ラウンドを進める'} disabled={p.advanceDisabled} onClick={p.onAdvance}>
        <Swords aria-hidden="true" /><span>{p.advancing ? 'NEXT' : 'ATTACK'}</span><span className="moon-command__flourish" aria-hidden="true">✦</span>
      </Button>
    </div>
  </section>;
}
