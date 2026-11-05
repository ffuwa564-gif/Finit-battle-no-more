import { currentWorldObjective } from '../domain/world-objective';
import { getLanguage } from '../locales/i18n';
import { ArrowRight, Gem, Mountain } from 'lucide-react';
import { content as currentContent } from '../content';
import { homeJourneyTarget } from '../domain/home-journey';
import type { Content, GameSave } from '../domain/types';
import { tr } from '../locales/i18n';
import { Button } from './index';
import './home-journey-goal.css';

export interface HomeJourneyGoalProps {
  save: GameSave;
  content?: Content;
  busy?: boolean;
  onNavigate: (dungeonId: string) => void;
  onStoryNavigate?: (locationId?: string, recipeId?: string) => void;
}

/** One short journey objective. Equipment progress belongs to BuildGoalSummary. */
export function HomeJourneyGoal({save,content=currentContent,busy=false,onNavigate,onStoryNavigate}:HomeJourneyGoalProps) {
  const objective = currentWorldObjective(save,content);
  if (save.worldStory && onStoryNavigate) return <section className="home-journey-goal" aria-label={tr('次の旅の目標')} data-testid="home-journey-goal"><div className="home-journey-goal__copy"><span>{objective.goal[getLanguage()]}</span><h2>{objective.action[getLanguage()]}</h2><p>{objective.reason[getLanguage()]}</p></div><Button variant="secondary" disabled={busy||Boolean(save.battle)} aria-label={tr('次の目的地へ')} onClick={() => onStoryNavigate(objective.locationId,objective.recipeId)}>{tr('向かう')}<ArrowRight size={16}/></Button></section>;
  const target=homeJourneyTarget(content,save);
  if(!target)return null;
  const chapter=target.chapter;
  return <section className="home-journey-goal" aria-label={tr('次の旅の目標')} data-testid="home-journey-goal" data-dungeon-id={target.dungeon.id}>
    <div className="home-journey-goal__copy"><span>{chapter?tr('第{0}章 {1}').replace('{0}',String(chapter.number)).replace('{1}',tr(chapter.title)):tr('白亜の塔の次の層へ')}</span><h2>{tr(target.dungeon.name)}</h2><p>{target.firstClearStones>0?<><Gem size={13} aria-hidden="true" />{tr('初踏破：祈願石{0}個').replace('{0}',String(target.firstClearStones))}</>:<><Mountain size={13} aria-hidden="true" />{tr('装備を整えて、新しい層へ挑む。')}</>}</p></div>
    <Button variant="secondary" disabled={busy||Boolean(save.battle)} aria-label={tr('{0}の準備へ').replace('{0}',tr(target.dungeon.name))} onClick={()=>onNavigate(target.dungeon.id)}>{tr('準備へ')}<ArrowRight size={16}/></Button>
  </section>;
}
