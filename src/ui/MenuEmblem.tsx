import { AtlasIcon } from './AtlasIcon';

export type MenuEmblemKind = 'party' | 'monster' | 'bag' | 'wish' | 'codex' | 'settings';
const frames: Record<MenuEmblemKind, 0 | 1 | 2 | 3 | 4 | 5> = { party: 0, monster: 1, bag: 2, wish: 3, codex: 4, settings: 5 };

/** Every menu uses the same generated, painted icon set. */
export function MenuEmblem({ kind }: { kind: MenuEmblemKind }) {
  return <AtlasIcon asset="menu-atlas" frame={frames[kind]} className={`menu-emblem menu-emblem--${kind}`} />;
}
