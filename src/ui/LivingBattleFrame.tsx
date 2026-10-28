import type { Battle, BattleEvent, Unit } from '../domain/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimationSettings } from './animation-settings';
import { tr } from '../locales/i18n';
import { assetPath } from '../content';
import { Button } from './index';
import './living-battle-frame.css';

const OPENING_MS = 5000;
let openingBytes: Promise<Blob> | undefined;
function openingBlob() {
  return openingBytes ??= fetch(assetPath('living-garden-bloom-motion')).then(response => {
    if (!response.ok) throw new Error('Flower artwork unavailable');
    return response.blob();
  }).catch(error => { openingBytes = undefined; throw error; });
}

/** Independent assets: the flower and crystal never contain a second frame. */
function GardenArt({ className, moving, poster, animate }: { className: string; moving: string; poster: string; animate: boolean }) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!animate || failed || ready) return;
    let canceled = false;
    const image = new Image();
    image.onload = () => { if (!canceled) setReady(true); };
    image.onerror = () => { if (!canceled) setFailed(true); };
    image.src = assetPath(moving);
    return () => { canceled = true; image.onload = image.onerror = null; };
  }, [animate, failed, ready, moving]);
  return <img className={className} src={assetPath(animate && ready && !failed ? moving : poster)} alt="" draggable={false}
    data-animated={animate && ready && !failed} onError={() => setFailed(true)} />;
}

/** A fresh blob URL starts each new one-shot bloom at its bud, avoiding shared GIF/WebP cache clocks. */
function OpeningFlower({ id, animate, restored, onOpen }: { id: string; animate: boolean; restored: boolean; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(restored || !animate);
  const [motionURL, setMotionURL] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!animate) { setOpen(true); return; }
    if (open) return;
    let canceled = false, url: string | undefined;
    void openingBlob().then(blob => {
      if (canceled) return;
      url = URL.createObjectURL(blob); setMotionURL(url);
    }).catch(() => { if (!canceled) setOpen(true); });
    return () => { canceled = true; if (url) URL.revokeObjectURL(url); clearTimeout(timer.current); timer.current = undefined; };
  }, [animate, open]);
  useEffect(() => { if (open) onOpen(id); }, [id, open, onOpen]);
  return <img className="garden-flower-art" alt="" draggable={false}
    src={open ? assetPath('living-garden-bloom-poster') : motionURL ?? assetPath('living-garden-bud')}
    data-animated={animate && !open && Boolean(motionURL)} data-flower-phase={open ? 'open' : 'opening'}
    onLoad={() => { if (!open && motionURL && timer.current === undefined) timer.current = setTimeout(() => setOpen(true), OPENING_MS); }}
    onError={() => setOpen(true)} />;
}

/** Saved bloom state controls the action; the five-second opening changes presentation only. */
export function LivingBattleFrame({ battle, event, units, busy, reducedMotion, onBloom, onFairy }: {
  battle: Battle; event?: BattleEvent; units: Unit[]; busy: boolean; reducedMotion: boolean;
  onBloom: (id: string) => void; onFairy: (id: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const { suspended } = useAnimationSettings();
  const firstFlower = useRef(battle.blooms?.flower?.id);
  const [openId, setOpenId] = useState(firstFlower.current);
  const markOpen = useCallback((id: string) => setOpenId(id), []);
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [inView, setInView] = useState(true);
  const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
  const [saveData, setSaveData] = useState(() => !!connection?.saveData);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setSystemReduced(preference.matches);
    const visibility = () => setVisible(!document.hidden);
    const data = () => setSaveData(!!connection?.saveData);
    preference.addEventListener('change', motion); document.addEventListener('visibilitychange', visibility); connection?.addEventListener('change', data);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => setInView(entries.some(entry => entry.isIntersecting)));
    if (root.current) observer?.observe(root.current);
    return () => { observer?.disconnect(); preference.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); connection?.removeEventListener('change', data); };
  }, [connection]);
  const motionOff = reducedMotion || systemReduced;
  const animate = !motionOff && !suspended && visible && inView && !saveData;
  useEffect(() => { if (animate) void openingBlob().catch(() => {}); }, [animate]);
  const flower = battle.blooms?.flower;
  const visitor = battle.fairies?.visitor;
  const departing = event?.fairyAction === 'charge' ? event.fairySide : undefined;
  const fairySide = departing ?? visitor?.side;
  const fairyFacing = fairySide === 'left' ? 'right' : 'left';
  const open = !!flower && openId === flower.id;
  const actor = units.find(unit => unit.uid === event?.actorId);
  const cue = !event ? 'rest' : event.bloomAction === 'strike' ? 'strike-flower' : event.ultimate ? 'ultimate'
    : event.kind === 'heal' ? 'heal' : ['attack', 'area'].includes(event.kind) ? actor?.side === 'enemy' ? 'enemy' : 'attack'
    : event.kind === 'guard' || event.kind === 'buff' ? 'guard' : 'rest';
  const label = tr(!open ? '白い蕾が開いています' : flower?.kind === 'heal'
    ? '癒しの花：最も傷ついた味方を最大HPの18%回復' : '月晶の花：弱った敵1体に追加攻撃');
  return <div ref={root} className="living-frame" data-cue={cue} data-reduced={motionOff}
    data-fairy-blessing={Boolean(departing)} data-bloom-state={flower ? open ? 'open' : 'opening' : 'bud'} data-bloom-kind={flower?.kind}>
    <GardenArt className="garden-frame__art" moving="living-garden-idle-motion" poster="living-garden-frame" animate={animate} />
    <div className="garden-flower-bed">
      {flower ? <OpeningFlower key={flower.id} id={flower.id} animate={animate} restored={firstFlower.current === flower.id} onOpen={markOpen} />
        : <img className="garden-flower-art" src={assetPath('living-garden-bud')} alt="" draggable={false} data-flower-phase="bud" />}
    </div>
    <GardenArt className="garden-crystal-art" moving="living-garden-crystal-motion" poster="living-garden-crystal" animate={animate} />
    {fairySide && <div key={departing ? event!.id : visitor!.id} className={`garden-fairy garden-fairy--${fairySide}`} data-departing={Boolean(departing)}>
      <GardenArt className="garden-fairy__art" moving={`living-garden-fairy-${fairyFacing}-motion`} poster={`living-garden-fairy-${fairyFacing}-poster`} animate={animate} />
      {!departing && visitor && <Button className="battle-fairy" variant="secondary" sound={false}
        aria-label={tr('妖精の祝福：味方全員の必殺ゲージを15%増やす')}
        disabled={busy || battle.phase !== 'ready'} onClick={() => onFairy(visitor.id)} />}
    </div>}
    {departing && <span key={event!.id} className="garden-fairy-blessing" aria-hidden="true" />}
    {flower && <Button className="battle-bloom" variant="secondary" sound={false} aria-label={label}
      disabled={busy || battle.phase !== 'ready' || !open} onClick={() => onBloom(flower.id)} />}
  </div>;
}
