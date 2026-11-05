import { describe,it,expect } from 'vitest';
import { pinchMapCamera, boundMapCamera, MAP_MAX_ZOOM } from '../src/domain/map-camera';
describe('map camera focal-point gestures',()=>{
 const v={width:600,height:600};
 it('keeps the touched world point under the moving pinch centroid',()=>{
  const c={x:0,y:0,zoom:2},from={x:220,y:270},to={x:240,y:300};
  const next=pinchMapCamera(c,from,to,2,v);
  expect((from.x-300-c.x)/c.zoom).toBeCloseTo((to.x-300-next.x)/next.zoom);
  expect((from.y-300-c.y)/c.zoom).toBeCloseTo((to.y-300-next.y)/next.zoom);
 });
 it('pans with both fingers even when their distance stays unchanged',()=>{expect(pinchMapCamera({x:0,y:0,zoom:2},{x:300,y:300},{x:330,y:350},1,v)).toEqual({x:30,y:50,zoom:2});});
 it('uses the actual bounded ratio at the zoom limit and never exposes empty land',()=>{
  expect(pinchMapCamera({x:0,y:0,zoom:4},{x:200,y:300},{x:200,y:300},10,v)).toEqual({zoom:MAP_MAX_ZOOM,x:12.5,y:0});
  expect(boundMapCamera({x:1e6,y:1e6,zoom:.1},v)).toEqual({zoom:1,x:0,y:150});
 });
});
