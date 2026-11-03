import type { AssetDef } from '../domain/types';

/** Every video gets its own poster, including independently cropped portraits. */
export function withMotionPosters(assets: AssetDef[]): AssetDef[] {
  const videos = assets.filter(asset => asset.kind === 'video');
  return [
    ...assets.map(asset => asset.kind === 'video' ? { ...asset, posterId: `${asset.id}-poster` } : asset),
    ...videos.map(video => ({
      id: `${video.id}-poster`, path: `art/motion-posters/${video.id}.png`,
      kind: 'illustration' as const, width: video.width, height: video.height,
      anchor: video.anchor, rights: `First decoded frame of original project animation ${video.id}.`,
    })),
  ];
}
