import type { CSSProperties } from 'react';
import type { Unit } from '../domain/types';
import { ultimateCharge } from '../domain/ultimates';
import { tr } from '../locales/i18n';
import './ultimates.css';

export function UltimateMeter({ unit }: { unit: Unit }) {
  const charge = ultimateCharge(unit);
  return <div className="ultimate-meter" role="meter" aria-label={tr('必殺ゲージ')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={charge} style={{ '--ultimate-charge': `${charge}%` } as CSSProperties}>
    <span className="ultimate-meter__fill" /><span className="ultimate-meter__label">{unit.hp <= 0 ? '—' : tr(unit.ultimateQueued ? '発動予約' : charge >= 100 ? '必殺 READY' : `必殺 ${charge}%`)}</span>
  </div>;
}
