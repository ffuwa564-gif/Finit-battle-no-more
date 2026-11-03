import type { AssetDef, PortraitHeadBounds } from '../domain/types';

/** Smallest face window used by the party strip, including its legacy wide layout. */
export const FACE_FRAME_ASPECTS = [.95, 1.05, 1.08, 1.15, 1.5] as const;

/** Head bounds are measured on the original artwork, in normalized coordinates.
 * Keep vertical cropping at the top: applying object-position and zoom offsets
 * together was moving newly recruited characters' heads outside their frames.
 */
export function createFacePortrait(source: Pick<AssetDef, 'path' | 'width' | 'height' | 'rights'>, id: string, head: PortraitHeadBounds, zoom = 2.1): AssetDef {
  if (!Number.isFinite(zoom) || zoom <= 1 || zoom > 3) throw new Error('Face portrait zoom must be greater than 1 and at most 3');
  const center = head.x + head.width / 2;
  const originX = (zoom * center - .5) / (zoom - 1);
  return { ...source, id, kind: 'portrait', anchor: '50% 0%', portraitZoom: zoom, portraitOrigin: `${Number((originX * 100).toFixed(4))}% 0%`, portraitHead: head };
}

/** Project the reviewed head rectangle through object-fit and CSS transform.
 * This also validates later manual changes to anchor/zoom/origin, not just the factory.
 */
export function portraitHeadFits(asset: AssetDef, frameAspect: number): boolean {
  const head = asset.portraitHead;
  if (!head || ![head.x,head.y,head.width,head.height].every(Number.isFinite) || head.width <= 0 || head.height <= 0 || head.x < 0 || head.y < 0 || head.x + head.width > 1 || head.y + head.height > 1) return false;
  const coords = (value: string) => /^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/.exec(value)?.slice(1).map(Number).map(v=>v/100);
  const anchor = coords(asset.anchor), origin = coords(asset.portraitOrigin ?? asset.anchor), zoom = asset.portraitZoom ?? 1;
  if (!anchor || !origin || !Number.isFinite(zoom)) return false;
  const h = 1 / frameAspect, scale = Math.max(1 / asset.width, h / asset.height);
  const wImage = asset.width * scale, hImage = asset.height * scale;
  const x = (1-wImage)*anchor[0]!, y = (h-hImage)*anchor[1]!;
  const left = (x + head.x*wImage)*zoom + origin[0]!*(1-zoom);
  const top = (y + head.y*hImage)*zoom + origin[1]!*h*(1-zoom);
  const right = left + head.width*wImage*zoom, bottom = top + head.height*hImage*zoom;
  return left >= 0 && top >= 0 && right <= 1 && bottom <= h;
}
