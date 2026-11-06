import type { Content, DungeonDef } from '../domain/types';

/** The map is the only dungeon screen. These are overlays, never list modes. */
export type DungeonPanel = 'tower' | 'memories' | 'boss-events';
export type DungeonDestination =
  | { kind: 'map'; dungeonId?: string }
  | { kind: 'prepare'; dungeonId: string }
  | { kind: 'panel'; panel: DungeonPanel };

export function dungeonHash(destination: DungeonDestination): string {
  switch (destination.kind) {
    case 'map': return destination.dungeonId ? `dungeons/map/${encodeURIComponent(destination.dungeonId)}` : 'dungeons';
    case 'prepare': return `dungeons/prepare/${encodeURIComponent(destination.dungeonId)}`;
    case 'panel': return `dungeons/panel/${destination.panel}`;
  }
}

export function readDungeonDestination(hash: string, content: Content): DungeonDestination {
  const path = hash.replace(/^#/, '').split('/');
  if (path[0] !== 'dungeons') return { kind: 'map' };
  if (path[1] === 'map' || path[1] === 'prepare') {
    try {
      const id = decodeURIComponent(path[2] ?? '');
      if (content.dungeons.some(d => d.id === id && d.published)) return { kind: path[1], dungeonId: id };
    } catch { /* Broken bookmarks return to the map. */ }
    return { kind: 'map' };
  }
  const panel = path[1] === 'panel' ? path[2] : path[1];
  if (panel === 'tower' || panel === 'memories' || panel === 'boss-events') return { kind: 'panel', panel };
  // Old category bookmarks focus an actual location; they cannot render an old list.
  const stage = path[1] === 'events' ? content.dungeons.find(d => d.published && d.kind === 'event' && !d.eventId)
    : path[1] === 'trials' ? content.dungeons.find(d => d.published && d.kind === 'trial') : undefined;
  return { kind: 'map', ...(stage ? { dungeonId: stage.id } : {}) };
}

export function dungeonReturnDestination(dungeon?: DungeonDef): DungeonDestination {
  return dungeon?.towerFloor ? { kind: 'panel', panel: 'tower' } : { kind: 'map', dungeonId: dungeon?.id };
}
