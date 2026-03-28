````skill
---
name: gamepad-input
description: Skill for implementing gamepad/controller navigation using the Web Gamepad API, including button mapping, analog stick navigation, input profiles, focus management, and virtual keyboard support for an emulator frontend optimized for TV/couch usage.
version: "1.0.0"
metadata:
  author: cubi-frontend team
  domain: retro-gaming
  language: typescript
  framework: "React 19"
---

# Gamepad Input Skill

## Purpose
Guide the implementation of full gamepad/controller support for cubi-frontend, enabling couch/TV usage with standard game controllers (Xbox, PlayStation, Switch Pro, 8BitDo, etc.) as the PRIMARY input method.

## Architecture Overview

### Input Priority
```
1. Gamepad (PRIMARY — this is an emulator frontend)
2. Keyboard (secondary — for desktop users)
3. Mouse/Touch (tertiary — for settings/config)
```

### Key Requirements
- **Zero-configuration** — standard controllers should work out of the box
- **Button mapping** matches console conventions (A=confirm, B=back)
- **Analog stick** drives spatial navigation through the UI grid
- **Multiple controllers** — support up to 4 gamepads simultaneously
- **Haptic feedback** — when available (DualSense, Xbox)
- **Virtual keyboard** — for search fields (on-screen, navigable by gamepad)

---

## Gamepad API Integration

### Core Polling Loop
```typescript
// src/hooks/useGamepadInput.ts

interface GamepadState {
  connected: boolean;
  id: string;
  buttons: Record<StandardButton, ButtonState>;
  axes: { lx: number; ly: number; rx: number; ry: number };
  timestamp: number;
}

interface ButtonState {
  pressed: boolean;
  justPressed: boolean;  // True only on the frame it was first pressed
  justReleased: boolean;
  value: number;         // 0-1 for analog triggers
}

// Standard button mapping (standard layout)
enum StandardButton {
  A = 0,          // Cross (PS) / A (Xbox) — CONFIRM
  B = 1,          // Circle (PS) / B (Xbox) — BACK
  X = 2,          // Square (PS) / X (Xbox)
  Y = 3,          // Triangle (PS) / Y (Xbox)
  LB = 4,         // L1 / LB — Previous tab/system
  RB = 5,         // R1 / RB — Next tab/system
  LT = 6,         // L2 / LT — Page up / scroll
  RT = 7,         // R2 / RT — Page down / scroll
  Select = 8,     // Share / Back — Toggle menu
  Start = 9,      // Options / Start — Context menu
  L3 = 10,        // Left stick press — Search
  R3 = 11,        // Right stick press — View toggle
  DPadUp = 12,
  DPadDown = 13,
  DPadLeft = 14,
  DPadRight = 15,
  Home = 16,      // PS / Guide — Home screen
}

const DEADZONE = 0.25;        // Analog stick deadzone
const REPEAT_DELAY = 400;     // ms before repeat starts
const REPEAT_RATE = 80;       // ms between repeats

export function useGamepadInput() {
  const prevState = useRef<Map<number, GamepadState>>(new Map());
  const repeatTimers = useRef<Map<string, number>>(new Map());
  const frameRef = useRef<number>(0);
  
  useEffect(() => {
    function pollGamepads() {
      const gamepads = navigator.getGamepads();
      
      for (const gp of gamepads) {
        if (!gp) continue;
        
        const prev = prevState.current.get(gp.index);
        const state = readGamepadState(gp, prev);
        
        // Process inputs
        processButtons(state);
        processAxes(state);
        
        prevState.current.set(gp.index, state);
      }
      
      frameRef.current = requestAnimationFrame(pollGamepads);
    }
    
    frameRef.current = requestAnimationFrame(pollGamepads);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);
}

function readGamepadState(gp: Gamepad, prev?: GamepadState): GamepadState {
  const buttons: Record<number, ButtonState> = {};
  
  for (let i = 0; i < gp.buttons.length; i++) {
    const btn = gp.buttons[i];
    const wasPressed = prev?.buttons[i]?.pressed ?? false;
    
    buttons[i] = {
      pressed: btn.pressed,
      justPressed: btn.pressed && !wasPressed,
      justReleased: !btn.pressed && wasPressed,
      value: btn.value,
    };
  }
  
  return {
    connected: gp.connected,
    id: gp.id,
    buttons,
    axes: {
      lx: applyDeadzone(gp.axes[0] ?? 0),
      ly: applyDeadzone(gp.axes[1] ?? 0),
      rx: applyDeadzone(gp.axes[2] ?? 0),
      ry: applyDeadzone(gp.axes[3] ?? 0),
    },
    timestamp: gp.timestamp,
  };
}

function applyDeadzone(value: number): number {
  return Math.abs(value) < DEADZONE ? 0 : value;
}
```

