import { useEffect, useRef, useCallback } from 'react';

export type GamepadButton =
  | 'A' | 'B' | 'X' | 'Y'
  | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
  | 'START' | 'SELECT'
  | 'L1' | 'R1';

interface GamepadHandlers {
  onButton?: (button: GamepadButton) => void;
}

const BUTTON_MAP: Record<number, GamepadButton> = {
  0: 'A', 1: 'B', 2: 'X', 3: 'Y',
  4: 'L1', 5: 'R1',
  8: 'SELECT', 9: 'START',
  12: 'UP', 13: 'DOWN', 14: 'LEFT', 15: 'RIGHT',
};

const DIRECTIONAL: Set<GamepadButton> = new Set(['UP', 'DOWN', 'LEFT', 'RIGHT']);
const REPEAT_DELAY = 150;

export function useGamepad({ onButton }: GamepadHandlers) {
  const onButtonRef = useRef(onButton);
  const pressedRef = useRef<Map<GamepadButton, number>>(new Map());
  const rafRef = useRef<number>(0);

  useEffect(() => { onButtonRef.current = onButton; });

  const poll = useCallback(() => {
    const now = Date.now();
    const gamepads = navigator.getGamepads();

    for (const gp of gamepads) {
      if (!gp) continue;

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

      // Axes as D-pad
      const axisX = gp.axes[0] ?? 0;
      const axisY = gp.axes[1] ?? 0;
      const threshold = 0.5;

      const axisBtn: GamepadButton | null =
        axisX < -threshold ? 'LEFT' :
        axisX > threshold ? 'RIGHT' :
        axisY < -threshold ? 'UP' :
        axisY > threshold ? 'DOWN' : null;

      if (axisBtn) {
        const key = `axis_${axisBtn}` as unknown as GamepadButton;
        const lastPress = pressedRef.current.get(key);
        if (lastPress === undefined || now - lastPress >= REPEAT_DELAY) {
          pressedRef.current.set(key, now);
          onButtonRef.current?.(axisBtn);
        }
      } else {
        // Clear axis states when centered
        for (const btn of ['LEFT', 'RIGHT', 'UP', 'DOWN'] as GamepadButton[]) {
          pressedRef.current.delete(`axis_${btn}` as unknown as GamepadButton);
        }
      }
    }

    rafRef.current = requestAnimationFrame(poll);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafRef.current);
  }, [poll]);
}
