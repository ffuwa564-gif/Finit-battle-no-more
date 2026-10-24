import { AtlasIcon } from './AtlasIcon';
import './command-emblem.css';

export type CommandEmblemKind = 'balanced' | 'aggressive' | 'survival' | 'advance' | 'replay' | 'potion';
const frames: Record<CommandEmblemKind, 0 | 1 | 2 | 3 | 4 | 5> = { balanced: 0, aggressive: 1, survival: 2, advance: 3, potion: 4, replay: 5 };

/** Commands share generated crystal, sacred-light, sword and vial artwork. */
export function CommandEmblem({ kind }: { kind: CommandEmblemKind }) {
  return <AtlasIcon asset="command-atlas" frame={frames[kind]} className={`command-emblem command-emblem--${kind}`} />;
}
