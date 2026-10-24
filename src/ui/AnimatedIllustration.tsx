import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { assetPath } from '../content';
import { Button } from './index';
import './animated-illustration.css';

/** A muted decorative loop; the original painting remains available at all times. */
export function AnimatedIllustration({ posterId, motionId, alt, reducedMotion }: {
  posterId: string; motionId: string; alt: string; reducedMotion: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [inView, setInView] = useState(false);
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const allowed = !reducedMotion && !systemReduced && !saveData && !failed;
  const active = allowed && visible && inView && !paused;

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setSystemReduced(preference.matches);
    const onVisibility = () => setVisible(!document.hidden);
    preference.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => setInView(entries.some(entry => entry.isIntersecting)), { threshold: .05 });
    if (root.current) observer?.observe(root.current);
    if (!observer) setInView(true);
    return () => { observer?.disconnect(); preference.removeEventListener('change', onMotion); document.removeEventListener('visibilitychange', onVisibility); };
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
    player.muted = true;
    void player.play().catch(() => { if (!canceled) setFailed(true); });
    return () => { canceled = true; player.pause(); };
  }, [active, allowed, activated]);

  return <div ref={root} className={`animated-illustration${allowed && ready ? ' is-ready' : ''}`} data-animation-state={!allowed ? 'static' : !ready ? 'loading' : active ? 'playing' : 'paused'}>
    <img className="animated-illustration__art" src={assetPath(posterId)} alt={alt} />
    <video ref={video} className="animated-illustration__art animated-illustration__video" src={allowed && activated ? assetPath(motionId) : undefined} poster={assetPath(posterId)} muted playsInline loop preload={active ? 'auto' : 'none'} disablePictureInPicture tabIndex={-1} aria-hidden="true" onLoadedData={() => setReady(true)} onError={() => setFailed(true)} />
    {allowed && ready && <Button variant="icon" className="animated-illustration__toggle" aria-label={paused ? 'ホームのアニメーションを再生' : 'ホームのアニメーションを停止'} title={paused ? 'アニメーションを再生' : 'アニメーションを停止'} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}</Button>}
  </div>;
}
