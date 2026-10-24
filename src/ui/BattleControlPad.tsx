import type { ReactNode } from 'react';
import type { Strategy } from '../domain/types';
import { Button } from './index';
import { AtlasIcon } from './AtlasIcon';
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

/** Complete illustrated controls share one proportional, reference-based board. */
export function BattleControlPad(p: BattleControlPadProps) {
  return <section className="battle-control-pad" aria-label="戦闘操作">
    <div className="battle-control-pad__toolbar">{p.toolbar}</div>
    <div className="battle-control-pad__board">
      <div className="battle-control-pad__strategies" role="group" aria-label="作戦を選ぶ">
        <Button variant="secondary" className="framed-control framed-control--balanced" aria-label="均衡" title="均衡" selected={p.strategy === 'balanced'} disabled={p.strategyDisabled} onClick={() => p.onStrategy('balanced')}><AtlasIcon asset="control-frames" frame={0} /><span className="framed-control__label">Balance</span></Button>
        <Button variant="secondary" className="framed-control framed-control--aggressive" aria-label="攻撃重視" title="攻撃重視" selected={p.strategy === 'aggressive'} disabled={p.strategyDisabled} onClick={() => p.onStrategy('aggressive')}><AtlasIcon asset="control-frames" frame={1} /><span className="framed-control__label">Offense</span></Button>
        <Button variant="secondary" className="framed-control framed-control--survival" aria-label="生存重視" title="生存重視" selected={p.strategy === 'survival'} disabled={p.strategyDisabled} onClick={() => p.onStrategy('survival')}><AtlasIcon asset="control-frames" frame={2} /><span className="framed-control__label">Defense</span></Button>
      </div>
      <Button variant="secondary" className="framed-control framed-control--potion" aria-label={`回復薬 ${p.potionCount}`} title="回復薬" disabled={p.potionDisabled} selected={p.potionSelected} onClick={p.onPotion}><AtlasIcon asset="control-frames" frame={4} /><span className="framed-control__label">Item</span><span className="framed-control__count">{p.potionCount}</span></Button>
      <Button className="framed-control framed-control--advance" aria-label={p.advancing ? '次の演出へ' : 'ラウンドを進める'} disabled={p.advanceDisabled} onClick={p.onAdvance}><AtlasIcon asset="control-frames" frame={3} /><span className="framed-control__label">{p.advancing ? 'Next' : 'Attack'}</span></Button>
      <Button variant="icon" className="framed-control framed-control--retreat" aria-label="撤退" title="撤退" disabled={p.retreatDisabled} onClick={p.onRetreat}><AtlasIcon asset="control-frames" frame={5} /><span className="framed-control__label">Retreat</span></Button>
    </div>
  </section>;
}
