import { useEffect, useRef, useState, type PointerEvent, type MouseEvent, type TouchEvent, type KeyboardEvent, type RefObject } from 'react';
import { boundMapCamera, pinchMapCamera, type MapCamera, type MapViewport, type ScreenPoint } from '../domain/map-camera';
const center = (a: ScreenPoint, b: ScreenPoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: ScreenPoint, b: ScreenPoint) => Math.hypot(a.x - b.x, a.y - b.y);
export function useMapCamera(surface: RefObject<HTMLDivElement | null>, size: MapViewport, onTap?: (point: ScreenPoint) => boolean) {
  const [camera, render] = useState<MapCamera>({ x: 0, y: 0, zoom: 1 });
  const current = useRef(camera), viewport = useRef(size); viewport.current = size;
  const points = useRef(new Map<number, ScreenPoint>()), origin = useRef({ camera, points: [] as ScreenPoint[] });
  const tap = useRef(onTap); tap.current = onTap;
  const tapStart = useRef<ScreenPoint>({ x: 0, y: 0 }), tapEligible = useRef(false), handledTouch = useRef(false);
  const dragging = useRef(false), suppressClick = useRef(false), frame = useRef<number | undefined>(undefined);
  function setCamera(update: MapCamera | ((c: MapCamera) => MapCamera)) {
    current.current = boundMapCamera(typeof update === 'function' ? update(current.current) : update, viewport.current);
    if (frame.current === undefined) frame.current = requestAnimationFrame(() => { frame.current = undefined; render(current.current); });
  }
  const rebase = () => { origin.current = { camera: current.current, points: [...points.current.values()].slice(0, 2) }; };
  function local(e: { clientX: number; clientY: number }): ScreenPoint { const r = surface.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function zoom(factor: number, x = viewport.current.width / 2, y = viewport.current.height / 2) { const p = { x, y }; setCamera(c => pinchMapCamera(c, p, p, factor, viewport.current)); }
  useEffect(() => { setCamera(c => c); }, [size.width, size.height]);
  useEffect(() => {
    const el = surface.current; if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); const p = local(e); zoom(Math.exp(-e.deltaY * .0015), p.x, p.y); };
    const reset = () => { points.current.clear(); dragging.current = false; tapEligible.current = false; handledTouch.current = false; rebase(); };
    const visibility = () => { if (document.hidden) reset(); };
    el.addEventListener('wheel', wheel, { passive: false }); window.addEventListener('blur', reset); document.addEventListener('visibilitychange', visibility);
    return () => { el.removeEventListener('wheel', wheel); window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', visibility); if (frame.current !== undefined) cancelAnimationFrame(frame.current); frame.current = undefined; };
  }, []);
  function down(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!points.current.size) { dragging.current = false; suppressClick.current = false; handledTouch.current = false; tapEligible.current = true; tapStart.current = { x: e.clientX, y: e.clientY }; }
    points.current.set(e.pointerId, local(e)); rebase();
    if (points.current.size >= 2) { tapEligible.current = false; dragging.current = true; suppressClick.current = true; for (const id of points.current.keys()) e.currentTarget.setPointerCapture(id); }
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (!points.current.has(e.pointerId)) return;
    points.current.set(e.pointerId, local(e)); const next = [...points.current.values()].slice(0, 2), start = origin.current.points;
    if (next.length === 2 && start.length === 2) {
      setCamera(pinchMapCamera(origin.current.camera, center(start[0], start[1]), center(next[0], next[1]), distance(next[0], next[1]) / Math.max(1, distance(start[0], start[1])), viewport.current));
    } else if (next.length === 1 && start.length === 1) {
      const dx = next[0].x - start[0].x, dy = next[0].y - start[0].y;
      if (!dragging.current && Math.hypot(dx, dy) < (e.pointerType === 'touch' ? 12 : 6)) return;
      tapEligible.current = false; dragging.current = true; suppressClick.current = true; e.currentTarget.setPointerCapture(e.pointerId);
      setCamera({ ...origin.current.camera, x: origin.current.camera.x + dx, y: origin.current.camera.y + dy });
    }
  }
  function up(e: PointerEvent<HTMLDivElement>) {
    if (!points.current.has(e.pointerId)) return;
    const slop = e.pointerType === 'touch' ? 12 : 6;
    const isTap = tapEligible.current && !dragging.current && points.current.size === 1 && Math.hypot(e.clientX - tapStart.current.x, e.clientY - tapStart.current.y) < slop;
    points.current.delete(e.pointerId); rebase();
    if (dragging.current) e.preventDefault();
    if (isTap && tap.current?.(tapStart.current)) {
      suppressClick.current = true; handledTouch.current = e.pointerType === 'touch'; e.preventDefault();
    }
    tapEligible.current = false;
  }
  function cancel(e: PointerEvent<HTMLDivElement>) { tapEligible.current = false; handledTouch.current = false; suppressClick.current = true; points.current.delete(e.pointerId); rebase(); }
  function touchEnd(e: TouchEvent<HTMLDivElement>) {
    if (!handledTouch.current) return;
    // Cancel the compatibility click, so this contact owns exactly one action.
    e.preventDefault(); handledTouch.current = false;
    if (e.nativeEvent.defaultPrevented) suppressClick.current = false;
  }
  function key(e: KeyboardEvent<HTMLDivElement>) { if (e.key === 'Enter' || e.key === ' ') suppressClick.current = false; }
  function lost(e: PointerEvent<HTMLDivElement>) { if (e.target === e.currentTarget) { points.current.delete(e.pointerId); rebase(); } }
  function click(e: MouseEvent<HTMLDivElement>) { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }
  function doubleClick(e: MouseEvent<HTMLDivElement>) { if ((e.target as HTMLElement).closest('button')) return; e.preventDefault(); const p = local(e); zoom(current.current.zoom >= 3 ? 1 / current.current.zoom : 2, p.x, p.y); }
  return { camera, setCamera, zoom, handlers: { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: cancel, onTouchEnd: touchEnd, onKeyDownCapture: key, onLostPointerCapture: lost, onClickCapture: click, onDoubleClick: doubleClick } };
}
