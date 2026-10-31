import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Heart, HeartPulse, Shield, ShieldCheck, Sparkles, Swords, Sword, Crosshair, WandSparkles, X, RotateCcw } from 'lucide-react';
import { Button, CharacterPortrait } from './index';
import { characterById, content } from '../content';
import { commandUnits, orderTargets, partyOrderOptions, type OrderOption } from '../domain/party-orders';
import type { Battle, BattleEvent, PartyOrder, Unit } from '../domain/types';
import { ultimateFor } from '../domain/ultimates';
import { tr } from '../locales/i18n';
import { emitUISound } from './interaction';
import './party-command-dial.css';

function ChoiceIcon({ template }: { template: string }) {
  const Icon = template === 'auto' ? RotateCcw : template === 'heal' || template === 'mend_pair' || template === 'barrier_mend' ? Heart : template === 'regen' ? HeartPulse : template === 'cleanse' ? Sparkles : template === 'barrier' || template === 'cover' ? ShieldCheck : template === 'guard' ? Shield : template === 'attack' ? Swords : template === 'skill_attack' ? Sword : template === 'pierce' ? Crosshair : template === 'ultimate' ? Sparkles : WandSparkles;
  return <Icon size={20} aria-hidden="true" />;
}
const orderId = (order?: PartyOrder) => order?.kind === 'skill' ? 'skill:' + order.skillId : order?.kind ?? 'auto';

/** Pointer capture keeps touch/pen/mouse on one continuous hold–drag–release path. */
export function PartyCommandDial({ unit, battle, onOrder }: { unit: Unit; battle: Battle; onOrder: (order: PartyOrder | null) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gesture = useRef<{ id: number; x: number; y: number; held: boolean } | undefined>(undefined);
  const suppressClick = useRef(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number }>();
  const [hover, setHover] = useState<string>();
  const options = partyOrderOptions(unit, { ...battle, units: commandUnits(battle).map(u => u.uid === unit.uid ? unit : u) }, content);
  const latest = useRef({ anchor, options, hover }); latest.current = { anchor, options, hover };
  const enabled = unit.hp > 0 && ['ready', 'playing'].includes(battle.phase);
  const points = options.map((option, index) => { const angle = (-80 + index * 160 / (options.length - 1)) * Math.PI / 180; return { ...option, dx: Math.cos(angle) * 112, dy: Math.sin(angle) * 112 }; });
  function close() { clearTimeout(timer.current); const id = gesture.current?.id; gesture.current = undefined; if (id !== undefined && root.current?.hasPointerCapture(id)) root.current.releasePointerCapture(id); setAnchor(undefined); setHover(undefined); }
  useEffect(() => { close(); return () => clearTimeout(timer.current); }, [battle.id, battle.wave]);
  useEffect(() => { if (!enabled) close(); }, [enabled]);
  useEffect(() => {
    const cancel = () => close();
    window.addEventListener('blur', cancel); window.addEventListener('resize', cancel); window.addEventListener('scroll', cancel, true);
    const visibility = () => { if (document.hidden) cancel(); };
    document.addEventListener('visibilitychange', visibility);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && latest.current.anchor) { event.preventDefault(); emitUISound('cancel'); close(); } };
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('blur', cancel); window.removeEventListener('resize', cancel); window.removeEventListener('scroll', cancel, true); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('keydown', escape); };
  }, []);
  function open() {
    if (!enabled) return;
    const rect = root.current?.querySelector('.portrait-image')?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({ x: Math.min(innerWidth - 155, Math.max(28, rect.x + rect.width / 2)), y: Math.min(innerHeight - 148, Math.max(145, rect.y + rect.height / 2)) });
    setHover(undefined); emitUISound('select');
  }
  function choose(option?: OrderOption) {
    if (option?.disabled) { emitUISound('cancel'); return; }
    if (option) onOrder(option.order);
    else emitUISound('cancel');
    close();
  }
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.button !== 0 || !(event.target as Element).closest('.character-portrait')) return;
    suppressClick.current = false; event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, held: false };
    timer.current = setTimeout(() => {
      if (!gesture.current || !root.current) return;
      gesture.current.held = true; suppressClick.current = true;
      root.current.setPointerCapture(gesture.current.id); open();
    }, 320);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    if (!active.held) { if (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 14) { clearTimeout(timer.current); gesture.current = undefined; } return; }
    event.preventDefault();
    const origin = latest.current.anchor;
    if (!origin) return;
    const dx = event.clientX - origin.x, dy = event.clientY - origin.y;
    const nearest = points.map(p => ({ ...p, distance: Math.hypot(dx - p.dx, dy - p.dy) })).sort((a,b) => a.distance - b.distance)[0];
    const next = Math.hypot(dx, dy) > 48 && nearest.distance < 34 ? nearest.id : undefined;
    if (next !== latest.current.hover) { latest.current.hover = next; setHover(next); if (next) emitUISound('select'); }
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    const active = gesture.current; clearTimeout(timer.current);
    if (!active || active.id !== event.pointerId) return;
    gesture.current = undefined;
    if (active.held) choose(latest.current.options.find(o => o.id === latest.current.hover));
    else { suppressClick.current = true; open(); }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const effectiveOrder = battle.partyOrder ?? (unit.ultimateQueued ? { kind: 'ultimate' as const } : undefined);
  const queued = options.find(o => o.id === orderId(effectiveOrder));
  const selected = options.find(o => o.id === hover);
  const visibleBattle = { ...battle, units: commandUnits(battle) };
  const targets = selected && selected.template !== 'auto' ? selected.order?.kind === 'guard' ? [unit] : selected.id === 'ultimate' && ['heal', 'barrier', 'rally'].includes(ultimateFor(characterById(unit.characterId)).template) ? visibleBattle.units.filter(u => u.side === 'party' && u.hp > 0) : orderTargets(unit, visibleBattle, selected.template) : [];
  const targetLabel = targets.length > 1 ? targets[0].side === 'party' ? targets.length === visibleBattle.units.filter(u => u.side === 'party' && u.hp > 0).length ? '味方全体' : `味方${targets.length}人` : '敵全体' : targets[0] ? characterById(targets[0].characterId).name : '';
  return <div ref={root} className={`party-pilot${anchor ? ' is-commanding' : ''}`} data-pilot onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={close} onLostPointerCapture={() => { if (gesture.current) close(); }} onContextMenu={e => e.preventDefault()} onDragStart={e => e.preventDefault()} onKeyDownCapture={e => { if (e.key === 'Enter' || e.key === ' ') suppressClick.current = false; }}>
    <CharacterPortrait variant="face" compact showRole={false} showName={false} character={characterById(unit.characterId)} leader={unit.characterId === battle.leaderId} hp={unit.hp} maxHp={unit.maxHp} disabled={!enabled} label={tr(`${characterById(unit.characterId).name}：行動を選ぶ`)} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } open(); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.command-dial__choice[aria-pressed="true"]')?.focus()); }} />
    <span className="party-pilot__mark" aria-hidden="true">Ⅰ</span>
    {effectiveOrder && queued && <span className="party-command-badge" role="status" aria-label={tr('行動を予約') + ': ' + tr(queued.label)}><ChoiceIcon template={queued.id === 'ultimate' ? 'ultimate' : queued.template} /></span>}
    {anchor && createPortal(<div className="command-dial-layer" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); close(); } }}>
      <button className="command-dial-dismiss" type="button" aria-label={tr('取消')} onClick={() => choose()} />
      <div role="group" aria-label={tr('行動を選ぶ')} className="command-dial" style={{ left: anchor.x, top: anchor.y } as CSSProperties}>
        <svg className="command-dial__arc" viewBox="-140 -140 280 280" aria-hidden="true"><path d="M 19 -110 A 112 112 0 0 1 19 110" /></svg>
        <Button className="command-dial__cancel" variant="icon" aria-label={tr('取消')} sound="cancel" onClick={close}><X size={18} /></Button>
        {points.map(point => <Button key={point.id} data-command={point.id} className={`command-dial__choice${point.disabled ? ' is-unavailable' : ''}${hover === point.id ? ' is-hovered' : ''}${point.id === 'ultimate' ? ' is-ultimate' : ''}`} variant="icon" sound={false} aria-label={tr(point.label)} aria-disabled={point.disabled} selected={point.id === orderId(effectiveOrder)} style={{ left: point.dx, top: point.dy }} onFocus={() => setHover(point.id)} onPointerEnter={() => { if (!gesture.current) setHover(point.id); }} onClick={() => choose(point)}>{point.id === 'ultimate' ? <Sparkles size={21} /> : <ChoiceIcon template={point.id.startsWith('skill:') && point.template === 'attack' ? 'skill_attack' : point.id.startsWith('skill:') && point.template === 'guard' ? 'cover' : point.template} />}</Button>)}
        <div className="command-dial__caption"><strong>{tr(selected?.label ?? '行動を選ぶ')}</strong>{targetLabel && <small>{tr(targetLabel)}</small>}<small>{tr(selected?.disabled ? '今は使用できません' : battle.phase === 'playing' ? '次ラウンドに予約' : 'このラウンドに予約')}</small></div>
      </div>
    </div>, document.body)}
  </div>;
}

