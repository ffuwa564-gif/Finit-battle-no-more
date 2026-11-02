import { useEffect, useRef, useState } from 'react';
import { createSceneRenderer, type FxCue, type FxMode } from '../platform/fx-renderer';
import './scene-effects.css';

export interface SceneEffectsProps { mode: FxMode; reducedMotion: boolean }
const cueKinds = new Set(['attack', 'area', 'heal', 'guard', 'buff', 'debuff', 'drop', 'wave', 'defeat']);

/** Decorative only: rendering never owns combat timing, input, or saved state. */
export function SceneEffects({ mode, reducedMotion }: SceneEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [backend, setBackend] = useState<'webgl' | 'static'>('static');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let renderer: ReturnType<typeof createSceneRenderer> = null;
    let frame = 0;
    let lastFrame = -Infinity;
    let inViewport = true;
    let hasSize = false;
    let stopped = false;
    let contextLost = false;

    const cancelFrame = () => { cancelAnimationFrame(frame); frame = 0; };
    const canAnimate = () => !stopped && !document.hidden && inViewport && hasSize && !!renderer;
    const tick = (time: number) => {
      frame = 0;
      if (!canAnimate()) return;
      if (time - lastFrame >= 1000 / 30 - 1) {
        renderer!.render(time);
        lastFrame = time;
      }
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      if (canAnimate()) { if (!frame) frame = requestAnimationFrame(tick); }
      else cancelFrame();
    };
    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      hasSize = rect.width > 0 && rect.height > 0;
      if (hasSize) renderer?.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, 1.5));
      resume();
    };
    const reconcile = () => {
      cancelFrame();
      renderer?.dispose();
      renderer = null;
      if (!reducedMotion && !preference.matches && !contextLost) {
        renderer = createSceneRenderer(canvas, mode);
      }
      setBackend(renderer ? 'webgl' : 'static');
      lastFrame = -Infinity;
      measure();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      reconcile();
    };
    const onCue = (event: Event) => {
      if (mode !== 'battle' || !canAnimate()) return;
      const detail = (event as CustomEvent<Partial<FxCue>>).detail;
      if (!detail || !cueKinds.has(detail.kind ?? '') || !Number.isFinite(detail.x) || !Number.isFinite(detail.y)) return;
      const rect = canvas.getBoundingClientRect();
      const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
      const rarity = detail.rarity === 'common' || detail.rarity === 'rare' || detail.rarity === 'epic' ? detail.rarity : undefined;
      renderer!.cue({ kind: detail.kind as FxCue['kind'], x: clamp((detail.x! - rect.left) / rect.width, .06, .94), y: clamp((detail.y! - rect.top) / rect.height, .18, .85), rarity });
    };
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(entries => {
      inViewport = entries.some(entry => entry.isIntersecting);
      resume();
    });
    intersectionObserver.observe(canvas);
    canvas.addEventListener('webglcontextlost', onContextLost);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('resize', measure);
    window.addEventListener('game:fx', onCue);
    preference.addEventListener('change', reconcile);
    reconcile();
    return () => {
      stopped = true;
      cancelFrame();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('resize', measure);
      window.removeEventListener('game:fx', onCue);
      preference.removeEventListener('change', reconcile);
      renderer?.dispose();
    };
  }, [mode, reducedMotion]);

  return <div className="scene-effects" data-fx-backend={backend} data-fx-mode={mode} aria-hidden="true"><canvas ref={canvasRef} className="scene-effects__canvas" /><span className="scene-effects__still" /></div>;
}
