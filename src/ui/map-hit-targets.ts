/** Compare rendered screen bounds: pins keep their size as the map zooms. */
export function overlappingMapPlaces(surface: HTMLElement, target: Element): string[] {
  const pressed = target.closest<HTMLElement>('[data-map-place]');
  if (!pressed || !surface.contains(pressed)) return [];
  const bounds = pressed.getBoundingClientRect(), viewport = surface.getBoundingClientRect();
  const intersects = (a: DOMRect, b: DOMRect) => a.width > 0 && a.height > 0 && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const others = [...surface.querySelectorAll<HTMLElement>('[data-map-place]')]
    .filter(el => el !== pressed && intersects(el.getBoundingClientRect(), bounds) && intersects(el.getBoundingClientRect(), viewport))
    .map(el => el.dataset.mapPlace!);
  return [pressed.dataset.mapPlace!, ...others];
}
