import { getBuildDefinition, gemMeetsBuildTarget, type BuildGoal } from '../domain/builds';
import { towerDustReward } from '../domain/ivory-tower';
import { useEffect, useState } from 'react';
import { Gem, PackageOpen } from 'lucide-react';
import type { Battle, DungeonDef } from '../domain/types';
import { dungeonGemFamily, GEM_DEFINITIONS, GEM_FAMILIES, gemName, gemRarity, gemRoll, gemPowerMultiplier, gemTraitInfo } from '../domain/memory-gems';
import { tr } from '../locales/i18n';
import './memory-gem-find.css';

/** A secured find never pauses exploration or demands a confirmation. */
export function MemoryGemFind({ battle, reducedMotion, onOpen }: { battle: Battle; reducedMotion: boolean; onOpen: () => void }) {
  const latest = battle.gemFinds?.at(-1);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!latest) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 5600);
    return () => clearTimeout(timer);
  }, [latest?.id]);
  if (!latest || !visible) return null;
  const roll = gemRoll(latest);
  return <button type="button" className={`memory-gem-find memory-gem-find--${gemRarity(latest)}${reducedMotion ? ' is-still' : ''}`} onClick={() => { setVisible(false); onOpen(); }} aria-label={tr('獲得した記憶石を見る')}>
    <span className="memory-gem-find__chest"><PackageOpen size={25} /><Gem size={17} /></span>
    <span role="status"><small>{tr('宝箱から記憶石を確保')}</small><strong>{tr(gemName(latest))}</strong>{latest.roll && <small>{tr('技効力 ×{0}').replace('{0}', gemPowerMultiplier(latest).toFixed(2))} · {tr(gemTraitInfo[roll.trait].name)}</small>}</span>
  </button>;
}

export function MemoryGemSource({ dungeon, compact = false }: { dungeon: DungeonDef; compact?: boolean }) {
  if (dungeon.kind === 'trial') return null;
  const family = dungeonGemFamily(dungeon);
  const unique = GEM_DEFINITIONS.find(def => def.family === family && def.bossOnly);
  return <p className={`memory-gem-source${compact ? ' memory-gem-source--compact' : ''}`}><Gem size={14} aria-hidden="true" /><span>{tr(`${GEM_FAMILIES[family].name}の記憶石`)}{!compact && <><br /><small>{tr('踏破で記憶の欠片 +{0}').replace('{0}', String(towerDustReward(dungeon) || 1))}{unique && <> · {tr('踏破宝箱限定')}：{tr(unique.name)}</>}</small></>}</span></p>;
}

export function MemoryGemSummary({ battle, buildGoal }: { battle: Battle; buildGoal?: BuildGoal }) {
  if (!battle.gemFinds?.length) return null;
  const targets = buildGoal ? getBuildDefinition(buildGoal.buildId)?.stages[buildGoal.stage].slots.map(slot => slot.gem) ?? [] : [];
  return <div className="memory-gem-summary"><h2><Gem size={20} />{tr('確保した記憶石')}</h2>{battle.gemFinds.map(gem => <div key={gem.id}><Gem size={14} /><span>{tr(gemName(gem))}{targets.some(target => target.defId === gem.defId && target.variant === gem.variant) && <small className="memory-gem-summary__goal">{tr(targets.some(target => gemMeetsBuildTarget(gem, target)) ? '目標性能の石を獲得' : '目標ビルドの候補・調律で仕上げる')}</small>}{gem.roll && <small className="memory-gem-summary__quality">{tr('技効力 ×{0}').replace('{0}', gemPowerMultiplier(gem).toFixed(2))} · {tr(gemTraitInfo[gemRoll(gem).trait].name)}</small>}</span></div>)}<p>{tr('記憶石は取得済みです。撤退・全滅でも失いません。')}</p></div>;
}
