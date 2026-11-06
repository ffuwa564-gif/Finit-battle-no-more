import {describe,it,expect} from 'vitest';
import {existsSync} from 'node:fs';
import {inventoryArtAssets} from '../src/content/inventory-art';
import sprites from '../src/content/inventory-sprites.json';
import {industryCatalog} from '../src/domain/industry';
describe('inventory artwork contract',()=>{
 it('covers every craftable item and all real rough-stone expectations',()=>{
  for(const item of industryCatalog.items)expect(sprites).toHaveProperty(item.id);
  for(const promise of ['ordinary','glimmering','radiant'])expect(sprites).toHaveProperty(`rough-${promise}`);
 });
 it('registers valid local artwork and keeps sprite regions within their atlas',()=>{
  for(const art of inventoryArtAssets)expect(existsSync(`public/${art.path}`)).toBe(true);
  for(const sprite of Object.values(sprites)){
   expect(sprite.x).toBeGreaterThanOrEqual(0);expect(sprite.y).toBeGreaterThanOrEqual(0);
   expect(sprite.x+sprite.width).toBeLessThanOrEqual(sprite.atlasWidth);expect(sprite.y+sprite.height).toBeLessThanOrEqual(sprite.atlasHeight);
   expect(inventoryArtAssets.some(art=>art.id===`inventory-${sprite.atlas}`)).toBe(true);
  }
 });
});
