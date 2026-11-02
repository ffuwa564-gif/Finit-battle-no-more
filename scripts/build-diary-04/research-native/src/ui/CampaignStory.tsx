import type { DungeonDef } from '../domain/types';
import { tr } from '../locales/i18n';
import './campaign-dungeons.css';

export function CampaignStory({ dungeon, phase }: { dungeon: DungeonDef; phase: 'before' | 'after' }) {
  if (!dungeon.narrative) return null;
  return <section className="campaign-story" aria-label={tr(phase === 'before' ? '探索前の物語' : '探索後の物語')}>
    <span className="eyebrow">{tr(phase === 'before' ? '物語・出発前' : '物語・帰還')}</span>
    <p>{tr(dungeon.narrative[phase])}</p>
  </section>;
}
