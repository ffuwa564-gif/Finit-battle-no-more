import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { parseWorldTravel, routePosition, travelSeconds, worldLocations, worldRegions, WORLD_START } from '../src/domain/world-map';
describe('world map travel', () => {
 it('covers published campaign stages and keeps coordinates stable after clears',()=>{
  const a=worldLocations(content,[]),b=worldLocations(content,content.chapters!.flatMap(c=>c.dungeonIds));
  for(const id of content.chapters!.flatMap(c=>c.dungeonIds)) { const p=a.find(p=>p.id===id)!; expect(p).toBeDefined();const q=b.find(p=>p.id===id)!;expect([p.x,p.y]).toEqual([q.x,q.y]); }
 });
 it('places every available novel and every non-tower published dungeon, with seven distinct chapter regions',()=>{
  const completed=content.dungeons.map(d=>d.id),places=worldLocations(content,completed);
  expect(worldRegions(content)).toHaveLength(content.chapters!.length);
  expect(new Set(worldRegions(content).map(r=>`${r.x},${r.y}`)).size).toBe(content.chapters!.length);
  for(const d of content.dungeons.filter(d=>d.published&&!d.towerFloor))expect(places.some(p=>p.dungeonId===d.id),d.id).toBe(true);
  for(const scene of content.novels!)expect(places.filter(p=>p.sceneId===scene.id),scene.id).toHaveLength(1);
  for(const p of places){expect(p.x).toBeGreaterThanOrEqual(0);expect(p.x).toBeLessThanOrEqual(1);expect(p.y).toBeGreaterThanOrEqual(0);expect(p.y).toBeLessThanOrEqual(1);}
 });
 it('caps travel time and interpolates the actual route endpoints',()=>{
  const a={x:.2,y:.9},b={x:.8,y:.1};expect(travelSeconds(a,b)).toBe(45);expect(travelSeconds(a,a)).toBe(6);expect(routePosition(a,b,0)).toEqual(a);expect(routePosition(a,b,1)).toEqual(b);
 });
 it('rejects corrupt locations, non-finite times and unbounded waits',()=>{
  expect(parseWorldTravel({position:{x:Infinity,y:.5}})).toEqual({position:WORLD_START});
  const base={position:WORLD_START,journey:{from:WORLD_START,to:{x:.4,y:.4},destinationId:'test',startedAt:1,arrivesAt:Infinity}};
  expect(parseWorldTravel(base).journey).toBeUndefined();expect(parseWorldTravel({...base,journey:{...base.journey,arrivesAt:45002}}).journey).toBeUndefined();
  expect(parseWorldTravel({...base,journey:{...base.journey,arrivesAt:45001}}).journey).toBeDefined();
 });
});
