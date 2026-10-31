const editable = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
function protectedSurface(node: Node | null): boolean {
  const element = node instanceof Element ? node : node?.parentElement;
  return !!element?.closest('#root, .command-dial-layer') && !element.closest(editable);
}

/** Safari selection/callouts compete with the game's hold–drag controls. Keep
 * native editing and copying available in backup/name inputs. */
export function installGameInteractionGuards(): () => void {
  const prevent = (event: Event) => {
    if (protectedSurface(event.target as Node)) event.preventDefault();
  };
  const clear = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && protectedSurface(selection.anchorNode)) selection.removeAllRanges();
  };
  document.addEventListener('selectstart', prevent);
  document.addEventListener('contextmenu', prevent);
  document.addEventListener('dragstart', prevent);
  document.addEventListener('selectionchange', clear);
  clear();
  return () => {
    document.removeEventListener('selectstart', prevent);
    document.removeEventListener('contextmenu', prevent);
    document.removeEventListener('dragstart', prevent);
    document.removeEventListener('selectionchange', clear);
  };
}
