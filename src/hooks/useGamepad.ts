import { useEffect, useRef, useCallback } from 'react';

export type GamepadButton =
  | 'A' | 'B' | 'X' | 'Y'
  | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
  | 'START' | 'SELECT'
  | 'L1' | 'R1' | 'L2' | 'R2' | 'L3' | 'R3'
  | 'HOME';

export interface GamepadAxes {
  /** Left stick X (-1..1) after deadzone */
  lx: number;
  /** Left stick Y (-1..1) after deadzone */
  ly: number;
  /** Right stick X (-1..1) after deadzone */
  rx: number;
  /** Right stick Y (-1..1) after deadzone */
  ry: number;
}

interface GamepadHandlers {
  onButton?: (button: GamepadButton) => void;
  /** Called every frame with the analog axes of the active gamepad. */
  onAxes?: (axes: GamepadAxes) => void;
}

const BUTTON_MAP: Record<number, GamepadButton> = {
  0: 'A', 1: 'B', 2: 'X', 3: 'Y',
  4: 'L1', 5: 'R1',
  6: 'L2', 7: 'R2',
  8: 'SELECT', 9: 'START',
  10: 'L3', 11: 'R3',
  12: 'UP', 13: 'DOWN', 14: 'LEFT', 15: 'RIGHT',
  16: 'HOME',
};

const DIRECTIONAL: Set<GamepadButton> = new Set(['UP', 'DOWN', 'LEFT', 'RIGHT']);
const REPEAT_DELAY = 150;
const DEADZONE = 0.25;
const AXIS_THRESHOLD = 0.5;

function applyDeadzone(value: number): number {
  return Math.abs(value) < DEADZONE ? 0 : value;
}

export function useGamepad({ onButton, onAxes }: GamepadHandlers) {
  const onButtonRef = useRef(onButton);
  const onAxesRef = useRef(onAxes);
  const pressedRef = useRef<Map<string, number>>(new Map());
  const rafRef = useRef<number>(0);

  useEffect(() => { onButtonRef.current = onButton; });
  useEffect(() => { onAxesRef.current = onAxes; });

  const emitAxisDirection = useCallback(
    (key: string, btn: GamepadButton, now: number) => {
      const lastPress = pressedRef.current.get(key);
      if (lastPress === undefined || now - lastPress >= REPEAT_DELAY) {
        pressedRef.current.set(key, now);
        onButtonRef.current?.(btn);
      }
    },
    [],
  );

  const poll = useCallback(() => {
    const now = Date.now();
    const gamepads = navigator.getGamepads();

    for (const gp of gamepads) {
      if (!gp) continue;

      // --- Buttons ---
      gp.buttons.forEach((btn, idx) => {
        const mapped = BUTTON_MAP[idx];
        if (!mapped) return;

        if (btn.pressed) {
          const lastPress = pressedRef.current.get(mapped);
          if (lastPress === undefined) {
            pressedRef.current.set(mapped, now);
            onButtonRef.current?.(mapped);
          } else if (DIRECTIONAL.has(mapped) && now - lastPress >= REPEAT_DELAY) {
            pressedRef.current.set(mapped, now);
            onButtonRef.current?.(mapped);
          }
        } else {
          pressedRef.current.delete(mapped);
        }
      });

      // --- Analog sticks ---
      const lx = applyDeadzone(gp.axes[0] ?? 0);
      const ly = applyDeadzone(gp.axes[1] ?? 0);
      const rx = applyDeadzone(gp.axes[2] ?? 0);
      const ry = applyDeadzone(gp.axes[3] ?? 0);

      onAxesRef.current?.({ lx, ly, rx, ry });

      // Left stick → directional navigation (D-pad emulation)
      const leftBtn: GamepadButton | null =
        lx < -AXIS_THRESHOLD ? 'LEFT' :
        lx > AXIS_THRESHOLD ? 'RIGHT' :
        ly < -AXIS_THRESHOLD ? 'UP' :
        ly > AXIS_THRESHOLD ? 'DOWN' : null;

      if (leftBtn) {
        emitAxisDirection(`laxis_${leftBtn}`, leftBtn, now);
      } else {
        for (const b of ['LEFT', 'RIGHT', 'UP', 'DOWN']) {
          pressedRef.current.delete(`laxis_${b}`);
        }
      }

      // Right stick → page navigation (vertical = page up/down,
      // horizontal = prev/next system via L1/R1 semantics)
      const rightBtn: GamepadButton | null =
        ry < -AXIS_THRESHOLD ? 'UP' :
        ry > AXIS_THRESHOLD ? 'DOWN' :
        rx < -AXIS_THRESHOLD ? 'L1' :
        rx > AXIS_THRESHOLD ? 'R1' : null;

      if (rightBtn) {
        emitAxisDirection(`raxis_${rightBtn}`, rightBtn, now);
      } else {
        for (const b of ['UP', 'DOWN', 'L1', 'R1']) {
          pressedRef.current.delete(`raxis_${b}`);
        }
      }
    }

    rafRef.current = requestAnimationFrame(poll);
  }, [emitAxisDirection]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafRef.current);
  }, [poll]);
}
