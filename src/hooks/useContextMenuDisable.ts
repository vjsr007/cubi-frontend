import { useEffect } from 'react';

/**
 * Disables the browser's default context menu globally.
 * Optionally allows context menu in text inputs for copy/paste.
 * 
 * @param allowInInputs - If true, right-click context menu works in input/textarea elements
 */
export function useContextMenuDisable(allowInInputs = true): void {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // If allowInInputs is true, check if target is a text input
      if (allowInInputs && isTextInput(e.target as HTMLElement)) {
        return; // Allow default behavior in text inputs
      }
      
      e.preventDefault(); // Prevent default context menu
    };

    document.addEventListener('contextmenu', handleContextMenu, false);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, false);
    };
  }, [allowInInputs]);
}

/**
 * Check if element is a text input element
 */
function isTextInput(element: HTMLElement): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element.contentEditable === 'true'
  );
}
