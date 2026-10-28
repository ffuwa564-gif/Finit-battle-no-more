import type { Battle, BattleEvent, Unit } from '../domain/types';
import { useEffect, useState } from 'react';
import { useAnimationSettings } from './animation-settings';
import { tr } from '../locales/i18n';
import { assetPath } from '../content';
import { Button } from './index';
import './living-battle-frame.css';

/** Native alpha WebP plays actual Runway footage without a video-autoplay dependency. */
function GardenArt({ className, moving, poster, animate }: { className: string; moving: string; poster: string; animate: boolean }) {
  const [failed, setFailed] = useState(false);
  return <img className={className} src={assetPath(animate && !failed ? moving : poster)} alt="" draggable={false}
    data-animated={animate && !failed} onError={() => setFailed(true)} />;
}

/** One living frame; flower controls are invisible hit areas over the filmed garden beds. */
export function LivingBattleFrame({ battle, event, units, busy, reducedMotion, onBloom }: {
  battle: Battle; event?: BattleEvent; units: Unit[]; busy: boolean; reducedMotion: boolean;
  onBloom: (id: string) => void;
}) {
  const { suspended } = useAnimationSettings();
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setSystemReduced(preference.matches);
    const onVisibility = () => setVisible(!document.hidden);
    preference.addEventListener('change', onMotion); document.addEventListener('visibilitychange', onVisibility);
    return () => { preference.removeEventListener('change', onMotion); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);
  const motionOff = reducedMotion || systemReduced;
  const animate = !motionOff && !suspended && visible && !Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
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
  return <div className="living-frame" data-cue={cue} data-reduced={motionOff} data-growth={growth} data-bloom-kind={flower?.kind}>
    <GardenArt className="garden-frame__art" moving="living-garden-idle-motion" poster="living-garden-frame" animate={animate} />
    {flower && <GardenArt key={flower.id} className={`garden-frame__bloom-art garden-frame__bloom-art--${flower.kind}`}
      moving="living-garden-bloom-motion" poster="living-garden-bloom-poster" animate={animate} />}
    {cue !== 'rest' && <div className="garden-frame__reaction" key={event?.id} aria-hidden="true">
      <img className="garden-frame__current" src={frameArt} alt="" />
      <span className="garden-frame__left-aura" /><span className="garden-frame__right-aura" />

    </div>}
    <div className="garden-frame__growth" role="progressbar" aria-label={tr('月の庭の成長')} aria-valuemin={0} aria-valuemax={3} aria-valuenow={growth}
      aria-valuetext={tr(flower ? '開花中。花をタップして力を使う' : '戦闘で庭が育つ。3つ灯るまでに花が咲く')}>
      {[0,1,2].map(index => <span key={index} className={`garden-frame__seed${growth > index ? ' is-lit' : ''}`} />)}
    </div>
    {flower && <Button className={`battle-bloom battle-bloom--${flower.kind}`} variant="secondary" sound={false}
      disabled={busy || battle.phase !== 'ready' || Boolean(healing && !canHeal)} aria-label={label} onClick={() => onBloom(flower.id)} />}
  </div>;
}
