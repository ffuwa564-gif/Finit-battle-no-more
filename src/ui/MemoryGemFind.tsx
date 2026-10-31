import { useEffect, useState } from 'react';
import { Gem, PackageOpen } from 'lucide-react';
import type { Battle, DungeonDef } from '../domain/types';
import { dungeonGemFamily, GEM_DEFINITIONS, GEM_FAMILIES, gemDefinition, gemName } from '../domain/memory-gems';
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
  const def = gemDefinition(latest);
  return <button type="button" className={`memory-gem-find memory-gem-find--${def.rarity}${reducedMotion ? ' is-still' : ''}`} onClick={() => { setVisible(false); onOpen(); }} aria-label={tr('獲得した記憶石を見る')}>
    <span className="memory-gem-find__chest"><PackageOpen size={25} /><Gem size={17} /></span>
    <span role="status"><small>{tr('宝箱から記憶石を確保')}</small><strong>{tr(gemName(latest))}</strong></span>
  </button>;
}

export function MemoryGemSource({ dungeon, compact = false }: { dungeon: DungeonDef; compact?: boolean }) {
  if (dungeon.kind === 'trial') return null;
  const family = dungeonGemFamily(dungeon);
  const unique = GEM_DEFINITIONS.find(def => def.family === family && def.bossOnly);
  return <p className={`memory-gem-source${compact ? ' memory-gem-source--compact' : ''}`}><Gem size={14} aria-hidden="true" /><span>{tr(`${GEM_FAMILIES[family].name}の記憶石`)}{!compact && <><br /><small>{tr('踏破で記憶の欠片 +1')}{unique && <> · {tr('踏破宝箱限定')}：{tr(unique.name)}</>}</small></>}</span></p>;
}

export function MemoryGemSummary({ battle }: { battle: Battle }) {
  if (!battle.gemFinds?.length) return null;
  return <div className="memory-gem-summary"><h2><Gem size={20} />{tr('確保した記憶石')}</h2>{battle.gemFinds.map(gem => <div key={gem.id}><Gem size={14} /><span>{tr(gemName(gem))}</span></div>)}<p>{tr('記憶石は取得済みです。撤退・全滅でも失いません。')}</p></div>;
}
