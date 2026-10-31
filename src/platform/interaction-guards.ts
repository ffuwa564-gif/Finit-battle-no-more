const editable = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
function protectedSurface(node: Node | null): boolean {
  const element = node instanceof Element ? node : node?.parentElement;
  return !!element?.closest('[data-game-surface]') && !element.closest(editable);
}

/** Safari selection/callouts compete with the game's hold–drag controls. Keep
 * native editing and copying available in backup/name inputs. */
export function installGameInteractionGuards(): () => void {
  const prevent = (event: Event) => {
    if (protectedSurface(event.target as Node)) event.preventDefault();
  };
  const clear = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && (protectedSurface(selection.anchorNode) || protectedSurface(selection.focusNode))) selection.removeAllRanges();
  };
  document.addEventListener('selectstart', prevent, true);
  document.addEventListener('contextmenu', prevent, true);
  document.addEventListener('dragstart', prevent, true);
  document.addEventListener('selectionchange', clear);
  clear();
  return () => {
    document.removeEventListener('selectstart', prevent, true);
    document.removeEventListener('contextmenu', prevent, true);
    document.removeEventListener('dragstart', prevent, true);
    document.removeEventListener('selectionchange', clear);
  };
}
