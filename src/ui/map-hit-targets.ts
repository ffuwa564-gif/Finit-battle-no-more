import type { ScreenPoint } from '../domain/map-camera';
const intersects = (a: DOMRect, b: DOMRect) => a.width > 0 && a.height > 0 && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
/** Include painted children: the rotated diamond extends beyond its button. */
function targets(surface: HTMLElement) {
  const viewport = surface.getBoundingClientRect();
  return [...surface.querySelectorAll<HTMLElement>('[data-map-place]')].map(element => ({
    element, id: element.dataset.mapPlace!,
    rects: [element, ...element.children].map(el => el.getBoundingClientRect()).filter(r => intersects(r, viewport)),
  })).filter(t => t.rects.length);
}
/** Hit-test screen pixels, independently of Safari's synthesized click target. */
export function mapPlacesAtPoint(surface: HTMLElement, point: ScreenPoint): string[] {
  const viewport = surface.getBoundingClientRect();
  if (point.x < viewport.left || point.x > viewport.right || point.y < viewport.top || point.y > viewport.bottom) return [];
  const distance = (r: DOMRect) => Math.hypot(Math.max(r.left - point.x, 0, point.x - r.right), Math.max(r.top - point.y, 0, point.y - r.bottom));
  return targets(surface).map(t => ({ ...t, distance: Math.min(...t.rects.map(distance)) }))
    .filter(t => t.distance <= 8).sort((a, b) => a.distance - b.distance).map(t => t.id);
}
/** Keyboard/assistive clicks retain the same overlap chooser. */
export function overlappingMapPlaces(surface: HTMLElement, target: Element): string[] {
  const pressed = target.closest<HTMLElement>('[data-map-place]');
  const all = targets(surface), hit = all.find(t => t.element === pressed);
  if (!hit) return [];
  return [hit.id, ...all.filter(t => t !== hit && t.rects.some(r => hit.rects.some(h => intersects(r, h)))).map(t => t.id)];
}
