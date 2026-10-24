import { tr, localize } from '../locales/i18n';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { assetPath } from '../content';
import { Button } from './index';
import './animated-illustration.css';

/** A muted decorative loop; the original painting remains available at all times. */
export function AnimatedIllustration({ posterId, motionId, alt, reducedMotion, label = 'ホーム', suspended = false, controls = true }: {
  posterId: string; motionId: string; alt: string; reducedMotion: boolean; label?: string; suspended?: boolean; controls?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [inView, setInView] = useState(false);
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const allowed = !reducedMotion && !systemReduced && !saveData;
  const active = allowed && !failed && visible && inView && !paused && !suspended;

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setSystemReduced(preference.matches);
    const onVisibility = () => setVisible(!document.hidden);
    preference.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onVisibility);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => setInView(entries.some(entry => entry.isIntersecting)), { threshold: .05 });
    if (root.current) observer?.observe(root.current);
    if (!observer) setInView(true);
    return () => { observer?.disconnect(); preference.removeEventListener('change', onMotion); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pageshow', onVisibility); };
  }, []);
  useEffect(() => {
    if (active) setActivated(true);
  }, [active]);
  useEffect(() => {
    const player = video.current;
    if (!player) return;
    let canceled = false;
    if (!allowed) { player.pause(); player.load(); setReady(false); return; }
    if (!active || !activated) { player.pause(); return; }
    // Set both the HTML attribute and live property before asking iOS to play.
    player.defaultMuted = true;
    player.muted = true;
    void player.play().catch(error => {
      if (!canceled && error?.name !== 'AbortError') setBlocked(true);
    });
    return () => { canceled = true; player.pause(); };
  }, [active, allowed, activated]);

  useEffect(() => {
    if (controls || !active || !activated) return;
    const retry = () => {
      const player = video.current;
      if (player?.paused) { player.muted = true; void player.play().catch(() => setBlocked(true)); }
    };
    // Decorative portraits have no nested controls; retry blocked autoplay on
    // the next real interaction while preserving the enclosing button's action.
    window.addEventListener('pointerup', retry, { passive: true });
    return () => window.removeEventListener('pointerup', retry);
  }, [controls, active, activated]);

  const toggle = () => {
    const player = video.current;
    if (!player) return;
    if (playing) { setPaused(true); player.pause(); return; }
    setPaused(false);
    if (failed) { setFailed(false); setBlocked(false); player.load(); }
    player.defaultMuted = true;
    player.muted = true;
    // Keep play() inside the tap handler: iOS standalone/Low Power Mode may
    // reject an attempt deferred to a React effect as lacking user activation.
    void player.play().catch(error => { if (error?.name !== 'AbortError') setBlocked(true); });
  };

  return <div ref={root} className={`animated-illustration${allowed && ready ? ' is-ready' : ''}`} data-animation-state={!allowed ? 'static' : failed ? 'error' : blocked ? 'blocked' : !ready ? 'loading' : playing && active ? 'playing' : 'paused'}>
    <img className="animated-illustration__art" src={assetPath(posterId)} alt={tr(alt)} />
    <video ref={video} className="animated-illustration__art animated-illustration__video" src={allowed && activated ? assetPath(motionId) : undefined} poster={assetPath(posterId)} muted autoPlay={active && !blocked} playsInline loop preload={active ? 'auto' : 'none'} disablePictureInPicture tabIndex={-1} aria-hidden="true" onLoadedData={() => setReady(true)} onPlaying={() => { setReady(true); setPlaying(true); setBlocked(false); }} onPause={() => setPlaying(false)} onError={event => { if (event.currentTarget.error && event.currentTarget.getAttribute('src')) { setFailed(true); setReady(false); setPlaying(false); } }} />
    {localize(controls && allowed && activated && <Button variant="icon" className="animated-illustration__toggle" aria-label={tr(`${label}のアニメーションを${playing ? '停止' : '再生'}`)} title={tr(failed ? 'アニメーションを再読み込み' : playing ? 'アニメーションを停止' : 'アニメーションを再生')} onClick={toggle}>{localize(playing ? <Pause size={16} /> : <Play size={16} />)}</Button>)}
  </div>;
}
