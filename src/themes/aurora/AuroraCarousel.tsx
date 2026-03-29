import { useRef, useCallback } from 'react';
import { useGameMedia } from '../../hooks/useMedia';
import { AuroraBox3D } from './AuroraBox3D';
import type { GameInfo } from '../../types';

interface AuroraCarouselProps {
  games: GameInfo[];
  focusedIndex: number;
  onNavigate: (delta: -1 | 1) => void;
}

/** Per-item wrapper: loads media, positions in 3D space */
function CarouselItem({
  game,
  position,   // distance from center (negative = left, positive = right)
  focused,
}: {
  game: GameInfo;
  position: number;
  focused: boolean;
}) {
  const { data: media } = useGameMedia(game.id);

  const BOX_W      = 222;  // box width including depth px
  const GAP        = 68;   // gap between items
  const MAX_ANGLE  = 62;   // degrees of Y rotation for side items

  const absPos = Math.abs(position);
  const xOffset = position * (BOX_W + GAP);
  const angle   = position === 0 ? 0 : position < 0 ? MAX_ANGLE : -MAX_ANGLE;
  const scale   = Math.max(0.45, 1 - absPos * 0.12);
  const zDepth  = position === 0 ? 80 : -absPos * 35;
  const opacity = Math.max(0.15, 1 - absPos * 0.13);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `
          translateX(calc(-50% + ${xOffset}px))
          translateY(-50%)
          translateZ(${zDepth}px)
          rotateY(${angle}deg)
          scale(${scale})
        `,
        opacity,
        transition: 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'transform, opacity',
        cursor: focused ? 'default' : 'pointer',
        zIndex: position === 0 ? 10 : Math.max(1, 9 - absPos),
      }}
    >
      <AuroraBox3D
        game={game}
        media={media}
        focused={focused}
        width={200}
        height={280}
        depth={22}
      />
    </div>
  );
}

export function AuroraCarousel({ games, focusedIndex, onNavigate }: AuroraCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (index: number) => {
      const delta = index - focusedIndex;
      if (delta !== 0) {
        onNavigate(delta > 0 ? 1 : -1);
      }
    },
    [focusedIndex, onNavigate]
  );

  if (games.length === 0) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        No games found
      </div>
    );
  }

  // Render window: ±6 items around focus
  const WINDOW = 6;
  const startIdx = Math.max(0, focusedIndex - WINDOW);
  const endIdx   = Math.min(games.length - 1, focusedIndex + WINDOW);

  const visibleGames: Array<{ game: GameInfo; index: number }> = [];
  for (let i = startIdx; i <= endIdx; i++) {
    visibleGames.push({ game: games[i], index: i });
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        perspective: '900px',
        perspectiveOrigin: '50% 50%',
        overflow: 'hidden',
      }}
    >
      {/* Center glow behind focused box */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 300,
          height: 260,
          background: 'radial-gradient(ellipse at center, rgba(16,124,16,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Carousel items */}
      {visibleGames.map(({ game, index }) => (
        <div
          key={game.id}
          onClick={() => handleClick(index)}
          style={{ position: 'absolute', inset: 0 }}
        >
          <CarouselItem
            game={game}
            position={index - focusedIndex}
            focused={index === focusedIndex}
          />
        </div>
      ))}

      {/* Shelf shadow beneath boxes */}
      <div
        style={{
          position: 'absolute',
          bottom: '18%',
          left: 0,
          right: 0,
          height: 40,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 20,
        }}
      />

      {/* Reflection effect — very subtle blur mirror beneath */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 'calc(18% - 60px)',
          transform: 'translateX(-50%) scaleY(-1)',
          width: 600,
          height: 60,
          opacity: 0.12,
          filter: 'blur(4px)',
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    </div>
  );
}
