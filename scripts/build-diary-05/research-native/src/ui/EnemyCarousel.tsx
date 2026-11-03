import { GameImage } from './GameMedia';
import { tr, localize } from '../locales/i18n';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Backpack, ChevronLeft, ChevronRight, Crown, MapPin, Crosshair } from 'lucide-react';
import { Button, HPBar, UnitEffects } from './index';
import { runUIInteraction } from './interaction';
import { AnimatedIllustration } from './AnimatedIllustration';
import { EncounterCrest } from './Sigils';
import { assetPath, characterById, content } from '../content';
import { ClockBossStatus } from './ClockBossStatus';
import { ClockworkBits, ClockworkBitStatus } from './ClockworkBits';
import { bossWindupStatus } from '../domain/boss-pressure';
import type { BattleEvent, BossBitPattern, DungeonDef, Unit } from '../domain/types';

export interface EnemyCarouselProps {
  targetId?: string;
  fixedNumbers?: boolean;
  onTarget?: (unitId: string) => void;
  onDisplay?: (unitId: string) => void;
  units: Unit[];
  bitPattern?: BossBitPattern;
  bossStrike?: DungeonDef['bossStrike'];
  bossClock?: DungeonDef['bossClock'];
  event?: BattleEvent;
  reducedMotion?: boolean;
  wave: number;
  waveCount: number;
  round: number;
  roundLimit?: number;
  materials: number;
}

const actionKinds = new Set(['attack', 'area', 'heal', 'guard', 'buff', 'debuff', 'drop', 'dialogue']);

