import { GameImage } from './GameMedia';
import { UltimateIntroFx } from './UltimateIntroFx';
import { createRabbitBattleMotion } from '../platform/rabbit-battle-motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createGamePortal } from './GamePortal';
import { assetPath, characterById, content } from '../content';
import { ultimateFor, type UltimateTheme } from '../domain/ultimates';
import type { BattleEvent, CharacterDef, Unit } from '../domain/types';
import { tr } from '../locales/i18n';
import { ultimateVisualFor, rabbitWhiteout, rabbitBitFrame, rabbitEnergyFrame, RABBIT_MUZZLES, type UltimateVisual } from '../platform/ultimate-choreography';
import { ultimateTimingFor, UltimateClock, RABBIT_SEQUENCE, rabbitStage } from '../platform/ultimate-timing';
import { PortraitArt } from './PortraitArt';
import './ultimates.css';

function FallbackImpact({ theme, visual, position }: { theme: UltimateTheme; visual?: UltimateVisual; position?: () => number }) {
  const fallback=useRef<SVGSVGElement>(null);
  useEffect(()=>{
    if(visual!=='rabbit-bits'||!position)return;
    let frame=0;
    const draw=()=>{
      fallback.current?.querySelectorAll<SVGGElement>('g').forEach((group,index)=>{
        const elapsed=position(),state=rabbitBitFrame(index,elapsed);
        group.style.opacity=String(document.hidden?0:state.summon*state.alpha);
        const beam=group.querySelector<SVGPathElement>('.rabbit-fallback-beam');
        if(beam){
          const [bx,by]=[[15,35],[255,35],[15,245],[255,245]][index],anchor=RABBIT_MUZZLES[index];
          const x=bx+130*anchor[0],y=by+140*anchor[1];
          const head=state.travel,tail=Math.max(0,head-.23);
          beam.setAttribute('d',state.flight?`M${x+(200-x)*tail} ${y+(200-y)*tail} ${x+(200-x)*head} ${y+(200-y)*head}`:'M190 200 210 200');
          beam.style.stroke=`#${rabbitEnergyFrame(elapsed).color.toString(16).padStart(6,'0')}`;
          beam.style.opacity=String(state.flight?1:state.impact);beam.style.strokeWidth=state.final?'9':'4';
        }
      });frame=requestAnimationFrame(draw);
    };draw();return()=>cancelAnimationFrame(frame);
  },[visual,position]);
  if (visual === 'rabbit-bits') return <svg ref={fallback} className="ultimate-fallback ultimate-fallback--rabbit-bits" viewBox="0 0 400 400" aria-hidden="true">
    {[[15,35],[255,35],[15,245],[255,245]].map(([x,y],index) => <g key={index}>
      <image href={assetPath(`lunette-bit-${index+1}`)} x={x} y={y} width="130" height="140" />
      <path className="rabbit-fallback-beam" d={`M${x+65} ${y+70} 200 200`} />

    </g>)}
  </svg>;
  return <svg className={`ultimate-fallback ultimate-fallback--${theme}`} viewBox="0 0 400 400" aria-hidden="true">
    {theme === 'blade' ? <><path d="M45 340 330 65 145 320 355 110" /><path d="M30 245 360 160" /><circle cx="200" cy="200" r="104" /></>
      : theme === 'stars' || theme === 'eclipse' ? <><circle cx="200" cy="200" r="155" /><circle cx="200" cy="200" r="118" /><path d="m200 35 44 112 121 53-121 43-44 122-43-122-122-43 122-53Z" /><path d="m85 85 230 230m0-230L85 315" /></>
      : <><circle cx="200" cy="200" r="148" /><path d="M200 65c110 70 110 170 0 270C90 235 90 135 200 65Zm-130 80c130-20 180 55 130 190C75 295 30 235 70 145Zm260 0c40 90-5 150-130 190-50-135 0-210 130-190Z" /></>}
  </svg>;
}