---

## Spatial Navigation (Focus Management)

```typescript
// src/lib/spatialNavigation.ts

interface FocusableElement {
  element: HTMLElement;
  rect: DOMRect;
}

type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Find the best focusable element in the given direction from current focus.
 * Uses a scoring algorithm based on distance + alignment.
 */
export function findNextFocusable(
  current: HTMLElement,
  direction: Direction,
  container?: HTMLElement | null,
): HTMLElement | null {
  const scope = container ?? document.body;
  const focusables = Array.from(
    scope.querySelectorAll<HTMLElement>('[tabindex], button, a, input, [role="button"]')
  ).filter((el) => {
    const style = getComputedStyle(el);
    return (
      el !== current &&
      el.tabIndex >= 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      el.offsetParent !== null
    );
  });
  
  if (focusables.length === 0) return null;
  
  const from = current.getBoundingClientRect();
  let bestCandidate: HTMLElement | null = null;
  let bestScore = Infinity;
  
  for (const el of focusables) {
    const to = el.getBoundingClientRect();
    
    // Check if candidate is in the correct direction
    if (!isInDirection(from, to, direction)) continue;
    
    // Score: combination of distance and alignment
    const score = calculateScore(from, to, direction);
    if (score < bestScore) {
      bestScore = score;
      bestCandidate = el;
    }
  }
  
  return bestCandidate;
}

function isInDirection(from: DOMRect, to: DOMRect, dir: Direction): boolean {
  const fromCenter = { x: from.left + from.width / 2, y: from.top + from.height / 2 };
  const toCenter = { x: to.left + to.width / 2, y: to.top + to.height / 2 };
  
  switch (dir) {
    case 'up':    return toCenter.y < fromCenter.y;
    case 'down':  return toCenter.y > fromCenter.y;
    case 'left':  return toCenter.x < fromCenter.x;
    case 'right': return toCenter.x > fromCenter.x;
  }
}

function calculateScore(from: DOMRect, to: DOMRect, dir: Direction): number {
  const fromCenter = { x: from.left + from.width / 2, y: from.top + from.height / 2 };
  const toCenter = { x: to.left + to.width / 2, y: to.top + to.height / 2 };
  
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  
  // Distance along primary axis
  const primaryDist = (dir === 'up' || dir === 'down') ? Math.abs(dy) : Math.abs(dx);
  // Distance along cross axis (penalty for misalignment)
  const crossDist = (dir === 'up' || dir === 'down') ? Math.abs(dx) : Math.abs(dy);
  
  // Weighted: strongly prefer aligned elements
  return primaryDist + crossDist * 3;
}
```

### Focus Manager Zustand Store
```typescript
// src/stores/focusStore.ts
import { create } from 'zustand';

interface FocusState {
  currentFocusId: string | null;
  focusHistory: string[];      // For back navigation
  navigationMode: 'gamepad' | 'keyboard' | 'mouse';
  
  setFocus: (id: string) => void;
  goBack: () => void;
  setNavigationMode: (mode: 'gamepad' | 'keyboard' | 'mouse') => void;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  currentFocusId: null,
  focusHistory: [],
  navigationMode: 'gamepad',
  
  setFocus: (id) => set((state) => ({
    currentFocusId: id,
    focusHistory: [...state.focusHistory, id].slice(-50), // Keep last 50
  })),
  
  goBack: () => set((state) => {
    const history = [...state.focusHistory];
    history.pop(); // Remove current
    const prev = history[history.length - 1] ?? null;
    return { currentFocusId: prev, focusHistory: history };
  }),
  
  setNavigationMode: (mode) => set({ navigationMode: mode }),
}));
```

---

## Action Mapping

```typescript
// src/lib/gamepadActions.ts

interface GamepadAction {
  button: StandardButton;
  action: string;
  context?: string;  // Only active in this context
}

const defaultActions: GamepadAction[] = [
  // Universal
  { button: StandardButton.A, action: 'confirm' },
  { button: StandardButton.B, action: 'back' },
  { button: StandardButton.Start, action: 'context-menu' },
  { button: StandardButton.Select, action: 'toggle-sidebar' },
  { button: StandardButton.Home, action: 'go-home' },
  
  // Navigation
  { button: StandardButton.LB, action: 'prev-system' },
  { button: StandardButton.RB, action: 'next-system' },
  { button: StandardButton.LT, action: 'page-up' },
  { button: StandardButton.RT, action: 'page-down' },
  
  // Utility
  { button: StandardButton.L3, action: 'search' },
  { button: StandardButton.R3, action: 'toggle-layout' },
  { button: StandardButton.Y, action: 'favorite-toggle' },
  { button: StandardButton.X, action: 'game-options' },
  
  // Game list context
  { button: StandardButton.A, action: 'launch-game', context: 'game-list' },
  { button: StandardButton.Y, action: 'toggle-favorite', context: 'game-list' },
  { button: StandardButton.X, action: 'game-details', context: 'game-list' },
];

/**
 * Process a button press and dispatch the appropriate action
 */
function processButtonAction(
  button: StandardButton,
  context: string,
  dispatch: (action: string) => void,
) {
  // Context-specific actions take priority
  const contextAction = defaultActions.find(
    (a) => a.button === button && a.context === context,
  );
  if (contextAction) {
    dispatch(contextAction.action);
    return;
  }
  
  // Fall back to universal actions
  const universalAction = defaultActions.find(
    (a) => a.button === button && !a.context,
  );
  if (universalAction) {
    dispatch(universalAction.action);
  }
}
```

