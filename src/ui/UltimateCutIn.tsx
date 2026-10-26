import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { assetPath, characterById, content } from '../content';
import { ultimateFor, type UltimateTheme } from '../domain/ultimates';
import type { BattleEvent, CharacterDef, Unit } from '../domain/types';
import { tr } from '../locales/i18n';
import { ultimateVisualFor } from '../platform/ultimate-choreography';
import { ULTIMATE_TIMING, UltimateClock } from '../platform/ultimate-timing';
import { PortraitArt } from './PortraitArt';
import './ultimates.css';

function FallbackImpact({ theme }: { theme: UltimateTheme }) {
  return <svg className={`ultimate-fallback ultimate-fallback--${theme}`} viewBox="0 0 400 400" aria-hidden="true">
    {theme === 'blade' ? <><path d="M45 340 330 65 145 320 355 110" /><path d="M30 245 360 160" /><circle cx="200" cy="200" r="104" /></>
      : theme === 'stars' || theme === 'eclipse' ? <><circle cx="200" cy="200" r="155" /><circle cx="200" cy="200" r="118" /><path d="m200 35 44 112 121 53-121 43-44 122-43-122-122-43 122-53Z" /><path d="m85 85 230 230m0-230L85 315" /></>
      : <><circle cx="200" cy="200" r="148" /><path d="M200 65c110 70 110 170 0 270C90 235 90 135 200 65Zm-130 80c130-20 180 55 130 190C75 295 30 235 70 145Zm260 0c40 90-5 150-130 190-50-135 0-210 130-190Z" /></>}
  </svg>;
}

function UltimateSequence({ eventId, character, allies, speed, reducedMotion }: { eventId: string; character: CharacterDef; allies: Unit[]; speed: 1 | 2; reducedMotion: boolean }) {
  const special = ultimateFor(character);
  const visual = ultimateVisualFor(character);
  const supporting = ['bloom', 'aegis', 'dawn'].includes(special.theme);
  const effectHost = useRef<HTMLDivElement>(null);
  const clock = useRef(new UltimateClock());
  const [phase, setPhase] = useState('intro');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [saveData, setSaveData] = useState(() => !!connection?.saveData);
  const allowed = !reducedMotion && !systemReduced && !saveData;
  const anchor = content.assets.find(asset => asset.id === character.artId)?.anchor ?? '50% 0%';

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setSystemReduced(preference.matches);
    const data = () => setSaveData(!!connection?.saveData);
    preference.addEventListener('change', motion); connection?.addEventListener('change', data);
    return () => { preference.removeEventListener('change', motion); connection?.removeEventListener('change', data); };
  }, [connection]);

  useEffect(() => {
    if (!allowed || failed || !effectHost.current) return;
    let cancelled = false, dispose: (() => void) | undefined;
    const host = effectHost.current;
    void import('./ultimate-pixi').then(async ({ createUltimateEffect }) => {
      if (cancelled) return;
      const cleanup = await createUltimateEffect(host, visual, () => clock.current.position(performance.now()), () => { if (!cancelled) setFailed(true); });
      if (cancelled) cleanup();
      else { dispose = cleanup; setReady(true); }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; dispose?.(); setReady(false); };
  }, [allowed, failed, visual]);

  useEffect(() => {
    clock.current.sync(eventId, speed, performance.now());
    const elapsed = clock.current.position(performance.now());
    setPhase(elapsed < ULTIMATE_TIMING.effect ? 'intro' : elapsed < ULTIMATE_TIMING.impact ? 'effect' : elapsed < ULTIMATE_TIMING.tail ? 'impact' : 'tail');
    const timers = [
      setTimeout(() => setPhase('effect'), clock.current.delay(ULTIMATE_TIMING.effect, performance.now())),
      setTimeout(() => setPhase('impact'), clock.current.delay(ULTIMATE_TIMING.impact, performance.now())),
      setTimeout(() => setPhase('tail'), clock.current.delay(ULTIMATE_TIMING.tail, performance.now())),
    ];
    return () => timers.forEach(clearTimeout);
  }, [eventId, speed]);

  return <div className={`ultimate-cinematic ultimate-cinematic--${special.theme}${supporting ? ' ultimate-cinematic--support' : ''}${!allowed ? ' ultimate-cinematic--reduced' : ''}`} data-visual={visual} data-phase={phase} data-fx-state={!allowed ? 'static' : failed ? 'fallback' : ready ? 'pixi' : 'loading'} role="status" aria-label={tr(`${character.name}の必殺技：${special.name}`)} style={{ '--ultimate-rate': speed === 2 ? .8 : 1 } as CSSProperties}>
    <div className="ultimate-cinematic__intro">
      <div className="ultimate-cinematic__portrait" aria-hidden="true"><img src={assetPath(character.artId)} style={{ objectPosition: anchor }} alt="" /></div>
      <div className="ultimate-cinematic__title"><small>ULTIMATE</small><span>{tr(character.name)}</span><strong>{tr(special.name)}</strong></div>
    </div>
    {supporting && <div className="ultimate-recipients" aria-hidden="true"><small>{tr('パーティ')}</small><div>{allies.map(unit => <span key={unit.uid}><span className="ultimate-recipient__art"><PortraitArt character={characterById(unit.characterId)} face /></span><small>{tr(characterById(unit.characterId).name)}</small></span>)}</div></div>}
    <div className="ultimate-cinematic__effect" aria-hidden="true">
      {allowed && !failed && <div className="ultimate-pixi-host" ref={effectHost} /> }
      {!ready || failed || !allowed ? <FallbackImpact theme={special.theme} /> : null}
    </div>
  </div>;
}

export function UltimateCutIn({ event, units, reducedMotion, speed = 1 }: { event?: BattleEvent; units: Unit[]; reducedMotion: boolean; speed?: 1 | 2 }) {
  if (!event?.ultimate) return null;
  const actor = units.find(unit => unit.uid === event.actorId);
  if (!actor) return null;
  return <UltimateSequence key={event.id} eventId={event.id} character={characterById(actor.characterId)} allies={units.filter(unit => unit.side === 'party' && unit.hp > 0)} speed={speed} reducedMotion={reducedMotion} />;
}
