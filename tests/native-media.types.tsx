import { GameImage, GameVideo } from '../src/ui/GameMedia';
import { PartyMemberActions } from '../src/ui/PartyMemberActions';

// Compile-time regression contract: artwork cannot become a native gesture
// owner or opt back into browser dragging/fullscreen controls.
export function nativeMediaTypeContract() {
  const valid = <GameImage src="portrait.png" alt="Companion" />;
  // @ts-expect-error native dragging is forbidden at the shared boundary
  const drag = <GameImage src="portrait.png" alt="" draggable />;
  // @ts-expect-error game interactions belong to the enclosing control
  const click = <GameImage src="portrait.png" alt="" onClick={() => {}} />;
  // @ts-expect-error video playback uses the shared game controls
  const controls = <GameVideo src="portrait.mp4" controls />;
  // @ts-expect-error roster callers cannot replace the shared action layout
  const layout = <PartyMemberActions membership="member" toggleDisabled={false} leaderDisabled={false} onToggle={() => {}} onLeader={() => {}} style={{ display: 'flex' }} />;
  return { valid, drag, click, controls, layout };
}
