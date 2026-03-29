import { useEffect, useRef } from 'react';
import type { GameInfo } from '../../types';
import { useAudio } from '../../hooks/useAudio';
import { useI18nStore } from '../../stores/i18nStore';

interface GameWheelProps {
  games: GameInfo[];
  focusedIndex: number;
  onFocusChange: (index: number) => void;
  onSelect: (game: GameInfo) => void;
  onBack: () => void;
}

const VISIBLE = 7;

function getItemStyle(distance: number, focused: boolean): React.CSSProperties {
  const absD = Math.abs(distance);
  const scale = focused ? 1.2 : Math.max(0.55, 1 - absD * 0.14);
  const opacity = focused ? 1 : Math.max(0.3, 1 - absD * 0.18);
  const translateY = distance * 56;
  const translateX = focused ? -10 : absD * 6;

  return {
    position: 'absolute' as const,
    left: '50%',
    top: '50%',
    transform: `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scale})`,
    opacity,
    zIndex: 10 - absD,
    transition: 'all 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    cursor: 'pointer',
    pointerEvents: absD > 3 ? 'none' : 'auto',
  };
}

function GameBadge({
  title,
  focused,
  onClick,
}: {
  title: string;
  focused: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 260,
        height: 54,
        borderRadius: '50%',
        background: focused
          ? 'linear-gradient(180deg, #0a2a0a 0%, #061206 50%, #0a2a0a 100%)'
          : 'linear-gradient(180deg, #1e1e1e 0%, #0d0d0d 50%, #1e1e1e 100%)',
        border: focused ? '2px solid #27ae60' : '2px solid #444',
        boxShadow: focused
          ? '0 0 20px rgba(39,174,96,0.6), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 2px 8px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        padding: '0 20px',
      }}
    >
      <span
        style={{
          fontSize: focused ? 13 : 12,
          fontWeight: 700,
          fontFamily: 'system-ui, Arial, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: focused ? '#27ae60' : '#aaa',
          textShadow: focused ? '0 0 8px rgba(39,174,96,0.7)' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 220,
        }}
      >
        {title}
      </span>
    </div>
  );
}

export function GameWheel({ games, focusedIndex, onFocusChange, onSelect, onBack }: GameWheelProps) {
  const rafRef = useRef<number>(0);
  const axisRef = useRef(0);
  const lastMoveRef = useRef(0);
  const { playTick, playEnter, playBack } = useAudio();
  const { t } = useI18nStore();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); playTick(); onFocusChange((focusedIndex - 1 + games.length) % games.length); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); playTick(); onFocusChange((focusedIndex + 1) % games.length); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playEnter(); if (games[focusedIndex]) onSelect(games[focusedIndex]); }
      else if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); playBack(); onBack(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [focusedIndex, games, onFocusChange, onSelect, onBack, playTick, playEnter, playBack]);

  // Gamepad polling
  useEffect(() => {
    let running = true;
    function poll() {
      if (!running) return;
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0];
      if (gp) {
        const axis = gp.axes[1] ?? 0;
        axisRef.current = axis;
        const now = Date.now();
        if (Math.abs(axis) > 0.5 && now - lastMoveRef.current > 150) {
          lastMoveRef.current = now;
          playTick();
          if (axis < -0.5) onFocusChange((focusedIndex - 1 + games.length) % games.length);
          else onFocusChange((focusedIndex + 1) % games.length);
        }
        if (gp.buttons[0]?.pressed && now - lastMoveRef.current > 300) {
          lastMoveRef.current = now;
          playEnter();
          if (games[focusedIndex]) onSelect(games[focusedIndex]);
        }
        if (gp.buttons[1]?.pressed && now - lastMoveRef.current > 300) {
          lastMoveRef.current = now;
          playBack();
          onBack();
        }
      }
      rafRef.current = requestAnimationFrame(poll);
    }
    rafRef.current = requestAnimationFrame(poll);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [focusedIndex, games, onFocusChange, onSelect, onBack, playTick, playEnter, playBack]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {games.map((game, idx) => {
        const distance = idx - focusedIndex;
        if (Math.abs(distance) > Math.floor(VISIBLE / 2) + 1) return null;
        const focused = idx === focusedIndex;
        return (
          <div key={game.id} style={getItemStyle(distance, focused)}>
            <GameBadge
              title={game.title}
              focused={focused}
              onClick={() => {
                onFocusChange(idx);
                if (focused) onSelect(game);
              }}
            />
          </div>
        );
      })}
      {games.length === 0 && (
        <div style={{ color: '#555', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {t('hyperspin.noGames')}
        </div>
      )}
    </div>
  );
}
