import { describe, it, expect } from 'vitest';
import { content } from '../src/content';
import { dungeonHash, readDungeonDestination, dungeonReturnDestination } from '../src/application/dungeon-navigation';
describe('map-only dungeon navigation', () => {
  it('migrates category bookmarks to map locations and special features to overlays', () => {
    for (const hash of ['#dungeons/list', '#dungeons/events', '#dungeons/trials', '#dungeons/unknown']) {
      const destination = readDungeonDestination(hash, content);
      expect(destination.kind).toBe('map');
      expect(dungeonHash(destination)).not.toMatch(/\/(list|events|trials)$/);
    }
    expect(readDungeonDestination('#dungeons/events', content)).toEqual({kind:'map',dungeonId:content.dungeons.find(d=>d.published&&d.kind==='event'&&!d.eventId)!.id});
    expect(dungeonHash(readDungeonDestination('#dungeons/tower',content))).toBe('dungeons/panel/tower');
    expect(readDungeonDestination('#dungeons/map/%E0%A4%A',content)).toEqual({kind:'map'});
    expect(readDungeonDestination('#dungeons/prepare/missing',content)).toEqual({kind:'map'});
  });
  it('returns every published expedition to its map location or tower overlay', () => {
    for (const dungeon of content.dungeons.filter(d=>d.published)) {
      const destination = dungeonReturnDestination(dungeon);
      expect(readDungeonDestination('#'+dungeonHash(destination),content)).toEqual(destination);
      expect(destination).toEqual(dungeon.towerFloor?{kind:'panel',panel:'tower'}:{kind:'map',dungeonId:dungeon.id});
    }
  });
});
