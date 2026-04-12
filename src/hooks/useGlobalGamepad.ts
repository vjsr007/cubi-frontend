import { useCallback } from 'react';
import { useGamepad, type GamepadButton } from './useGamepad';
import { useUiStore } from '../stores/uiStore';
import { focusInDirection } from '../lib/spatialNavigation';

/**
 * Pages that own their own gamepad input handling. The global handler will
 * skip directional / confirm buttons while these pages are active so they
 * don't fight with local logic.
 */
const LOCAL_INPUT_PAGES = new Set<string>(['library']);

/**
 * Global, app-wide gamepad/joystick handler. Mount once near the App root.
 *
 * Behavior:
 * - D-pad / Left stick → spatial DOM focus navigation (works on every page).
 * - A → click the focused element (Enter equivalent).
 * - B → goBack() in the UI store (or blur if at root).
 * - START → open settings.
 * - SELECT → toggle back to library.
 * - HOME → library.
 * - L1/R1 → cycle through main pages.
 * - L2/R2 → page up / page down on the focused scrollable container.
 */
export function useGlobalGamepad() {
  const handle = useCallback((btn: GamepadButton) => {
    const { currentPage, navigateTo, goBack } = useUiStore.getState();
    const localOwned = LOCAL_INPUT_PAGES.has(currentPage);

    switch (btn) {
      case 'UP':
      case 'DOWN':
      case 'LEFT':
      case 'RIGHT': {
        if (localOwned) return;
        const dir = btn.toLowerCase() as 'up' | 'down' | 'left' | 'right';
        focusInDirection(dir);
        return;
      }

      case 'A': {
        if (localOwned) return;
        const el = document.activeElement as HTMLElement | null;
        if (el && el !== document.body) el.click();
        return;
      }

      case 'B': {
        // Always available — close modals / navigate back.
        const el = document.activeElement as HTMLElement | null;
        if (el && el.tagName === 'INPUT') {
          el.blur();
          return;
        }
        goBack();
        return;
      }

      case 'START':
        navigateTo('settings');
        return;

      case 'SELECT':
        navigateTo('library');
        return;

      case 'HOME':
        navigateTo('library');
        return;

      case 'L1':
      case 'R1': {
        const order = ['library', 'pc-games', 'catalog', 'scraper', 'settings'] as const;
        const idx = order.indexOf(currentPage as typeof order[number]);
        if (idx === -1) return;
        const next = btn === 'R1'
          ? order[(idx + 1) % order.length]
          : order[(idx - 1 + order.length) % order.length];
        navigateTo(next);
        return;
      }

      case 'L2':
      case 'R2': {
        const el = (document.activeElement as HTMLElement | null) ?? document.body;
        const scrollable = findScrollableAncestor(el);
        if (!scrollable) return;
        const delta = scrollable.clientHeight * 0.85 * (btn === 'R2' ? 1 : -1);
        scrollable.scrollBy({ top: delta, behavior: 'smooth' });
        return;
      }
    }
  }, []);

  useGamepad({ onButton: handle });
}

function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let cur: HTMLElement | null = el;
  while (cur && cur !== document.body) {
    const style = getComputedStyle(cur);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && cur.scrollHeight > cur.clientHeight) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return document.scrollingElement as HTMLElement | null;
}
