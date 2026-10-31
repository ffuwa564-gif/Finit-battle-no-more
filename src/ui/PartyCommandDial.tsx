import { gemSkill } from '../domain/memory-gems';
import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Heart, HeartPulse, Shield, ShieldCheck, Sparkles, Swords, Sword, Crosshair, WandSparkles, X, RotateCcw, Eye, Hand, MoreHorizontal, CircleHelp } from 'lucide-react';
import { Button, CharacterPortrait } from './index';
import { characterById, content } from '../content';
import { commandUnits, orderTargets, partyOrderOptions, type OrderOption } from '../domain/party-orders';
import type { Battle, BattleEvent, PartyOrder, Unit } from '../domain/types';
import type { CompanionSignal } from '../domain/companion-behavior';
import { ultimateFor } from '../domain/ultimates';
import { tr } from '../locales/i18n';
import { emitUISound } from './interaction';
import './party-command-dial.css';

function ChoiceIcon({ template }: { template: string }) {
  const Icon = template === 'auto' ? RotateCcw : template === 'heal' || template === 'mend_pair' || template === 'barrier_mend' ? Heart : template === 'regen' ? HeartPulse : template === 'cleanse' ? Sparkles : template === 'barrier' || template === 'cover' ? ShieldCheck : template === 'guard' ? Shield : template === 'attack' ? Swords : template === 'skill_attack' ? Sword : template === 'pierce' ? Crosshair : template === 'ultimate' ? Sparkles : WandSparkles;
  return <Icon size={20} aria-hidden="true" />;
}
function revealedTargets(ids: string[], battle: Battle): string {
  const units = ids.flatMap(id => battle.units.filter(unit => unit.uid === id));
  const enemies = battle.units.filter(unit => unit.side === 'enemy');
  return units.map(unit => unit.side === 'enemy' ? `#${enemies.findIndex(enemy => enemy.uid === unit.uid) + 1}` : tr(characterById(unit.characterId).name)).join(' · ');
}
const orderId = (order?: PartyOrder) => order?.kind === 'skill' ? 'skill:' + order.skillId : order?.kind ?? 'auto';

