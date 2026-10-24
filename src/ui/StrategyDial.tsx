import type { Strategy } from '../domain/types';
import { Button } from './index';
import { CommandEmblem } from './CommandEmblem';
import './strategy-dial.css';

const names: Record<Strategy, string> = { balanced: '均衡', aggressive: '攻撃重視', survival: '生存重視' };
const choices = Object.keys(names) as Strategy[];

/** A tactile command dial: every outer control selects an actual party strategy. */
export function StrategyDial({ value, disabled = false, onChange }: {
  value: Strategy; disabled?: boolean; onChange: (strategy: Strategy) => void;
}) {
  return <div className="strategy-options strategy-dial" role="group" aria-label="作戦を選ぶ">
    <span className="strategy-dial__hub" aria-hidden="true"><CommandEmblem kind={value} /></span>
    {choices.map(strategy => <Button key={strategy} variant="secondary" selected={value === strategy} disabled={disabled}
      className={`strategy-dial__choice strategy-dial__choice--${strategy}`} onClick={() => onChange(strategy)}>
      <CommandEmblem kind={strategy} /><span>{names[strategy]}</span>
    </Button>)}
  </div>;
}
