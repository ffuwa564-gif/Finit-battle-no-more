export type UISound = 'confirm' | 'cancel' | 'select';
interface Interaction { handled: boolean; requested?: UISound; parent?: Interaction }
let current: Interaction | undefined;

/** A command claims feedback synchronously, before persistence or other awaits.
 * Ownership belongs to this gesture, never to a time-based sound debounce.
 */
export function claimCommandFeedback(): boolean {
  if (!current) return false;
  for (let scope: Interaction | undefined = current; scope; scope = scope.parent) scope.handled = true;
  return true;
}
export function emitUISound(kind: UISound = 'confirm'): void {
  if (current) { current.requested = kind; return; }
  window.dispatchEvent(new CustomEvent('game:ui', { detail: { kind } }));
}
export function runUIInteraction(action: () => void, sound: UISound | false = 'confirm'): void {
  const scope: Interaction = { handled: false, parent: current };
  current = scope;
  try { action(); } finally { current = scope.parent; }
  const cue = scope.requested || sound;
  if (!scope.handled && cue) emitUISound(cue);
}