---

## Button Repeat (for Scrolling)

```typescript
// D-pad and analog stick need repeat functionality for scrolling

class RepeatManager {
  private timers = new Map<string, { timeout: NodeJS.Timeout; interval?: NodeJS.Timeout }>();
  
  startRepeat(key: string, callback: () => void) {
    this.stopRepeat(key);
    
    // Execute immediately
    callback();
    
    // Start repeat after delay
    const timeout = setTimeout(() => {
      const interval = setInterval(callback, REPEAT_RATE);
      this.timers.set(key, { timeout, interval });
    }, REPEAT_DELAY);
    
    this.timers.set(key, { timeout });
  }
  
  stopRepeat(key: string) {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer.timeout);
      if (timer.interval) clearInterval(timer.interval);
      this.timers.delete(key);
    }
  }
  
  stopAll() {
    for (const key of this.timers.keys()) {
      this.stopRepeat(key);
    }
  }
}
```

---

## Virtual Keyboard (On-Screen)

```tsx
// src/components/input/VirtualKeyboard.tsx
import { motion, AnimatePresence } from 'framer-motion';

const KEYBOARD_ROWS = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L','⌫'],
  ['Z','X','C','V','B','N','M',' ','↵',''],
];

interface VirtualKeyboardProps {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

function VirtualKeyboard({ visible, value, onChange, onSubmit, onClose }: VirtualKeyboardProps) {
  const [row, setRow] = useState(0);
  const [col, setCol] = useState(0);
  
  // Navigate with gamepad
  useGamepadNavigation({
    onDirection: (dir) => {
      switch (dir) {
        case 'up': setRow((r) => Math.max(0, r - 1)); break;
        case 'down': setRow((r) => Math.min(KEYBOARD_ROWS.length - 1, r + 1)); break;
        case 'left': setCol((c) => Math.max(0, c - 1)); break;
        case 'right': setCol((c) => Math.min(KEYBOARD_ROWS[row].length - 1, c + 1)); break;
      }
    },
    onConfirm: () => {
      const key = KEYBOARD_ROWS[row][col];
      if (key === '⌫') onChange(value.slice(0, -1));
      else if (key === '↵') onSubmit(value);
      else onChange(value + key);
    },
    onBack: onClose,
  });
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 300, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-(--color-surface-100) p-6"
        >
          {/* Search input display */}
          <div className="text-center text-2xl mb-4 text-(--color-text-primary)">
            {value || 'Type to search...'}
            <span className="animate-pulse">|</span>
          </div>
          
          {/* Keyboard grid */}
          <div className="flex flex-col items-center gap-2">
            {KEYBOARD_ROWS.map((keys, r) => (
              <div key={r} className="flex gap-2">
                {keys.map((key, c) => (
                  <motion.button
                    key={`${r}-${c}`}
                    className={`w-14 h-14 rounded text-lg font-medium
                      ${r === row && c === col
                        ? 'bg-(--color-primary-500) text-white scale-110'
                        : 'bg-(--color-surface-200) text-(--color-text-secondary)'
                      }`}
                    whileHover={{ scale: 1.1 }}
                  >
                    {key === ' ' ? '␣' : key}
                  </motion.button>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## Controller Detection & Profiles

```typescript
// src/lib/controllerProfiles.ts

interface ControllerProfile {
  matchPattern: RegExp;
  name: string;
  icon: string;  // Controller icon variant
  buttonLabels: Record<StandardButton, string>;
  hapticSupport: boolean;
}

