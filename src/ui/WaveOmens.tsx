import { Moon, Sparkles } from 'lucide-react';
import type { Battle } from '../domain/types';
import { omenChoices, omenRecipes } from '../domain/omens';
import { tr } from '../locales/i18n';
import { Button, Panel } from './index';
import './wave-omens.css';

export function WaveOmens({ battle, busy, onChoose }: { battle: Battle; busy: boolean; onChoose: (id: string) => void }) {
  const state = battle.omens;
  if (!state || (!state.pending && !state.picks.length)) return null;
  const journal = <><h3>{tr('心に残したもの')}</h3><ol>{state.picks.map((id, index) => <li key={index}>{tr(omenChoices.find(choice => choice.id === id)!.label)}</li>)}</ol></>;
  return <Panel className="wave-omens" role="region" aria-label={tr('廃都の痕跡')}>
    <span className="eyebrow">TRACES IN THE SILENCE</span>
    <h2><Moon size={21} />{tr('廃都の痕跡')}</h2>
    {state.pending && <><p>{tr('戦いの音が消えると、三つの気配が残っていた。ひとつだけ、心に留めて先へ進む。')}</p>
      <div className="wave-omens__choices">{state.pending.map(id => {
        const choice = omenChoices.find(choice => choice.id === id)!;
        return <Button key={id} variant="secondary" disabled={busy} onClick={() => onChoose(id)}><strong>{tr(choice.label)}</strong><span>{tr(choice.detail)}</span></Button>;
      })}</div><p className="subtle">{tr('痕跡はこの探索のあいだ残ります。ひとつでは何も起こらなくても、重なることで応えるものがあるようです。')}</p></>}
    {state.picks.length > 0 && <details className="wave-omens__journal"><summary>{tr('心に残したもの')} · {state.picks.length}</summary>{journal}</details>}
    {state.activated.map(id => {
      const recipe = omenRecipes.find(recipe => recipe.id === id)!;
      return <div className="wave-omens__awakening" key={id} role="status"><h3><Sparkles size={17} />{tr(recipe.title)}</h3><p>{tr(recipe.result)}</p></div>;
    })}
  </Panel>;
}
