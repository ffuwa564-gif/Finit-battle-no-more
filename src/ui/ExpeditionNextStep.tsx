import type { Battle } from '../domain/types';
import { expeditionExperiments } from '../domain/preparation';
import { tr } from '../locales/i18n';
import { Button, InventorySection } from './index';
import './expedition-review.css';

export function ExpeditionNextStep({battle,busy,onPrepare,onBuilds}:{battle:Battle;busy:boolean;onPrepare:()=>void;onBuilds:()=>void}) {
  if(battle.phase!=='failed'||battle.failureKind==='retreat')return null;
  const review=battle.tracking?.review;
  return <section className="expedition-next-step" data-testid="expedition-next-step" aria-label={tr('次の挑戦に向けて')}>
    <h3>{tr('次の挑戦に向けて')}</h3>
    {review&&<p className="expedition-next-step__summary">{tr('{0}ラウンド · 与えたHPダメージ {1} · 回復 {2}').replace('{0}',String(review.rounds)).replace('{1}',String(review.enemyDamageTaken)).replace('{2}',String(review.partyHealing))}</p>}
    <InventorySection id="next-expedition-experiments" title="記録から次に試すこと" tone="night"><ul>{expeditionExperiments(battle).map(tip=><li key={tip}>{tr(tip)}</li>)}</ul></InventorySection>
    <div className="expedition-next-step__actions"><Button variant="secondary" disabled={busy} onClick={onPrepare}>{tr('帰還して装備を整える')}</Button><Button variant="secondary" disabled={busy} onClick={onBuilds}>{tr('帰還してビルドを選ぶ')}</Button></div>
  </section>;
}
