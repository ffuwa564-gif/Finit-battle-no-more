export interface MapCamera { x: number; y: number; zoom: number }
export interface MapViewport { width: number; height: number }
export interface ScreenPoint { x: number; y: number }
export const MAP_WIDTH = 1200, MAP_HEIGHT = 1800, MAP_MAX_ZOOM = 4.5, MAP_MIN_ZOOM = .75;
export function mapBase(v: MapViewport): number { return Math.max(v.width / MAP_WIDTH, v.height / MAP_HEIGHT) * 4 / 3; }
export function boundMapCamera(c: MapCamera, v: MapViewport): MapCamera {
  const zoom = Math.max(MAP_MIN_ZOOM, Math.min(MAP_MAX_ZOOM, c.zoom)), scale = mapBase(v) * zoom;
  const limitX = Math.max(0, (MAP_WIDTH * scale - v.width) / 2), limitY = Math.max(0, (MAP_HEIGHT * scale - v.height) / 2);
  return { zoom, x: Math.max(-limitX, Math.min(limitX, c.x)), y: Math.max(-limitY, Math.min(limitY, c.y)) };
}
/** Keep the map point under the original centroid under the moving fingers. */
export function pinchMapCamera(c: MapCamera, from: ScreenPoint, to: ScreenPoint, factor: number, v: MapViewport): MapCamera {
  const zoom = Math.max(MAP_MIN_ZOOM, Math.min(MAP_MAX_ZOOM, c.zoom * factor)), ratio = zoom / c.zoom;
  return boundMapCamera({ zoom, x: to.x - v.width / 2 - (from.x - v.width / 2 - c.x) * ratio, y: to.y - v.height / 2 - (from.y - v.height / 2 - c.y) * ratio }, v);
}
