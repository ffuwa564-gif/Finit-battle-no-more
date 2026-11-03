import { GameImage } from './GameMedia';
import { MemoryGemSource } from './MemoryGemFind';
import { useState } from 'react';
import { ArrowRight, Check, Crown, Hexagon, LockKeyhole } from 'lucide-react';
import type { CharacterDef, Content, GameSave } from '../domain/types';
import { campaignFrontier, campaignStageIds, chapterUnlocked } from '../domain/campaign';
import { dungeonLock } from '../domain/events';
import { dungeonDifficulty } from '../domain/engine';
import { assetPath, materialName } from '../content';
import { tr } from '../locales/i18n';
import { Button, CampaignStory, CurrencyEmblem, Panel } from './index';
import './campaign-dungeons.css';

export function CampaignDungeons({ content, save, busy, onSelect, onInspect }: {
  content: Content; save: GameSave; busy: boolean; onSelect: (id: string) => void; onInspect: (character: CharacterDef) => void;
}) {
  const chapters = content.chapters ?? [];
  const frontier = campaignStageIds(content)[campaignFrontier(save, content)];
  const [selected, setSelected] = useState(() => chapters.find(chapter => chapter.dungeonIds.includes(frontier!))?.id);
  const chapter = chapters.find(item => item.id === selected && chapterUnlocked(item, save, content)) ?? chapters[0];
  if (!chapter) return null;
  const stages = chapter.dungeonIds.map(id => content.dungeons.find(stage => stage.id === id)!);
  const final = stages.at(-1)!;
  const boss = content.characters.find(char => char.id === final.waves.at(-1)![0]!.characterId)!;
  const cleared = stages.filter(stage => save.completedDungeonIds.includes(stage.id)).length;
  return <section className="campaign" aria-label={tr('章ごとの探索')}>
    <div className="chapter-tabs" data-guide="chapters" role="group" aria-label={tr('通常ダンジョンの章')}>
      {chapters.map(item => {
        const unlocked = chapterUnlocked(item, save, content);
        const complete = item.dungeonIds.every(id => save.completedDungeonIds.includes(id));
        return <Button key={item.id} className="chapter-tab" variant={item.id === chapter.id ? 'primary' : 'secondary'} selected={item.id === chapter.id} disabled={!unlocked || busy} aria-label={tr(`第${item.number}章 ${item.title}`)} title={tr(unlocked ? item.title : `第${item.number - 1}章を踏破して解放`)} onClick={() => setSelected(item.id)}>
          <span>{complete ? <Check size={14} /> : unlocked ? <Crown size={14} /> : <LockKeyhole size={14} />}{tr(`第${item.number}章`)}</span><strong>{tr(item.title)}</strong>
        </Button>;
      })}
    </div>
    <header className="chapter-heading"><span className="eyebrow">{tr(`第${chapter.number}章`)}</span><h2>{tr(chapter.title)}</h2><p>{tr(chapter.subtitle)}</p><div className="chapter-progress"><span>{tr(`踏破 ${cleared} / ${stages.length}`)}</span><span>{tr('各探索の初踏破で石3個')}</span></div><progress value={cleared} max={stages.length} aria-label={tr('章の踏破状況')} /></header>
    <Panel className="chapter-boss"><Button variant="icon" className="chapter-boss__portrait" aria-label={tr(boss.name)} onClick={() => onInspect(boss)}><GameImage src={assetPath(boss.artId)} alt="" style={{objectPosition:boss.id === 'stone-drake' ? '80% 20%' : '50% 0%'}} /></Button><div><span className="eyebrow"><Crown size={12} /> {tr('章末ボス')}</span><h3>{tr(boss.name)}</h3><p>{tr(chapter.bossHint)}</p></div></Panel>
    <div className="dungeon-list">{stages.map((stage, index) => {
      const lock = dungeonLock(stage, save, content), complete = save.completedDungeonIds.includes(stage.id);
      const finale = stage.id === final.id;
      return <Panel className={`dungeon-card${finale ? ' dungeon-card--finale' : ''}`} key={stage.id}>
        <div className="dungeon-image"><GameImage src={assetPath(stage.artId)} alt="" /><span className="dungeon-index">{chapter.number}-{index + 1}</span>{complete && <span className="clear-label"><Check size={12} />{tr(' 踏破済')}</span>}</div>
        <div className="dungeon-info"><span className="eyebrow">{stage.waves.length} WAVES · {tr(finale ? '章末ボス' : '探索')}</span><h2>{tr(stage.name)}</h2><p>{tr(stage.subtitle)}</p>
          <div className="dungeon-meta"><span><Hexagon size={14} />{tr(' 難易度 ')}{dungeonDifficulty(stage, content).toFixed(1)}</span><span><CurrencyEmblem kind="stone" size={14} /> {tr(complete ? '初踏破報酬 受取済' : '初踏破 石3個')}</span></div>
          <MemoryGemSource dungeon={stage} compact />{stage.bossLoot && <p className="dungeon-loot">{stage.bossLoot.guaranteed.map(cost => `${tr(materialName(cost.materialId))} ×${cost.count}`).join(' / ')}</p>}
          {lock && <p className="dungeon-lock"><LockKeyhole size={12} /> {tr(lock)}</p>}
          <>{complete && stage.narrative && <details className="campaign-story-archive"><summary>{tr('踏破した物語を読み返す')}</summary><CampaignStory dungeon={stage} phase="before" /><CampaignStory dungeon={stage} phase="after" /></details>}</><Button data-guide={lock ? undefined : 'prepare'} variant={finale ? 'primary' : 'secondary'} disabled={busy || Boolean(lock)} onClick={() => onSelect(stage.id)}>{tr('探索の準備 ')}<ArrowRight size={15} /></Button>
        </div>
      </Panel>;
    })}</div>
  </section>;
}