/** Browsing only changes the front illustration; a battle command commits its target. */
export function EnemyCarousel({ units, bitPattern, bossStrike, bossClock, event, reducedMotion = false, wave, waveCount, round, roundLimit, materials, targetId, fixedNumbers = false, onTarget, onDisplay }: EnemyCarouselProps) {
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
  useLayoutEffect(() => { if (front) onDisplay?.(front.uid); }, [front?.uid, onDisplay]);

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
      if (units[index].hp > 0) { runUIInteraction(() => focusUnit(units[index].uid, direction), 'select'); return; }
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
    // A killing hit keeps its recipient and empty HP bar under the damage number.
    const receivingHit = current && event?.targetIds?.includes(current.uid);
    if (!current || current.hp <= 0 && current.uid !== temporaryActor && !receivingHit) {
      const next = units.find(unit => unit.hp > 0) ?? units.find(unit => unit.uid === temporaryActor) ?? units[0];
      if (next && next.uid !== selectedRef.current) focusUnit(next.uid);
    }
  }, [units, event, temporaryActor, focusUnit]);

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((!canChange && !onTarget) || event.button !== 0 || (event.target as Element).closest('button')) return;
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
    else if (!active.horizontal && Math.hypot(event.clientX - active.x, event.clientY - active.y) < 12 && front?.hp > 0) onTarget?.(front.uid);
  };
  const cancelGesture = () => { gesture.current = null; };

  if (!front) return null;
  const character = characterById(front.characterId);
  const sceneId = character.encounterArtId ?? character.artId;
  const scene = content.assets.find(asset => asset.id === sceneId);
  const portraitScene = Boolean(scene && scene.height > scene.width);
  const previousCharacter = transition ? characterById(transition.previous.characterId) : undefined;
  const previousSceneId = previousCharacter?.encounterArtId ?? previousCharacter?.artId;
  const previousScene = content.assets.find(asset => asset.id === previousSceneId);
  const previousPortraitScene = Boolean(previousScene && previousScene.height > previousScene.width);
  const aliveIndex = available.findIndex(unit => unit.uid === front.uid);
  const formationNumber = units.findIndex(unit => unit.uid === front.uid) + 1;
  // Keep the threat visible while browsing a guard or healer in front of the boss.
  const warningBoss = front.boss && front.hp > 0 ? front : available.find(unit => unit.boss);
  const pressure = warningBoss && bossStrike ? bossWindupStatus(warningBoss, bossStrike, round) : undefined;
  const turnsToStrike = bossStrike ? (bossStrike.every - round % bossStrike.every) % bossStrike.every : 0;
  const pressureLabel = pressure?.phase === 'charging' ? tr('崩しまで {0}').replace('{0}', String(pressure.remaining))
    : pressure?.phase === 'broken' ? tr('大技弱体')
    : pressure?.phase === 'open' ? tr('攻撃後の隙 +{0}%').replace('{0}', String(bossStrike?.windup?.recoveryPercent ?? 0))
    : tr(turnsToStrike === 0 ? 'このターンに大技' : `大技まで${turnsToStrike}ターン`);
  const position = fixedNumbers ? `${formationNumber} / ${units.length}` : aliveIndex < 0 ? '撃破' : `${aliveIndex + 1} / ${available.length}`;
  const forecast = warningBoss && bossStrike && <div className={`boss-strike-status${event?.bossStrike && event.actorId === warningBoss.uid ? ' is-striking' : ''}${pressure?.phase === 'open' ? ' is-open' : ''}${pressure?.phase === 'broken' ? ' is-broken' : ''}`} role="status" aria-label={tr('ボスの大技予告')} data-boss-id={warningBoss.uid} data-boss-pressure={pressure?.phase}>
      <Crown size={13} /><span><strong>{tr(bossStrike.name)}</strong><span>{pressureLabel}{bossStrike.target === 'pilot' && pressure?.phase !== 'open' && <> · {tr('先頭狙い')}</>}</span>
        <ClockworkBitStatus boss={warningBoss} pattern={bitPattern} event={event} round={round} inline />
        {pressure?.phase === 'charging' && <span className="boss-strike-status__meter" aria-hidden="true"><i style={{ width: `${Math.min(100, pressure.damage / pressure.threshold * 100)}%` }} /></span>}
      </span>
    </div>;
  const controls = localize(units.length > 1 && <div className="enemy-carousel-controls">
      <Button variant="icon" className="enemy-carousel-arrow" sound={false} aria-label={tr("前の敵を表示")} disabled={!canChange} onClick={() => changePage(-1)}><ChevronLeft size={19} /></Button>
      <div className="enemy-carousel-position" aria-live="polite" aria-atomic="true"><strong>{localize(position)}</strong></div>
      <Button variant="icon" className="enemy-carousel-arrow" sound={false} aria-label={tr("次の敵を表示")} disabled={!canChange} onClick={() => changePage(1)}><ChevronRight size={19} /></Button>
    </div>);
  return <div className={`enemy-carousel${portraitScene ? ' enemy-carousel--portrait' : ''}${reduced ? ' enemy-carousel--reduced' : ''}`}
    role="group" aria-label={tr("敵を切り替える")} tabIndex={canChange ? 0 : -1}
    onKeyDown={event => { if ((event.target as Element).closest('button')) return; if (event.key === 'ArrowLeft') { event.preventDefault(); changePage(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); changePage(1); } }}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelGesture}
    onPointerLeave={() => { if (gesture.current && !gesture.current.horizontal) cancelGesture(); }} onLostPointerCapture={cancelGesture}>
    {localize(transition && !reduced && <div className={`enemy-page--outgoing${previousPortraitScene ? ' enemy-page--portrait' : ''}`} key={`outgoing-${transition.previous.uid}`} aria-hidden="true" style={{ '--page-direction': transition.direction } as CSSProperties}>
      <GameImage className="enemy-page-art" src={assetPath(previousSceneId!)} alt={tr("")} draggable={false} style={{ objectPosition: previousPortraitScene ? '50% 0%' : previousScene?.anchor ?? '50% 30%' }} />
    </div>)}
    <div className={`enemy-page${portraitScene ? ' enemy-page--portrait' : ''}${transition && !reduced ? ' enemy-page--incoming' : ''}`} style={{ '--page-direction': transition?.direction ?? 1 } as CSSProperties} key={front.uid} data-enemy-id={front.uid} data-unit={front.uid} data-encounter-scene>
      {localize(character.motionId ? <AnimatedIllustration posterId={sceneId} motionId={character.motionId} alt={tr(character.name)} label={tr(character.name)} reducedMotion={reduced} /> : <GameImage className="enemy-page-art" src={assetPath(sceneId)} alt={tr("")} draggable={false} style={{ objectPosition: portraitScene ? '50% 0%' : scene?.anchor ?? '50% 30%' }} />)}
    </div>
    {front.uid === targetId && front.hp > 0 && <><MapPin className="enemy-target-pin" aria-label={tr('狙っている敵')} /><span className="enemy-target-ring" aria-hidden="true" /></>}
    {onTarget && front.hp > 0 && <Button className="enemy-target-button" variant="icon" sound={false} selected={front.uid === targetId} aria-label={tr('この敵を狙う')} onClick={() => onTarget(front.uid)}><Crosshair size={18} /></Button>}

    <ClockBossStatus boss={front} pattern={bossClock} event={event} round={round} reducedMotion={reduced} />
    <ClockworkBits boss={warningBoss ?? front} pattern={bitPattern} event={event} round={round} hideStatus={Boolean(bossStrike)} />
    <div className="enemy-carousel-status">
      <div className="enemy-carousel-name">{localize(front.boss && <EncounterCrest />)}<strong>{fixedNumbers && <span className="enemy-formation-number">#{formationNumber} </span>}{localize(character.name)}{character.encounterLoot && <span className="enemy-rare-label" aria-label={tr("希少な敵")}>RARE</span>}</strong><span className="enemy-carousel-constant" aria-label={tr("難易度定数")}>{localize((character.strength / 10).toFixed(1))}</span></div>
      <HPBar hp={front.hp} maxHp={front.maxHp} label={tr(`${character.name}のHP`)} />
      <div className="enemy-carousel-meta">
        <span>Wave {localize(wave)}<small> / {localize(waveCount)}</small></span><span>ROUND {localize(round)}{roundLimit && <small> / {localize(roundLimit)}</small>}</span>
        <span className="enemy-carousel-meta__bag" data-bag aria-label={tr(`仮取得素材 ${materials}個`)}><Backpack size={15} /><strong>{localize(materials)}</strong></span>
      </div>
      <UnitEffects unit={front} round={round} />
    </div>
    {targetId && front.uid !== targetId && available.some(u => u.uid === targetId) && <Button className="enemy-target-return" variant="icon" sound="select" aria-label={tr('狙っている敵を表示')} onClick={() => focusUnit(targetId)}><MapPin size={15} /></Button>}
    {forecast ? <div className="enemy-forecast-layout">{controls}{forecast}</div> : controls}
  </div>;
}
