import type { CSSProperties } from 'react';
import type { BattleEvent, BossBitPattern, Unit } from '../domain/types';
import { tr } from '../locales/i18n';
import './clockwork-bits.css';

/** Device state comes from replay snapshots; animation never advances combat. */
export function ClockworkBits({ boss, pattern, event, round }: {
  boss: Unit; pattern?: BossBitPattern; event?: BattleEvent; round: number;
}) {
  if (!pattern || !boss.boss || boss.hp <= 0) return null;
  const current = event?.bitAction && event.actorId === boss.uid ? event.unitsAfter?.find(unit => unit.uid === boss.uid) ?? boss : boss;
  const bits = current.bits;
  const firing = event?.bitAction === 'fire' && event.actorId === boss.uid;
  const deploying = event?.bitAction === 'deploy' && event.actorId === boss.uid;
  const remaining = bits ? Math.max(0, bits.expiresRound - round + 1) : 0;
  const next = (pattern.every - round % pattern.every) % pattern.every;
  return <div className={`clockwork-bits${firing ? ' is-firing' : ''}${deploying ? ' is-deploying' : ''}`} data-bit-count={bits?.count ?? 0}>
    <div className="clockwork-bits__devices" aria-hidden="true">
      {Array.from({ length: bits?.count ?? 0 }, (_, index) => <div key={`${event?.bitAction ? event.id : 'idle'}:${index}`} className={`clockwork-bit${firing && event.bitIndex === index ? ' is-shooting' : ''}`} style={{ '--bit-index': index } as CSSProperties}>
        <svg viewBox="0 0 80 100"><ellipse className="bit-ear" cx="27" cy="24" rx="8" ry="20" transform="rotate(-14 27 24)" /><ellipse className="bit-ear" cx="52" cy="24" rx="8" ry="20" transform="rotate(14 52 24)" /><circle className="bit-shell" cx="40" cy="59" r="27" /><path className="bit-seam" d="M14 59h52M40 33v52" /><circle className="bit-eye" cx="29" cy="54" r="5" /><circle className="bit-eye" cx="51" cy="54" r="5" /><circle className="bit-muzzle" cx="40" cy="72" r="9" /><circle className="bit-core" cx="40" cy="72" r="4" /><ellipse className="bit-ring" cx="40" cy="87" rx="34" ry="6" /></svg>
        <i className="clockwork-bit__beam" />
      </div>)}
    </div>
    <div className="clockwork-bits__status" role="status" aria-label={tr('うさぎビットの状態')}>
      <strong>{tr('うさぎビット')}</strong><span>{tr(bits ? deploying ? '展開完了 · 次ターン射撃' : `自動射撃 · 残り${remaining}ターン` : next === 0 ? 'このターンに展開' : `展開まで${next}ターン`)}</span>
    </div>
  </div>;
}