function UltimateSequence({ event, character, allies, speed, reducedMotion }: { event: BattleEvent; character: CharacterDef; allies: Unit[]; speed: 1 | 2; reducedMotion: boolean }) {
  const eventId = event.id;
  const enemy = Boolean(event.bossStrike);
  const form = ultimateFor(character);
  const visual = ultimateVisualFor(character, event);
  const timing=ultimateTimingFor(visual);
  const special = { ...form, name: event.ultimateName ?? form.name, theme: visual === 'clockwork' || visual === 'rabbit-bits' ? 'stars' as const : visual };
  const supporting = !enemy && ['bloom', 'aegis', 'dawn'].includes(special.theme);
  const effectHost = useRef<HTMLDivElement>(null);
  const clock = useRef(new UltimateClock());
  const [phase, setPhase] = useState('intro');
  const [stage,setStage]=useState('command');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const whiteoutHost=useRef<HTMLDivElement>(null);
  const [battleLayer,setBattleLayer]=useState<HTMLElement|null>(null);
  const [partyLayer, setPartyLayer] = useState<HTMLElement | null>(null);
  const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [saveData, setSaveData] = useState(() => !!connection?.saveData);
  const allowed = !reducedMotion && !systemReduced && !saveData;
  const anchor = content.assets.find(asset => asset.id === character.artId)?.anchor ?? '50% 0%';
  useEffect(() => { if (enemy) setPartyLayer(document.querySelector<HTMLElement>('.battle-layout .party-strip')); }, [enemy]);
  useEffect(()=>{if(visual==='rabbit-bits')setBattleLayer(document.querySelector<HTMLElement>('.battle-layout'));},[visual]);
  useEffect(()=>{
    if(!allowed||visual!=='rabbit-bits'||!battleLayer)return;
    let frame=0;
    const draw=()=>{
      if(whiteoutHost.current)whiteoutHost.current.style.opacity=String(document.hidden?0:rabbitWhiteout(clock.current.position(performance.now())));
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(frame);};
  },[allowed,visual,battleLayer]);
  useEffect(()=>{
    if(!allowed||visual!=='rabbit-bits'||!battleLayer||enemy)return;
    return createRabbitBattleMotion(battleLayer,event.targetIds??[],()=>clock.current.position(performance.now()));
  },[allowed,visual,battleLayer,eventId,enemy]);
  const targetElements = () => [...new Set(event.targetIds ?? [])].flatMap(id => {
    const element = partyLayer?.querySelector<HTMLElement>(`.party-unit[data-unit="${CSS.escape(id)}"]`);
    return element ? [element] : [];
  });

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
      const cleanup = await createUltimateEffect(host, visual, () => clock.current.position(performance.now()), () => { if (!cancelled) setFailed(true); }, enemy ? () => {
        const bounds = host.getBoundingClientRect();
        return targetElements().map(element => {
          const target = element.getBoundingClientRect();
          return { x: target.left + target.width / 2 - bounds.left, y: target.top + target.height * .35 - bounds.top, size: target.width * .9 };
        });
      } : undefined);
      if (cancelled) cleanup();
      else { dispose = cleanup; setReady(true); }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; dispose?.(); setReady(false); };
  }, [allowed, failed, visual, partyLayer]);

  useEffect(() => {
    clock.current.sync(eventId, speed, performance.now());
    const elapsed = clock.current.position(performance.now());
    setStage(rabbitStage(elapsed));
    setPhase(elapsed < timing.effect ? 'intro' : elapsed < timing.impact ? 'effect' : elapsed < timing.tail ? 'impact' : 'tail');
    const timers = [
      setTimeout(() => setPhase('effect'), clock.current.delay(timing.effect, performance.now())),
      setTimeout(() => setPhase('impact'), clock.current.delay(timing.impact, performance.now())),
      setTimeout(() => setPhase('tail'), clock.current.delay(timing.tail, performance.now())),
    ];
    if(visual==='rabbit-bits')for(const at of [RABBIT_SEQUENCE.summon,RABBIT_SEQUENCE.aim,RABBIT_SEQUENCE.fire,RABBIT_SEQUENCE.charge,RABBIT_SEQUENCE.finish,RABBIT_SEQUENCE.tail])
      timers.push(setTimeout(()=>setStage(rabbitStage(at)),clock.current.delay(at,performance.now())));
    return () => timers.forEach(clearTimeout);
  }, [eventId, speed]);

  return <><div className={`ultimate-cinematic ultimate-cinematic--${special.theme}${enemy ? ' ultimate-cinematic--enemy' : ''}${supporting ? ' ultimate-cinematic--support' : ''}${!allowed ? ' ultimate-cinematic--reduced' : ''}`} data-visual={visual} data-stage={visual==='rabbit-bits'?stage:undefined} data-phase={phase} data-fx-state={!allowed ? 'static' : failed ? 'fallback' : ready ? 'pixi' : 'loading'} role="status" aria-label={tr(`${character.name}の必殺技：${special.name}`)} style={{ '--ultimate-rate': speed === 2 ? .8 : 1 } as CSSProperties}>
    <div className="ultimate-cinematic__intro">
      <div className="ultimate-cinematic__portrait" aria-hidden="true"><GameImage src={assetPath(character.artId)} style={{ objectPosition: anchor }} alt="" /></div>
      {allowed && <UltimateIntroFx position={()=>clock.current.position(performance.now())} duration={timing.effect} />}
      <div className="ultimate-cinematic__title"><small>{enemy ? 'ENEMY ULTIMATE' : 'ULTIMATE'}</small><span>{tr(character.name)}</span><strong>{tr(special.name)}</strong></div>
    </div>
    {supporting && <div className="ultimate-recipients" aria-hidden="true"><small>{tr('パーティ')}</small><div>{allies.map(unit => <span key={unit.uid}><span className="ultimate-recipient__art"><PortraitArt character={characterById(unit.characterId)} face /></span><small>{tr(characterById(unit.characterId).name)}</small></span>)}</div></div>}
    {!enemy && <div className="ultimate-cinematic__effect" aria-hidden="true">
      {allowed && !failed && <div className="ultimate-pixi-host" ref={effectHost} /> }
      {allowed && (!ready || failed) ? <FallbackImpact theme={special.theme} visual={visual} position={()=>clock.current.position(performance.now())} /> : null}
    </div>}
  </div>{enemy && allowed && partyLayer && <>
    {createGamePortal(<div className="ultimate-party-effect" data-phase={phase} aria-hidden="true" style={{ '--ultimate-rate': speed === 2 ? .8 : 1 } as CSSProperties}>
      {!failed && <div className="ultimate-pixi-host" ref={effectHost} />}
    </div>, partyLayer)}
    {(!ready || failed) && targetElements().map(element => createGamePortal(<div className="ultimate-target-fallback" data-phase={phase} aria-hidden="true"><FallbackImpact theme={special.theme} visual={visual} position={()=>clock.current.position(performance.now())} /></div>, element, element.dataset.unit))}
  </>}{allowed && visual==='rabbit-bits' && battleLayer && createGamePortal(<div ref={whiteoutHost} className="ultimate-whiteout" aria-hidden="true" />,battleLayer)}</>;
}

export function UltimateCutIn({ event, units, reducedMotion, speed = 1 }: { event?: BattleEvent; units: Unit[]; reducedMotion: boolean; speed?: 1 | 2 }) {
  if (!event?.ultimate) return null;
  const actor = units.find(unit => unit.uid === event.actorId);
  if (!actor) return null;
  return <UltimateSequence key={event.id} event={event} character={characterById(actor.characterId)} allies={units.filter(unit => unit.side === actor.side && unit.hp > 0)} speed={speed} reducedMotion={reducedMotion} />;
}
