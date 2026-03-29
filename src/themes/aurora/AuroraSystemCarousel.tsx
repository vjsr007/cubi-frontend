import { useCallback } from 'react';
import { AuroraSystemBox } from './AuroraSystemBox';
import type { SystemInfo } from '../../types';

interface AuroraSystemCarouselProps {
  systems: SystemInfo[];
  focusedIndex: number;
  onNavigate: (delta: -1 | 1) => void;
}

function SystemCarouselItem({
  system,
  position,
  focused,
}: {
  system: SystemInfo;
  position: number;
  focused: boolean;
}) {
  const BOX_W     = 222;   // 200 + 22 depth
  const GAP       = 68;
  const MAX_ANGLE = 60;

  const absPos = Math.abs(position);
  const xOffset = position * (BOX_W + GAP);
  const angle   = position === 0 ? 0 : position < 0 ? MAX_ANGLE : -MAX_ANGLE;
  const scale   = Math.max(0.42, 1 - absPos * 0.12);
  const zDepth  = position === 0 ? 80 : -absPos * 30;
  const opacity = Math.max(0.18, 1 - absPos * 0.14);

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
        transition: 'all 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'transform, opacity',
        zIndex: position === 0 ? 10 : Math.max(1, 9 - absPos),
      }}
    >
      <AuroraSystemBox
        system={system}
        focused={focused}
        width={200}
        height={280}
        depth={22}
      />
    </div>
  );
}

export function AuroraSystemCarousel({
  systems,
  focusedIndex,
  onNavigate,
}: AuroraSystemCarouselProps) {
  const handleClick = useCallback(
    (index: number) => {
      const delta = index - focusedIndex;
      if (delta !== 0) onNavigate(delta > 0 ? 1 : -1);
    },
    [focusedIndex, onNavigate]
  );

  if (systems.length === 0) {
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
          fontFamily: 'Arial, sans-serif',
        }}
      >
        No systems found — configure your ROM folder in Settings
      </div>
    );
  }

  const WINDOW = 6;
  const startIdx = Math.max(0, focusedIndex - WINDOW);
  const endIdx   = Math.min(systems.length - 1, focusedIndex + WINDOW);

  return (
    <div
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
          width: 340,
          height: 320,
          background:
            'radial-gradient(ellipse at center, rgba(16,124,16,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {Array.from({ length: endIdx - startIdx + 1 }, (_, i) => startIdx + i).map((index) => (
        <div
          key={systems[index].id}
          onClick={() => handleClick(index)}
          style={{ position: 'absolute', inset: 0, cursor: index !== focusedIndex ? 'pointer' : 'default' }}
        >
          <SystemCarouselItem
            system={systems[index]}
            position={index - focusedIndex}
            focused={index === focusedIndex}
          />
        </div>
      ))}

      {/* Shelf shadow */}
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: 0,
          right: 0,
          height: 50,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 20,
        }}
      />
    </div>
  );
}
