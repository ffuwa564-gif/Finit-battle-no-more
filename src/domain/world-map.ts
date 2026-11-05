import type { Content } from './types';
export interface MapPosition { x: number; y: number }
export interface WorldLocation extends MapPosition { id: string; sceneId?: string; characterId?: string; teaser?: string; dungeonId?: string; label: string; kind: 'cathedral' | 'cave' | 'tower' | 'forest' | 'story' | 'event' | 'trial'; region?: string; representative?: boolean }
const regions: MapPosition[] = [{ x: .25, y: .39 }, { x: .73, y: .60 }, { x: .76, y: .43 }, { x: .24, y: .63 }, { x: .25, y: .22 }, { x: .67, y: .77 }, { x: .52, y: .16 }];
export const WORLD_START: MapPosition = { x: .38, y: .72 };
export function worldLocations(content: Content, completed: readonly string[]): WorldLocation[] {
  const locations: WorldLocation[] = [];
  for (const [i, chapter] of (content.chapters ?? []).entries()) {
    const anchor = regions[i % regions.length]!;
    const focus = chapter.dungeonIds.find(id => !completed.includes(id)) ?? chapter.dungeonIds.at(-1);
    chapter.dungeonIds.forEach((id, j) => {
      const stage = content.dungeons.find(d => d.id === id && d.published);
      if (!stage) return;
      const representative = id === focus;
      const angle = j * 2.39996;
      const radius = .025 + Math.sqrt(j) * .018;
      locations.push({ id, dungeonId: id, label: stage.name, region: chapter.id, representative, kind: i === 1 ? 'cave' : i === 3 ? 'forest' : 'cathedral', x: anchor.x + Math.cos(angle) * radius, y: anchor.y + Math.sin(angle) * radius * .65 });
    });
  }
  const tower = content.dungeons.find(d => d.towerFloor === 1);
  if (tower) locations.push({ id: 'world-tower', dungeonId: tower.id, label: '白亜の塔', kind: 'tower', x: .53, y: .28 });
  locations.push({ id: 'world-story', label: '旅人の灯', kind: 'story', x: .24, y: .53 }, { id: 'world-events', label: '宵宮への小径', kind: 'event', x: .81, y: .24 }, { id: 'world-trials', label: '女神の試練', kind: 'trial', x: .79, y: .13 });
  for (const scene of content.novels ?? []) {
    if (scene.trigger.kind !== 'map' || !scene.mapEncounter || !completed.includes(scene.trigger.dungeonId)) continue;
    const map = scene.mapEncounter;
    locations.push({ id: `story:${scene.id}`, sceneId: scene.id, characterId: map.characterId, teaser: map.teaser, label: scene.title, kind: 'story', x: map.x, y: map.y });
  }
  return locations;
}
export function travelSeconds(from: MapPosition, to: MapPosition): number { return Math.max(6, Math.min(45, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) * 70))); }
export function routePosition(from: MapPosition, to: MapPosition, progress: number): MapPosition {
  const t = Math.max(0, Math.min(1, progress)), u = 1 - t;
  const control = { x: (from.x + to.x) / 2 + .055, y: (from.y + to.y) / 2 };
  return { x: u * u * from.x + 2 * u * t * control.x + t * t * to.x, y: u * u * from.y + 2 * u * t * control.y + t * t * to.y };
}
export interface WorldJourney { from: MapPosition; to: MapPosition; destinationId: string; startedAt: number; arrivesAt: number }
export interface WorldTravelState { position: MapPosition; journey?: WorldJourney }
export function parseWorldTravel(value: unknown): WorldTravelState {
  const validPoint = (p: unknown): p is MapPosition => Boolean(p && typeof p === 'object' && 'x' in p && 'y' in p && typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
  if (!value || typeof value !== 'object' || !('position' in value) || !validPoint(value.position)) return { position: WORLD_START };
  const state: WorldTravelState = { position: value.position };
  if ('journey' in value && value.journey && typeof value.journey === 'object') {
    const j = value.journey;
    if ('from' in j && validPoint(j.from) && 'to' in j && validPoint(j.to) && 'destinationId' in j && typeof j.destinationId === 'string' && 'startedAt' in j && typeof j.startedAt === 'number' && Number.isFinite(j.startedAt) && 'arrivesAt' in j && typeof j.arrivesAt === 'number' && Number.isFinite(j.arrivesAt) && j.arrivesAt > j.startedAt && j.arrivesAt - j.startedAt <= 45000) state.journey = j as WorldJourney;
  }
  return state;
}