const profiles: ControllerProfile[] = [
  {
    matchPattern: /xbox|xinput/i,
    name: 'Xbox Controller',
    icon: 'xbox',
    buttonLabels: {
      [StandardButton.A]: 'A',
      [StandardButton.B]: 'B',
      [StandardButton.X]: 'X',
      [StandardButton.Y]: 'Y',
      // ...
    },
    hapticSupport: true,
  },
  {
    matchPattern: /playstation|dualshock|dualsense|054c/i,
    name: 'PlayStation Controller',
    icon: 'playstation',
    buttonLabels: {
      [StandardButton.A]: '✕',
      [StandardButton.B]: '○',
      [StandardButton.X]: '□',
      [StandardButton.Y]: '△',
      // ...
    },
    hapticSupport: true,
  },
  {
    matchPattern: /nintendo|pro controller|057e/i,
    name: 'Nintendo Controller',
    icon: 'nintendo',
    buttonLabels: {
      [StandardButton.A]: 'A',   // Note: Nintendo A/B are swapped positionally
      [StandardButton.B]: 'B',
      [StandardButton.X]: 'X',
      [StandardButton.Y]: 'Y',
    },
    hapticSupport: false,
  },
  {
    matchPattern: /8bitdo/i,
    name: '8BitDo Controller',
    icon: '8bitdo',
    buttonLabels: {
      [StandardButton.A]: 'A',
      [StandardButton.B]: 'B',
      [StandardButton.X]: 'X',
      [StandardButton.Y]: 'Y',
    },
    hapticSupport: false,
  },
];

export function detectControllerProfile(gamepadId: string): ControllerProfile {
  return profiles.find((p) => p.matchPattern.test(gamepadId)) ?? profiles[0]; // Default to Xbox
}
```

---

## Haptic Feedback

```typescript
// src/lib/haptics.ts

export function triggerHaptic(
  gamepad: Gamepad,
  type: 'light' | 'medium' | 'heavy' | 'confirm' | 'error',
) {
  if (!gamepad.vibrationActuator) return;
  
  const patterns: Record<string, { duration: number; weakMagnitude: number; strongMagnitude: number }> = {
    light:   { duration: 30,  weakMagnitude: 0.2, strongMagnitude: 0.0 },
    medium:  { duration: 50,  weakMagnitude: 0.5, strongMagnitude: 0.3 },
    heavy:   { duration: 100, weakMagnitude: 0.8, strongMagnitude: 0.6 },
    confirm: { duration: 40,  weakMagnitude: 0.4, strongMagnitude: 0.2 },
    error:   { duration: 150, weakMagnitude: 1.0, strongMagnitude: 0.8 },
  };
  
  const pattern = patterns[type];
  gamepad.vibrationActuator.playEffect('dual-rumble', pattern).catch(() => {});
}
```

---

## React Integration Hook

```typescript
// src/hooks/useGamepadNavigation.ts
import { useEffect } from 'react';

interface GamepadNavigationOptions {
  onDirection?: (dir: Direction) => void;
  onConfirm?: () => void;
  onBack?: () => void;
  onMenu?: () => void;
  onShoulder?: (button: 'LB' | 'RB' | 'LT' | 'RT') => void;
  enabled?: boolean;
}

export function useGamepadNavigation(options: GamepadNavigationOptions) {
  const { enabled = true } = options;
  
  useEffect(() => {
    if (!enabled) return;
    
    const handler = (event: CustomEvent<GamepadActionEvent>) => {
      const { action } = event.detail;
      
      switch (action) {
        case 'nav-up':    options.onDirection?.('up'); break;
        case 'nav-down':  options.onDirection?.('down'); break;
        case 'nav-left':  options.onDirection?.('left'); break;
        case 'nav-right': options.onDirection?.('right'); break;
        case 'confirm':   options.onConfirm?.(); break;
        case 'back':      options.onBack?.(); break;
        case 'context-menu': options.onMenu?.(); break;
        case 'prev-system': options.onShoulder?.('LB'); break;
        case 'next-system': options.onShoulder?.('RB'); break;
        case 'page-up':    options.onShoulder?.('LT'); break;
        case 'page-down':  options.onShoulder?.('RT'); break;
      }
    };
    
    window.addEventListener('gamepad-action', handler as EventListener);
    return () => window.removeEventListener('gamepad-action', handler as EventListener);
  }, [enabled, options]);
}
```

---

## Key Design Rules

1. **Gamepad is PRIMARY input** — every screen must be fully navigable by gamepad alone
2. **A = Confirm, B = Back** — Xbox convention, always consistent
3. **Visible focus indicator** — focus ring must be obvious on all elements
4. **Analog stick repeat** — hold direction for continuous scrolling
5. **Deadzone of 0.25** — prevents drift on worn controllers
6. **Button prompts match controller** — show ✕○□△ for PlayStation, ABXY for Xbox
7. **No mouse-only interactions** — everything reachable by gamepad
8. **Haptic feedback** — subtle rumble on navigation, stronger on confirm/error
9. **Virtual keyboard** — on-screen keyboard for search (L3 to open)
10. **Multiple controllers** — support 1-4 simultaneous gamepads
11. **Auto-detect input mode** — switch UI prompts between gamepad/keyboard dynamically
12. **Sound effects on navigation** — audio feedback complements haptics
````
