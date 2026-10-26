import type { AssetDef } from '../domain/types';
import type { UltimateTheme } from '../domain/ultimates';

export const ultimateEffectIds = { blade: 'ultimate-fx-slash', stars: 'ultimate-fx-arcane', eclipse: 'ultimate-fx-arcane', bloom: 'ultimate-fx-sanctuary', aegis: 'ultimate-fx-sanctuary', dawn: 'ultimate-fx-sanctuary' } satisfies Record<UltimateTheme, string>;
export const ultimateEffectAssets: AssetDef[] = ['slash', 'arcane', 'sanctuary'].map(name => ({
  id: `ultimate-fx-${name}`, path: `video/ultimate-fx-${name}.mp4`, kind: 'video', width: 540, height: 540, anchor: '50% 50%',
  rights: 'Original STILLVEIL ultimate effect generated with Runway; edited for screen blending. Task IDs and processing in docs/ultimate-effects.md.',
}));
