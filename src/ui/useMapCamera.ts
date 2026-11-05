import { useEffect, useRef, useState, type PointerEvent, type MouseEvent, type RefObject } from 'react';
import { boundMapCamera, pinchMapCamera, type MapCamera, type MapViewport, type ScreenPoint } from '../domain/map-camera';
const center = (a: ScreenPoint, b: ScreenPoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: ScreenPoint, b: ScreenPoint) => Math.hypot(a.x - b.x, a.y - b.y);
export function useMapCamera(surface: RefObject<HTMLDivElement | null>, size: MapViewport) {
  const [camera, render] = useState<MapCamera>({ x: 0, y: 0, zoom: 1 });
  const current = useRef(camera), viewport = useRef(size); viewport.current = size;
  const points = useRef(new Map<number, ScreenPoint>()), origin = useRef({ camera, points: [] as ScreenPoint[] });
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
    const reset = () => { points.current.clear(); dragging.current = false; rebase(); };
    const visibility = () => { if (document.hidden) reset(); };
    el.addEventListener('wheel', wheel, { passive: false }); window.addEventListener('blur', reset); document.addEventListener('visibilitychange', visibility);
    return () => { el.removeEventListener('wheel', wheel); window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', visibility); if (frame.current !== undefined) cancelAnimationFrame(frame.current); frame.current = undefined; };
  }, []);
  function down(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!points.current.size) { dragging.current = false; suppressClick.current = false; }
    points.current.set(e.pointerId, local(e)); rebase();
    if (points.current.size >= 2) { dragging.current = true; suppressClick.current = true; for (const id of points.current.keys()) e.currentTarget.setPointerCapture(id); }
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (!points.current.has(e.pointerId)) return;
    points.current.set(e.pointerId, local(e)); const next = [...points.current.values()].slice(0, 2), start = origin.current.points;
    if (next.length === 2 && start.length === 2) {
      setCamera(pinchMapCamera(origin.current.camera, center(start[0], start[1]), center(next[0], next[1]), distance(next[0], next[1]) / Math.max(1, distance(start[0], start[1])), viewport.current));
    } else if (next.length === 1 && start.length === 1) {
      const dx = next[0].x - start[0].x, dy = next[0].y - start[0].y;
      if (!dragging.current && Math.hypot(dx, dy) < 6) return;
      dragging.current = true; suppressClick.current = true; e.currentTarget.setPointerCapture(e.pointerId);
      setCamera({ ...origin.current.camera, x: origin.current.camera.x + dx, y: origin.current.camera.y + dy });
    }
  }
  function up(e: PointerEvent<HTMLDivElement>) { if (!points.current.has(e.pointerId)) return; if (dragging.current) e.preventDefault(); points.current.delete(e.pointerId); rebase(); }
  function lost(e: PointerEvent<HTMLDivElement>) { if (e.target === e.currentTarget) { points.current.delete(e.pointerId); rebase(); } }
  function click(e: MouseEvent<HTMLDivElement>) { if (suppressClick.current && e.detail !== 0) { e.preventDefault(); e.stopPropagation(); } }
  function doubleClick(e: MouseEvent<HTMLDivElement>) { if ((e.target as HTMLElement).closest('button')) return; e.preventDefault(); const p = local(e); zoom(current.current.zoom >= 3 ? 1 / current.current.zoom : 2, p.x, p.y); }
  return { camera, setCamera, zoom, handlers: { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onLostPointerCapture: lost, onClickCapture: click, onDoubleClick: doubleClick } };
}
