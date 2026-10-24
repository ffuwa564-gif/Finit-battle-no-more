import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Backpack, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, HPBar, UnitEffects } from './index';
import { emitUISound } from './interaction';
import { AnimatedIllustration } from './AnimatedIllustration';
import { EncounterCrest } from './Sigils';
import { assetPath, characterById, content } from '../content';
import type { BattleEvent, Unit } from '../domain/types';

export interface EnemyCarouselProps {
  units: Unit[];
  event?: BattleEvent;
  reducedMotion?: boolean;
  wave: number;
  waveCount: number;
  round: number;
  materials: number;
}

const actionKinds = new Set(['attack', 'area', 'heal', 'guard', 'buff', 'debuff', 'drop', 'dialogue']);

/** A single illustrated enemy page. Paging never changes combat or saved state. */
export function EnemyCarousel({ units, event, reducedMotion = false, wave, waveCount, round, materials }: EnemyCarouselProps) {
  const initial = units.find(unit => unit.hp > 0)?.uid ?? units[0]?.uid ?? '';
  const [selectedId, setSelectedId] = useState(initial);
  const selectedRef = useRef(initial);
  const [transition, setTransition] = useState<{ previous: Unit; direction: 1 | -1 } | null>(null);
  useEffect(() => {
    if (!transition) return;
    const timer = setTimeout(() => setTransition(null), 480);
    return () => clearTimeout(timer);
  }, [transition]);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const handledEvent = useRef<string | undefined>(undefined);
  const gesture = useRef<{ pointerId: number; x: number; y: number; horizontal: boolean } | null>(null);
  const temporaryActor = event && ['drop', 'dialogue'].includes(event.kind) ? event.actorId : undefined;
  const available = units.filter(unit => unit.hp > 0);
  const canChange = available.length > 1;
  const front = units.find(unit => unit.uid === selectedId) ?? available[0] ?? units[0];
  const reduced = reducedMotion || systemReducedMotion;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const focusUnit = useCallback((uid: string, direction?: 1 | -1) => {
    if (!units.some(unit => unit.uid === uid)) return;
    if (uid === selectedRef.current) return;
    const previous = units.find(unit => unit.uid === selectedRef.current);
    const from = units.findIndex(unit => unit.uid === selectedRef.current);
    const to = units.findIndex(unit => unit.uid === uid);
    setTransition(previous && !reduced ? { previous, direction: direction ?? (to >= from ? 1 : -1) } : null);
    selectedRef.current = uid;
    setSelectedId(uid);
  }, [units, reduced]);

  const changePage = useCallback((direction: 1 | -1) => {
    if (!canChange) return;
    const current = units.findIndex(unit => unit.uid === selectedRef.current);
    for (let distance = 1; distance <= units.length; distance++) {
      const index = (current + direction * distance + units.length * 2) % units.length;
      if (units[index].hp > 0) { focusUnit(units[index].uid, direction); emitUISound('select'); return; }
    }
  }, [canChange, units, focusUnit]);

  useLayoutEffect(() => {
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

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canChange || event.button !== 0 || (event.target as Element).closest('button')) return;
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      gesture.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    const dx = event.clientX - active.x, dy = event.clientY - active.y;
    if (!active.horizontal) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { gesture.current = null; return; }
      if (Math.abs(dx) <= 12 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      active.horizontal = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
  };
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (active.horizontal && Math.abs(event.clientX - active.x) >= 35) changePage(event.clientX < active.x ? 1 : -1);
  };
  const cancelGesture = () => { gesture.current = null; };

  if (!front) return null;
  const character = characterById(front.characterId);
  const sceneId = character.encounterArtId ?? character.artId;
  const scene = content.assets.find(asset => asset.id === sceneId);
  const previousCharacter = transition ? characterById(transition.previous.characterId) : undefined;
  const previousSceneId = previousCharacter?.encounterArtId ?? previousCharacter?.artId;
  const previousScene = content.assets.find(asset => asset.id === previousSceneId);
  const aliveIndex = available.findIndex(unit => unit.uid === front.uid);
  const position = aliveIndex < 0 ? '撃破' : `${aliveIndex + 1} / ${available.length}`;
  return <div className={`enemy-carousel${reduced ? ' enemy-carousel--reduced' : ''}`}
    role="group" aria-label="敵を切り替える" tabIndex={canChange ? 0 : -1}
    onKeyDown={event => { if ((event.target as Element).closest('button')) return; if (event.key === 'ArrowLeft') { event.preventDefault(); changePage(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); changePage(1); } }}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelGesture}
    onPointerLeave={() => { if (gesture.current && !gesture.current.horizontal) cancelGesture(); }} onLostPointerCapture={cancelGesture}>
    {transition && !reduced && <div className="enemy-page--outgoing" key={`outgoing-${transition.previous.uid}`} aria-hidden="true" style={{ '--page-direction': transition.direction } as CSSProperties}>
      <img className="enemy-page-art" src={assetPath(previousSceneId!)} alt="" draggable={false} style={{ objectPosition: previousScene?.anchor ?? '50% 30%' }} />
    </div>}
    <div className={`enemy-page${character.origin.includes('event') ? ' enemy-page--event' : ''}${transition && !reduced ? ' enemy-page--incoming' : ''}`} style={{ '--page-direction': transition?.direction ?? 1 } as CSSProperties} key={front.uid} data-enemy-id={front.uid} data-unit={front.uid} data-encounter-scene>
      {character.motionId && character.origin.includes('event') ? <AnimatedIllustration posterId={sceneId} motionId={character.motionId} alt={character.name} label={character.name} reducedMotion={reduced} /> : <img className="enemy-page-art" src={assetPath(sceneId)} alt="" draggable={false} style={{ objectPosition: scene?.anchor ?? '50% 30%' }} />}
    </div>
    <div className="enemy-carousel-status">
      <div className="enemy-carousel-name">{front.boss && <EncounterCrest />}<strong>{character.name}</strong><span className="enemy-carousel-constant" aria-label="難易度定数">{(character.strength / 10).toFixed(1)}</span></div>
      <HPBar hp={front.hp} maxHp={front.maxHp} label={`${character.name}のHP`} />
      <div className="enemy-carousel-meta">
        <span>Wave {wave}<small> / {waveCount}</small></span><span>ROUND {round}</span>
        <span className="enemy-carousel-meta__bag" data-bag aria-label={`仮取得素材 ${materials}個`}><Backpack size={15} /><strong>{materials}</strong></span>
      </div>
      <UnitEffects unit={front} round={round} />
    </div>
    {units.length > 1 && <div className="enemy-carousel-controls">
      <Button variant="icon" className="enemy-carousel-arrow" sound={false} aria-label="前の敵を表示" disabled={!canChange} onClick={() => changePage(-1)}><ChevronLeft size={19} /></Button>
      <div className="enemy-carousel-position" aria-live="polite" aria-atomic="true"><strong>{position}</strong></div>
      <Button variant="icon" className="enemy-carousel-arrow" sound={false} aria-label="次の敵を表示" disabled={!canChange} onClick={() => changePage(1)}><ChevronRight size={19} /></Button>
    </div>}
  </div>;
}
