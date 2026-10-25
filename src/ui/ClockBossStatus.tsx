import { Clock3, Shield, ShieldOff } from 'lucide-react';
import { tr } from '../locales/i18n';
import type { BattleEvent, BossClock, Unit } from '../domain/types';
import './clock-boss.css';

/** Forecasts the same fixed shield and deadline used by the engine, following replay snapshots. */
export function ClockBossStatus({ boss, pattern, event, round, reducedMotion }: {
  boss: Unit; pattern?: BossClock; event?: BattleEvent; round: number; reducedMotion: boolean;
}) {
  if (!pattern || !boss.boss || boss.hp <= 0) return null;
  const pending = (boss.barrierUntil ?? -1) < round;
  const broken = !pending && !(boss.barrier && boss.barrier > 0);
  const striking = event?.clockAction === 'finale' && event.actorId === boss.uid;
  const turns = Math.max(0, pattern.deadline - round);
  return <>
    <div aria-hidden="true" className={`clock-ward${broken ? ' is-broken' : ''}${pending ? ' is-pending' : ''}${reducedMotion ? ' is-reduced' : ''}${event?.clockAction === 'break' ? ' is-breaking' : ''}`} />
    <div className={`clock-boss-status${broken ? ' is-broken' : ''}${striking ? ' is-striking' : ''}`} role="status" aria-label={tr('大時計の障壁と終鐘')} data-clock-state={striking ? 'finale' : pending ? 'renewing' : broken ? 'broken' : 'shielded'}>
      <span>{broken ? <ShieldOff size={13} /> : <Shield size={13} />}{tr(pending ? '障壁再生待ち' : broken ? '障壁破壊・防御低下' : '障壁 {0}').replace('{0}', String(boss.barrier ?? pattern.shield))}</span>
      <span><Clock3 size={13} />{tr(turns ? '終鐘まで {0}T' : '終鐘・発動').replace('{0}', String(turns))}</span>
    </div>
  </>;
}
