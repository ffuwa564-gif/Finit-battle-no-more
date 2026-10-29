import { useEffect, useRef, useState } from 'react';
import { assetPath } from '../content';
import type { BirthRig } from './title-birth-rig';

export function TitleBirthScene({ reducedMotion, suspended }: { reducedMotion: boolean; suspended: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const rig = useRef<BirthRig | null>(null);
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const allowed = !reducedMotion && !systemReduced && !saveData;
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setSystemReduced(media.matches);
    const visibility = () => setVisible(!document.hidden);
    media.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', visibility);
    return () => { media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pageshow', visibility); };
  }, []);
  useEffect(() => { if (allowed && visible && !suspended) setActivated(true); }, [allowed, visible, suspended]);
  const running = allowed && visible && !suspended && !failed;
  useEffect(() => {
    if (!allowed || !activated || !host.current) return;
    let disposed = false;
    const pending = new AbortController();
    setReady(false);
    void import('./title-birth-rig').then(module => {
      if (disposed) return null;
      return module.createBirthRig(host.current!, assetPath('title-birth-background'), assetPath('title-birth-character'), assetPath('title-character-motion'), () => { if (!disposed) setFailed(true); }, pending.signal);
    }).then(value => {
      if (!value) return;
      if (disposed) { value.destroy(); return; }
      rig.current = value;
      setReady(true);
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; pending.abort(); rig.current?.destroy(); rig.current = null; };
  }, [allowed, activated]);
  useEffect(() => { rig.current?.setRunning(running); }, [running, ready]);
  return <div className="title-birth-scene" data-animation-state={!allowed ? 'static' : failed ? 'error' : !ready ? 'loading' : running ? 'playing' : 'paused'}>
    <img className="title-birth-scene__poster" src={assetPath('title-birth-still')} alt="" />
    <div ref={host} className={`title-birth-scene__rig${allowed && ready && !failed ? ' is-ready' : ''}`} />
  </div>;
}
