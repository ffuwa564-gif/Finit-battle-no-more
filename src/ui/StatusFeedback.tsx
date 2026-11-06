import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowUp, ArrowDown, CloudFog, Moon, Zap, Heart, Shield, ShieldOff, Sparkles } from 'lucide-react';
import type { BattleEvent, SkillTemplate, Unit } from '../domain/types';
import type { ImpactSnapshot } from '../platform/combat-feedback';
import { statusNotices, type StatusNotice } from '../platform/status-feedback';
import { characterById } from '../content';
import { localize } from '../locales/i18n';
import './status-feedback.css';

const icons = {buff: ArrowUp, debuff: ArrowDown, confusion: CloudFog, sleep: Moon, paralysis: Zap, charm: Heart, barrier: Shield, break: ShieldOff, resist: Shield, recover: Sparkles};
type Positioned = StatusNotice & {id: string; x: number; y: number; named: boolean};
export function StatusFeedback({event, before, impact, round, template, reducedMotion}: {
  event?: BattleEvent; before: Unit[]; impact?: ImpactSnapshot; round: number; template?: SkillTemplate; reducedMotion: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const seen = useRef<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const [trail, setTrail] = useState<string>();
  const [entries, setEntries] = useState<Positioned[]>([]);
  useEffect(() => {
    if (!event || impact?.eventId !== event.id || (impact.units && impact.units !== event.unitsAfter) || seen.current === event.id) return;
    seen.current = event.id;
    const parent = root.current?.parentElement;
    if (!parent || document.hidden) return;
    const frame = parent.getBoundingClientRect();
    const notices = statusNotices(event, before, round, template);
    const placed: {x: number; y: number}[] = [];
    const next = notices.map((notice, index) => {
      const target = parent.querySelector(`[data-unit="${CSS.escape(notice.unitId)}"]`);
      const bounds = target?.getBoundingClientRect();
      const x = Math.max(106, Math.min(frame.width - 106, bounds ? bounds.left + bounds.width / 2 - frame.left : frame.width / 2));
      let y = Math.max(115, bounds ? bounds.top + bounds.height * (notice.side === 'party' ? .1 : .48) - frame.top : frame.height * .42);
      while (placed.some(point => Math.abs(point.x - x) < 200 && Math.abs(point.y - y) < 35)) y -= 35;
      placed.push({x, y});
      return {...notice, id: `${event.id}:${index}`, named: !bounds, x, y};
    });
    if (!reducedMotion && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const uid of new Set(notices.map(notice => notice.unitId))) {
        const target = parent.querySelector(`[data-unit="${CSS.escape(uid)}"]`);
        const summary = target?.querySelector('.unit-effects-summary') ?? target?.closest('.enemy-carousel')?.querySelector('.enemy-carousel-status .unit-effects');
        summary?.animate([{filter:'brightness(1)',scale:'1'}, {filter:'brightness(1.8)',scale:'1.15'}, {filter:'brightness(1)',scale:'1'}], {duration:500});
      }
    }
    const actor = event.statusAction === 'friendly_fire' && event.actorId ? parent.querySelector(`[data-unit="${CSS.escape(event.actorId)}"]`)?.getBoundingClientRect() : undefined;
    const targetId = event.targetIds?.find(id => id !== event.actorId);
    const target = actor && targetId ? parent.querySelector(`[data-unit="${CSS.escape(targetId)}"]`)?.getBoundingClientRect() : undefined;
    if (actor && target) {
      const ax = actor.left + actor.width / 2 - frame.left, ay = actor.top - frame.top;
      const tx = target.left + target.width / 2 - frame.left, ty = target.top - frame.top;
      setTrail(`M ${ax} ${ay} Q ${(ax+tx)/2} ${Math.min(ay,ty)-65} ${tx} ${ty}`);
    } else setTrail(undefined);
    clearTimeout(timer.current);
    setEntries(previous => previous.length || next.length ? next : previous);
    if (!next.length) return;
    timer.current = setTimeout(() => {setEntries([]);setTrail(undefined);}, 1500);
  }, [event, impact, before, round, template, reducedMotion]);
  return <div ref={root} className="status-feedback" data-reduced={reducedMotion} aria-live="off">
    {trail && <svg className="status-feedback__trail" aria-hidden="true"><path key={event?.id} d={trail} pathLength="1" /></svg>}
    {entries.map(entry => { const Icon = icons[entry.visual]; return <div key={entry.id} className="status-feedback__notice" data-status-unit={entry.unitId} data-status-visual={entry.visual} style={{left:entry.x, top:entry.y} as CSSProperties}>
      <span className="status-feedback__ripple" aria-hidden="true" />
      {entry.named && <small>{localize(characterById(entry.characterId).name)}</small>}
      <strong><Icon size={18} aria-hidden="true" />{localize(entry.label)}</strong>
    </div>; })}
  </div>;
}
