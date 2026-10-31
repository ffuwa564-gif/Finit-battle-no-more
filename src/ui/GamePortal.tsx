import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './game-interaction.css';

/** Every portal carries the same native-interaction policy as the application
 * root, regardless of its container. display:contents preserves the layout. */
export function createGamePortal(children: ReactNode, container: Element | DocumentFragment, key?: string | null) {
  return createPortal(<div data-game-surface="true" className="game-portal">{children}</div>, container, key);
}