/** Pointer capture keeps touch/pen/mouse on one continuous hold–drag–release path. */
export function PartyCommandDial({ unit, battle, targetId, onOrder }: { unit: Unit; battle: Battle; targetId?: string; onOrder: (order: PartyOrder | null) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gesture = useRef<{ id: number; x: number; y: number; held: boolean } | undefined>(undefined);
  const suppressClick = useRef(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number }>();
  const [hover, setHover] = useState<string>();
  const options = partyOrderOptions(unit, { ...battle, units: commandUnits(battle).map(u => u.uid === unit.uid ? unit : u) }, content);
  const latest = useRef({ anchor, options, hover }); latest.current = { anchor, options, hover };
  const enabled = unit.hp > 0 && ['ready', 'playing'].includes(battle.phase);
  // Keep adjacent 44px square touch targets apart even along a diagonal.
  const radius = Math.max(88, Math.ceil(33 / Math.sin(80 * Math.PI / 180 / (options.length - 1))));
  const points = options.map((option, index) => { const angle = (-80 + index * 160 / (options.length - 1)) * Math.PI / 180; return { ...option, dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius }; });
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
    setAnchor({ x: Math.min(innerWidth - radius - 30, Math.max(28, rect.x + rect.width / 2)), y: Math.min(innerHeight - radius - 28, Math.max(radius + 70, rect.y + rect.height / 2)) });
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
    const next = Math.hypot(dx, dy) > 40 && nearest.distance < 27 ? nearest.id : undefined;
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
  const visibleBattle = { ...battle, focusTargetId: targetId ?? battle.focusTargetId, units: commandUnits(battle) };
  const targets = selected && selected.template !== 'auto' ? selected.order?.kind === 'guard' ? [unit] : selected.id === 'ultimate' && ['heal', 'barrier', 'rally'].includes(ultimateFor(characterById(unit.characterId)).template) ? visibleBattle.units.filter(u => u.side === 'party' && u.hp > 0) : orderTargets(unit, visibleBattle, selected.template, selected.order?.kind === 'skill' ? selected.order.skillId : undefined) : [];
  const targetLabel = targets.length > 1 ? targets[0].side === 'party' ? targets.length === visibleBattle.units.filter(u => u.side === 'party' && u.hp > 0).length ? '味方全体' : `味方${targets.length}人` : '敵全体' : targets[0] ? characterById(targets[0].characterId).name : '';
  const targetNumber = content.dungeons.find(d => d.id === battle.dungeonId)?.coordination && targets.length === 1 && targets[0].side === 'enemy' ? '#' + (battle.units.filter(candidate => candidate.side === 'enemy').findIndex(candidate => candidate.uid === targets[0].uid) + 1) : '';
  return <div ref={root} className={`party-pilot${anchor ? ' is-commanding' : ''}`} data-pilot onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={close} onLostPointerCapture={() => { if (gesture.current) close(); }} onContextMenu={e => e.preventDefault()} onDragStart={e => e.preventDefault()} onKeyDownCapture={e => { if (e.key === 'Enter' || e.key === ' ') suppressClick.current = false; }}>
    <CharacterPortrait variant="face" compact showRole={false} showName={false} character={characterById(unit.characterId)} leader={unit.characterId === battle.leaderId} hp={unit.hp} maxHp={unit.maxHp} disabled={!enabled} label={tr(`${characterById(unit.characterId).name}：行動を選ぶ`)} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } open(); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.command-dial__choice[aria-pressed="true"]')?.focus()); }} />
    <span className="party-pilot__mark" aria-hidden="true">Ⅰ</span>
    {effectiveOrder && queued && <span className="party-command-badge" role="status" aria-label={tr('行動を予約') + ': ' + tr(queued.label)}><ChoiceIcon template={queued.id === 'ultimate' ? 'ultimate' : queued.template} /></span>}
    {anchor && createPortal(<div className="command-dial-layer" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); close(); } }}>
      <button className="command-dial-dismiss" type="button" aria-label={tr('取消')} onClick={() => choose()} />
      <div role="group" aria-label={tr('行動を選ぶ')} className="command-dial" style={{ left: anchor.x, top: anchor.y } as CSSProperties}>
        <svg className="command-dial__arc" viewBox="-112 -112 224 224" aria-hidden="true" style={{ transform: `scale(${radius / 88})` }}><path d="M 15 -87 A 88 88 0 0 1 15 87" /></svg>
        <Button className="command-dial__cancel" variant="icon" aria-label={tr('取消')} sound="cancel" onClick={close}><X size={18} /></Button>
        {points.map(point => <Button key={point.id} data-command={point.id} className={`command-dial__choice${point.disabled ? ' is-unavailable' : ''}${hover === point.id ? ' is-hovered' : ''}${point.id === 'ultimate' ? ' is-ultimate' : ''}`} variant="icon" sound={false} aria-label={tr(point.label)} aria-disabled={point.disabled} selected={point.id === orderId(effectiveOrder)} style={{ left: point.dx, top: point.dy }} onFocus={() => setHover(point.id)} onPointerEnter={() => { if (!gesture.current) setHover(point.id); }} onClick={() => choose(point)}>{point.id === 'ultimate' ? <Sparkles size={21} /> : <ChoiceIcon template={point.id.startsWith('skill:') && point.template === 'attack' ? 'skill_attack' : point.id.startsWith('skill:') && point.template === 'guard' ? 'cover' : point.template} />}</Button>)}
        <div className="command-dial__caption" style={{ bottom: radius + 36 }}><strong>{tr(selected?.label ?? '行動を選ぶ')}</strong>{targetLabel && <small>{targetNumber && <>{targetNumber} · </>}{tr(targetLabel)}</small>}<small className="command-dial__timing">{tr(selected?.disabled ? '今は使用できません' : battle.phase === 'playing' ? '次ラウンドに予約' : 'このラウンドに予約')}</small></div>
      </div>
    </div>, document.body)}
  </div>;
}

