import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { assetPath, characterById, content } from '../content';
import { ultimateEffectIds } from '../content/ultimate-effects';
import { ultimateFor, type UltimateTheme } from '../domain/ultimates';
import type { BattleEvent, CharacterDef, Unit } from '../domain/types';
import { tr } from '../locales/i18n';
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
  const supporting = ['bloom', 'aegis', 'dawn'].includes(special.theme);
  const asset = content.assets.find(asset => asset.id === ultimateEffectIds[special.theme])!;
  const video = useRef<HTMLVideoElement>(null);
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

  const reconcileVideo = useCallback(() => {
    const player = video.current;
    if (!player) return;
    const elapsed = clock.current.position(performance.now());
    if (!allowed || failed || document.hidden || elapsed < ULTIMATE_TIMING.effect || elapsed >= ULTIMATE_TIMING.tail) { player.pause(); return; }
    player.defaultMuted = true; player.muted = true; player.playbackRate = clock.current.rate;
    if (player.readyState >= 1) {
      const desired = Math.min(Math.max(0, (elapsed - ULTIMATE_TIMING.effect) / 1000), Math.max(0, player.duration - .04));
      if (Math.abs(player.currentTime - desired) > .12) player.currentTime = desired;
    }
    if (player.paused) void player.play().catch(error => { if (error?.name !== 'AbortError') setFailed(true); });
  }, [allowed, failed]);

  useEffect(() => {
    clock.current.sync(eventId, speed, performance.now());
    const elapsed = clock.current.position(performance.now());
    setPhase(elapsed < ULTIMATE_TIMING.effect ? 'intro' : elapsed < ULTIMATE_TIMING.impact ? 'effect' : elapsed < ULTIMATE_TIMING.tail ? 'impact' : 'tail');
    const timers = [
      setTimeout(() => { setPhase('effect'); reconcileVideo(); }, clock.current.delay(ULTIMATE_TIMING.effect, performance.now())),
      setTimeout(() => setPhase('impact'), clock.current.delay(ULTIMATE_TIMING.impact, performance.now())),
      setTimeout(() => { setPhase('tail'); video.current?.pause(); }, clock.current.delay(ULTIMATE_TIMING.tail, performance.now())),
    ];
    const player = video.current;
    reconcileVideo();
    document.addEventListener('visibilitychange', reconcileVideo);
    window.addEventListener('pageshow', reconcileVideo);
    return () => { timers.forEach(clearTimeout); player?.pause(); document.removeEventListener('visibilitychange', reconcileVideo); window.removeEventListener('pageshow', reconcileVideo); };
  }, [eventId, speed, reconcileVideo]);

  return <div className={`ultimate-cinematic ultimate-cinematic--${special.theme}${supporting ? ' ultimate-cinematic--support' : ''}${!allowed ? ' ultimate-cinematic--reduced' : ''}`} data-phase={phase} data-fx-state={!allowed ? 'static' : failed ? 'fallback' : ready ? 'video' : 'loading'} role="status" aria-label={tr(`${character.name}の必殺技：${special.name}`)} style={{ '--ultimate-rate': speed === 2 ? .8 : 1 } as CSSProperties}>
    <div className="ultimate-cinematic__intro">
      <div className="ultimate-cinematic__portrait" aria-hidden="true"><img src={assetPath(character.artId)} style={{ objectPosition: anchor }} alt="" /></div>
      <div className="ultimate-cinematic__title"><small>ULTIMATE</small><span>{tr(character.name)}</span><strong>{tr(special.name)}</strong></div>
    </div>
    {supporting && <div className="ultimate-recipients" aria-hidden="true"><small>{tr('パーティ')}</small><div>{allies.map(unit => <span key={unit.uid}><span className="ultimate-recipient__art"><PortraitArt character={characterById(unit.characterId)} face /></span><small>{tr(characterById(unit.characterId).name)}</small></span>)}</div></div>}
    <div className="ultimate-cinematic__effect" aria-hidden="true">
      {allowed && !failed && <video ref={video} className={`ultimate-effect-video${ready ? ' is-ready' : ''}`} src={assetPath(asset.id)} poster={assetPath(asset.posterId!)} muted playsInline preload="auto" disablePictureInPicture disableRemotePlayback tabIndex={-1}
        onLoadedData={reconcileVideo} onPlaying={() => { setReady(true); reconcileVideo(); }} onError={() => { setFailed(true); setReady(false); }} />}
      {!ready || failed || !allowed ? <FallbackImpact theme={special.theme} /> : null}
    </div>
    <div className="ultimate-cinematic__finish" aria-hidden="true"><small>{tr(character.name)}</small><strong>{tr(special.name)}</strong></div>
  </div>;
}

export function UltimateCutIn({ event, units, reducedMotion, speed = 1 }: { event?: BattleEvent; units: Unit[]; reducedMotion: boolean; speed?: 1 | 2 }) {
  if (!event?.ultimate) return null;
  const actor = units.find(unit => unit.uid === event.actorId);
  if (!actor) return null;
  return <UltimateSequence key={event.id} eventId={event.id} character={characterById(actor.characterId)} allies={units.filter(unit => unit.side === 'party' && unit.hp > 0)} speed={speed} reducedMotion={reducedMotion} />;
}
