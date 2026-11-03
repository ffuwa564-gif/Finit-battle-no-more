import { Target, ChevronRight } from 'lucide-react';
import type { Content, GameSave } from '../domain/types';
import { getBuildPlan, targetNeedsNewTier } from '../domain/builds';
import { GEM_DEFINITIONS } from '../domain/memory-gems';
import { tr } from '../locales/i18n';
import { Button } from './index';
import './build-goal-summary.css';

export function BuildGoalSummary({ save, content, onOpen }: { save: GameSave; content: Content; onOpen: () => void }) {
  if (!save.buildGoal) return null;
  const plan = getBuildPlan(content, save, save.buildGoal.buildId, save.buildGoal.stage);
  const next = plan.slots.find(slot => !slot.fulfilled);
  const nextName = next && (next.characterId ? GEM_DEFINITIONS.find(gem => gem.id === next.slot.gem.defId)?.name : content.characters.find(character => character.id === next.preferredCharacterId)?.name);
  const nextAction = next ? !next.characterId ? '次の目標：{0}を迎える' : next.gemStatus === 'missing' || next.gem && targetNeedsNewTier(next.gem, next.slot.gem) ? '次の目標：{0}を探す' : '次の目標：{0}を調律' : '';
  return <section className="build-goal-summary" aria-label={tr('追跡中のビルド')} data-testid="tracked-build-summary">
    <div><span><Target size={14} />{tr('追跡中のビルド')}</span><h3>{tr(plan.definition.name)} <small>{tr(plan.stageDefinition.label)}</small></h3><p>{tr('目標達成 {0} / {1}枠').replace('{0}', String(plan.readyCount)).replace('{1}', String(plan.totalCount))}</p>{nextName ? <p>{tr(nextAction).replace('{0}', tr(nextName))}</p> : <p>{tr('目標の装備がそろいました。戦い方を試してみましょう。')}</p>}</div>
    <Button variant="secondary" size="sm" onClick={onOpen} aria-label={tr('目標の続きを見る')}><ChevronRight size={18} /></Button>
  </section>;
}
