export type UISound = 'confirm' | 'cancel' | 'select';
export function emitUISound(kind: UISound = 'confirm'): void { window.dispatchEvent(new CustomEvent('game:ui', { detail: { kind } })); }
