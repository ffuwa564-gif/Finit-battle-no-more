import type { Battle, BattleEvent, Unit } from '../domain/types';
import { BLOOM_HEAL_PERCENT } from '../domain/battle-blooms';
import { tr } from '../locales/i18n';
import { assetPath } from '../content';
import { Button } from './index';
import './living-battle-frame.css';

/** Runway-painted garden pieces; growth and harvesting belong to the saved battle. */
export function LivingBattleFrame({ battle, event, units, busy, reducedMotion, onBloom }: {
  battle: Battle; event?: BattleEvent; units: Unit[]; busy: boolean; reducedMotion: boolean;
  onBloom: (id: string) => void;
}) {
  const actor = units.find(unit => unit.uid === event?.actorId);
  const cue = !event ? 'rest' : event.bloomAction === 'strike' ? 'strike-flower' : event.ultimate ? 'ultimate'
    : event.kind === 'heal' ? 'heal' : ['attack', 'area'].includes(event.kind) ? actor?.side === 'enemy' ? 'enemy' : 'attack'
    : event.kind === 'guard' || event.kind === 'buff' ? 'guard' : event.kind === 'wave' ? 'wave' : 'rest';
  const flower = battle.blooms?.flower;
  const growth = battle.blooms?.growth ?? (flower ? 3 : 0);
  const healing = flower?.kind === 'heal';
  const canHeal = units.some(unit => unit.side === 'party' && unit.hp > 0 && unit.hp < unit.maxHp);
  const label = tr(healing ? '癒しの花：最も傷ついた味方を最大HPの18%回復' : '月晶の花：弱った敵1体に追加攻撃');
  const frameArt = assetPath('living-garden-frame');
  const flowerArt = assetPath(healing ? 'living-garden-healing' : 'living-garden-crystal');
  return <div className="living-frame" data-cue={cue} data-reduced={reducedMotion} data-growth={growth} data-bloom-kind={flower?.kind}>
    <img className="garden-frame__art" src={frameArt} alt="" draggable={false} />
    {cue !== 'rest' && <div className="garden-frame__reaction" key={event?.id} aria-hidden="true">
      <img className="garden-frame__current" src={frameArt} alt="" />
      <span className="garden-frame__left-aura" /><span className="garden-frame__right-aura" />
      {event?.bloomAction && <span className={`garden-frame__harvest garden-frame__harvest--${event.bloomAction}`}>
        <img src={assetPath(event.bloomAction === 'heal' ? 'living-garden-healing' : 'living-garden-crystal')} alt="" />
      </span>}
    </div>}
    <div className="garden-frame__growth" role="progressbar" aria-label={tr('月の庭の成長')} aria-valuemin={0} aria-valuemax={3} aria-valuenow={growth}
      aria-valuetext={tr(flower ? '開花中。花をタップして力を使う' : '戦闘で庭が育つ。3つ灯るまでに花が咲く')}>
      {[0,1,2].map(index => <span key={index} className={`garden-frame__seed${growth > index ? ' is-lit' : ''}`} />)}
    </div>
    {flower && <Button className={`battle-bloom battle-bloom--${flower.kind}`} variant="secondary" sound={false}
      disabled={busy || battle.phase !== 'ready' || Boolean(healing && !canHeal)} aria-label={label} title={label} onClick={() => onBloom(flower.id)}>
      <img src={flowerArt} alt="" draggable={false} />
      <span>{healing ? `+${BLOOM_HEAL_PERCENT}%` : tr('攻撃')}</span>
    </Button>}
  </div>;
}