/** Every cue comes from a real resolved action, never from a random cosmetic skill. */
export function CompanionChoice({ unit, battle, index, reducedMotion, hidden }: { unit: Unit; battle: Battle; index: number; reducedMotion: boolean; hidden?: boolean }) {
  const upcoming = battle.phase === 'playing' ? battle.events.slice(battle.cursor).find(e => e.actorId === unit.uid && ['attack', 'area', 'heal', 'guard', 'buff', 'debuff'].includes(e.kind) && e.actionSelection) : undefined;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    if (!upcoming || unit.hp <= 0 || hidden) return;
    const start = setTimeout(() => setVisible(true), reducedMotion ? 0 : index * 440);
    const end = setTimeout(() => setVisible(false), reducedMotion ? 1200 : index * 440 + 410);
    return () => { clearTimeout(start); clearTimeout(end); };
  }, [upcoming?.id, hidden, reducedMotion]);
  if (!upcoming || unit.hp <= 0 || hidden) return null;
  const skill = content.skills.find(s => s.id === upcoming.skillId);
  const label = upcoming.ultimate ? ultimateLabel(upcoming, unit) : skill?.name ?? (upcoming.kind === 'guard' ? '身を守る' : '通常攻撃');
  return <span className={`companion-choice${visible ? ' is-choosing' : ''}${reducedMotion ? ' is-reduced' : ''}`} data-choice-skill={upcoming.skillId ?? upcoming.kind} aria-label={tr(label)}>
    {visible && <span className="companion-choice__fan" aria-hidden="true"><i /><i /><i /><b /></span>}
    <span className="companion-choice__badge"><ChoiceIcon template={skill?.template ?? (upcoming.ultimate ? 'ultimate' : 'attack')} /></span>
  </span>;
}
function ultimateLabel(event: BattleEvent, unit: Unit) { return event.text.split(' — ')[1]?.split('（')[0] ?? characterById(unit.characterId).name; }