/** Keep the chosen action above its portrait until that real action has played. */
export function CompanionChoice({ unit, battle, index, reducedMotion, hidden, signal, onInspect }: { unit: Unit; battle: Battle; index: number; reducedMotion: boolean; hidden?: boolean; signal?: CompanionSignal; onInspect?: () => void }) {
  const upcoming = battle.phase === 'playing' ? battle.events.slice(battle.cursor).find(e => e.actorId === unit.uid && ['attack', 'area', 'heal', 'guard', 'buff', 'debuff'].includes(e.kind) && e.actionSelection) : undefined;
  const cueKey = upcoming?.id ?? (signal ? `${battle.id}:${battle.wave}:${battle.round}:${unit.uid}` : undefined);
  const host = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; width: number }>();
  const [cue, setCue] = useState<{ id: string; stage: 'choosing' | 'selected' }>();
  useLayoutEffect(() => {
    if (!cueKey || hidden) return;
    const place = () => {
      const r = host.current?.getBoundingClientRect();
      if (r) setPosition({ left: r.left + r.width / 2, top: r.top - 8, width: r.width + 2 });
    };
    place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [cueKey, hidden]);
  useEffect(() => {
    setCue(undefined);
    if (!upcoming || unit.hp <= 0 || hidden) return;
    if (reducedMotion) { setCue({ id: upcoming.id, stage: 'selected' }); return; }
    const start = setTimeout(() => setCue({ id: upcoming.id, stage: 'choosing' }), index * 180);
    const finish = setTimeout(() => setCue({ id: upcoming.id, stage: 'selected' }), index * 180 + 620);
    return () => { clearTimeout(start); clearTimeout(finish); };
  }, [upcoming?.id, hidden, reducedMotion, index, unit.hp <= 0]);
  if ((!upcoming && !signal) || unit.hp <= 0 || hidden) return null;
  const stage = signal ? 'reading' : cue?.id === upcoming?.id ? cue!.stage : 'waiting';
  const memory = battle.memoryGems?.[unit.characterId];
  const memorySkill = memory ? gemSkill(memory) : undefined;
  const skill = content.skills.find(s => s.id === upcoming?.skillId) ?? (memorySkill?.id === upcoming?.skillId ? memorySkill : undefined);
  const label = signal?.label ?? (upcoming!.ultimate ? ultimateLabel(upcoming!, unit) : skill?.name ?? (upcoming!.kind === 'guard' ? '身を守る' : '通常攻撃'));
  const template = upcoming?.ultimate ? 'ultimate' : skill?.template ?? (upcoming?.kind === 'guard' ? 'guard' : 'attack');
  const target = upcoming ? revealedTargets(upcoming.targetIds ?? [], battle) : '';
  const Gesture = signal?.cue === 'weapon' ? Hand : signal?.cue === 'watch' ? Eye : signal?.cue === 'uncertain' ? CircleHelp : MoreHorizontal;
  const bubbleContents = signal ? <><Gesture aria-hidden="true" size={14} /><span className="companion-choice__text"><span className="companion-choice__label">{tr(label)}</span></span></> : stage === 'choosing' ? <span className="companion-choice__options" aria-hidden="true"><Sword size={13} /><Shield size={13} /><ChoiceIcon template={template} /><i /></span> : <><ChoiceIcon template={template} /><span className="companion-choice__text"><span className="companion-choice__label">{tr(label)}</span>{target && <small className="companion-choice__target">→ {target}</small>}</span></>;
  return <span ref={host} className={`companion-choice${stage === 'choosing' ? ' is-choosing' : ''}${reducedMotion ? ' is-reduced' : ''}`} data-choice-state={stage} data-choice-skill={upcoming?.skillId ?? upcoming?.kind} aria-label={signal ? tr('仲間の仕草') : tr(label) + (target ? ' → ' + target : '')}>
    {position && createPortal(signal ? <button type="button" className="companion-choice__bubble companion-signal" data-choice-state="reading" style={position} onClick={() => { emitUISound('confirm'); onInspect?.(); }} aria-label={tr(`${characterById(unit.characterId).name}の戦い方`)}>{bubbleContents}</button> : <span className="companion-choice__bubble" data-choice-state={stage} style={position}>{bubbleContents}</span>, document.body)}
    {!signal && <span className="companion-choice__badge"><ChoiceIcon template={template} /></span>}
  </span>;
}
function ultimateLabel(event: BattleEvent, unit: Unit) { return event.ultimateName ?? ultimateFor(characterById(unit.characterId)).name; }
