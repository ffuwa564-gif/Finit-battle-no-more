import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, HPBar } from './index';
import { EncounterCrest } from './Sigils';
import { assetPath, characterById, content } from '../content';
import type { BattleEvent, Unit } from '../domain/types';

export interface EnemyCarouselProps {
  units: Unit[];
  event?: BattleEvent;
  reducedMotion?: boolean;
}

const TAU = Math.PI * 2;
const actionKinds = new Set(['attack', 'area', 'heal', 'guard', 'buff', 'debuff', 'drop', 'dialogue']);

/** Rotates the presentation only. Positioning and actor animation use separate DOM nodes. */
export function EnemyCarousel({ units, event, reducedMotion = false }: EnemyCarouselProps) {
  const initial = units.find(unit => unit.hp > 0)?.uid ?? units[0]?.uid ?? '';
  const initialIndex = Math.max(0, units.findIndex(unit => unit.uid === initial));
  const initialAngle = units.length ? -initialIndex * TAU / units.length : 0;
  const [selectedId, setSelectedId] = useState(initial);
  const selectedRef = useRef(initial);
  const [rotation, setRotation] = useState(initialAngle);
  const rotationRef = useRef(initialAngle);
  const targetRef = useRef(initialAngle);
  const frameRef = useRef<number | null>(null);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const handledEvent = useRef<string | undefined>(undefined);
  const drag = useRef<{ pointerId: number; x: number; y: number; rotation: number; horizontal: boolean } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const step = units.length ? TAU / units.length : TAU;
  const temporaryActor = event && ['drop', 'dialogue'].includes(event.kind) ? event.actorId : undefined;
  const available = units.filter(unit => unit.hp > 0);
  const canRotate = available.length > 1;
  const front = units.find(unit => unit.uid === selectedId) ?? units.find(unit => unit.hp > 0) ?? units[0];
  const reduced = reducedMotion || systemReducedMotion;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const setAngle = useCallback((angle: number) => {
    rotationRef.current = angle;
    setRotation(angle);
  }, []);

  const animateTo = useCallback((target: number) => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    targetRef.current = target;
    if (reduced || Math.abs(target - rotationRef.current) < 0.0001) { frameRef.current = null; setAngle(target); return; }
    const start = rotationRef.current;
    const started = performance.now();
    const tick = (time: number) => {
      const progress = Math.min(1, (time - started) / 430);
      const eased = 1 - (1 - progress) ** 3;
      setAngle(start + (target - start) * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
      else frameRef.current = null;
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [reduced, setAngle]);

  const focusUnit = useCallback((uid: string, direction?: 1 | -1) => {
    const index = units.findIndex(unit => unit.uid === uid);
    if (index < 0) return;
    const reference = direction ? targetRef.current : rotationRef.current;
    const base = -index * step;
    let target = base + Math.round((reference - base) / TAU) * TAU;
    if (direction === 1 && target >= reference - 0.001) target -= TAU;
    if (direction === -1 && target <= reference + 0.001) target += TAU;
    selectedRef.current = uid;
    setSelectedId(uid);
    animateTo(target);
  }, [units, step, animateTo]);

  const rotate = useCallback((direction: 1 | -1) => {
    if (!canRotate) return;
    const current = units.findIndex(unit => unit.uid === selectedRef.current);
    for (let distance = 1; distance <= units.length; distance++) {
      const index = (current + direction * distance + units.length * 2) % units.length;
      if (units[index].hp > 0) { focusUnit(units[index].uid, direction); return; }
    }
  }, [canRotate, units, focusUnit]);

  useEffect(() => {
    if (event?.id !== handledEvent.current) {
      handledEvent.current = event?.id;
      if (event && actionKinds.has(event.kind)) {
        const actor = units.find(unit => unit.uid === event.actorId);
        const target = units.find(unit => event.targetIds?.includes(unit.uid));
        const acting = actor && (actor.hp > 0 || actor.uid === temporaryActor) ? actor : target;
        if (acting) { focusUnit(acting.uid); return; }
      }
    }
    const current = units.find(unit => unit.uid === selectedRef.current);
    if (!current || current.hp <= 0 && current.uid !== temporaryActor) {
      const next = units.find(unit => unit.hp > 0) ?? units.find(unit => unit.uid === temporaryActor) ?? units[0];
      if (next && next.uid !== selectedRef.current) focusUnit(next.uid);
    }
  }, [units, event, temporaryActor, focusUnit]);

  useEffect(() => () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); }, []);

  const pointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!canRotate || e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    drag.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, rotation: rotationRef.current, horizontal: false };
  };
  const pointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    // Before horizontal intent we deliberately do not capture, so a mouse release
    // outside the frame must never turn the next hover into a drag.
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      if (gesture.horizontal) animateTo(targetRef.current);
      drag.current = null;
      return;
    }
    const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
    if (!gesture.horizontal) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; }
      if (Math.abs(dx) <= 12 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      gesture.horizontal = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    }
    e.preventDefault();
    const width = viewport.current?.clientWidth ?? 350;
    setAngle(gesture.rotation + dx / width * Math.PI);
  };
  const pointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    drag.current = null;
    if (gesture.horizontal) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      const distance = e.clientX - gesture.x;
      if (Math.abs(distance) >= 35) {
        const width = viewport.current?.clientWidth ?? 350;
        const steps = Math.min(units.length * 2, Math.max(1, Math.round(Math.abs(distance) / (width * step / Math.PI))));
        for (let index = 0; index < steps; index++) rotate(distance < 0 ? 1 : -1);
      } else animateTo(targetRef.current);
    }
  };
  const pointerCancel = () => { if (drag.current?.horizontal) animateTo(targetRef.current); drag.current = null; };

  if (!front) return null;
  const character = characterById(front.characterId);
  const aliveIndex = available.findIndex(unit => unit.uid === front.uid);
  const position = aliveIndex < 0 ? '撃破' : `${aliveIndex + 1} / ${available.length}`;
  return <div className={`enemy-carousel${reduced ? ' enemy-carousel--reduced' : ''}${canRotate ? ' enemy-carousel--multiple' : ''}`}
    ref={viewport} role="group" aria-label="敵の表示を回す" tabIndex={canRotate ? 0 : -1}
    onKeyDown={e => { if ((e.target as HTMLElement).closest('button')) return; if (e.key === 'ArrowLeft') { e.preventDefault(); rotate(-1); } if (e.key === 'ArrowRight') { e.preventDefault(); rotate(1); } }}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerCancel}
    onPointerLeave={() => { if (drag.current && !drag.current.horizontal) drag.current = null; }} onLostPointerCapture={pointerCancel}>
    <div className="enemy-carousel-status">
      <div className="enemy-carousel-name">{front.boss && <EncounterCrest />}<strong>{character.name}</strong><span className="enemy-carousel-constant" aria-label="難易度定数">{(character.strength / 10).toFixed(1)}</span></div>
      <HPBar hp={front.hp} maxHp={front.maxHp} label={`${character.name}のHP`} />
    </div>
    <div className="enemy-orbit" aria-hidden="true">
      {units.map((unit, index) => {
        const theta = rotation + index * step;
        const depth = (1 + Math.cos(theta)) / 2;
        const isFront = unit.uid === front.uid;
        const visible = unit.hp > 0 || unit.uid === temporaryActor;
        const style = {
          '--orbit-x': `${Math.sin(theta) * 120}px`,
          '--orbit-y': `${(1 - depth) * -140}px`,
          '--orbit-scale': 0.3 + depth * 0.7,
          '--orbit-alpha': visible ? (unit.hp <= 0 ? 0.24 : 0.72 + depth * 0.28) : 0,
          '--orbit-blur': `${(1 - depth) * 1.2}px`,
          '--orbit-light': 0.72 + depth * 0.28,
          '--orbit-saturation': 0.55 + depth * 0.45,
          zIndex: Math.round(depth * 10) + 1,
        } as CSSProperties;
        const def = characterById(unit.characterId);
        const art = content.assets.find(asset => asset.id === def.artId);
        const portraitArt = art ? art.height > art.width : false;
        return <div key={unit.uid} data-enemy-id={unit.uid} className={`enemy-orbit-slot${isFront ? ' is-front' : ''}${unit.hp <= 0 ? ' is-defeated' : ''}`} style={style}>
          <div className="enemy-orbit-actor" data-unit={unit.uid}><img className={`enemy-orbit-art${portraitArt ? ' enemy-orbit-art--portrait' : ''}`} src={assetPath(def.artId)} alt="" draggable={false} /></div>
        </div>;
      })}
    </div>
    {units.length > 1 && <div className="enemy-carousel-controls">
      <Button variant="icon" className="enemy-carousel-arrow" aria-label="前の敵を表示" disabled={!canRotate} onClick={() => rotate(-1)}><ChevronLeft size={19} /></Button>
      <div className="enemy-carousel-position" aria-live="polite" aria-atomic="true"><strong>{position}</strong><span>{canRotate ? '左右に回して確認' : '残る敵'}</span></div>
      <Button variant="icon" className="enemy-carousel-arrow" aria-label="次の敵を表示" disabled={!canRotate} onClick={() => rotate(1)}><ChevronRight size={19} /></Button>
    </div>}
  </div>;
}
