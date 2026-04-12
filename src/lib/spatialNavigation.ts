/**
 * Spatial DOM focus navigation for gamepad/keyboard input.
 * Picks the next focusable element in a 2D direction from the currently
 * focused one, scoring candidates by primary-axis distance plus a
 * cross-axis misalignment penalty.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]:not([disabled])',
].join(',');

function isVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function getFocusables(scope: HTMLElement | Document = document): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
}

export function findNextFocusable(
  current: HTMLElement | null,
  direction: Direction,
  scope: HTMLElement | Document = document,
): HTMLElement | null {
  const candidates = getFocusables(scope).filter((el) => el !== current);
  if (candidates.length === 0) return null;

  // No current focus → return first candidate near top-left.
  if (!current) {
    return candidates.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return ra.top - rb.top || ra.left - rb.left;
    })[0];
  }

  const from = current.getBoundingClientRect();
  const fromCenter = { x: from.left + from.width / 2, y: from.top + from.height / 2 };

  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of candidates) {
    const to = el.getBoundingClientRect();
    const toCenter = { x: to.left + to.width / 2, y: to.top + to.height / 2 };
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    let inDir = false;
    switch (direction) {
      case 'up':    inDir = dy < -1; break;
      case 'down':  inDir = dy > 1; break;
      case 'left':  inDir = dx < -1; break;
      case 'right': inDir = dx > 1; break;
    }
    if (!inDir) continue;

    const primary = direction === 'up' || direction === 'down' ? Math.abs(dy) : Math.abs(dx);
    const cross   = direction === 'up' || direction === 'down' ? Math.abs(dx) : Math.abs(dy);
    const score = primary + cross * 3;

    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return best;
}

export function focusInDirection(direction: Direction): boolean {
  const active = (document.activeElement as HTMLElement | null) ?? null;
  const next = findNextFocusable(
    active && active !== document.body ? active : null,
    direction,
  );
  if (next) {
    next.focus();
    next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    return true;
  }
  return false;
}
