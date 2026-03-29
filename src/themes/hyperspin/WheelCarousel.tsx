import { useEffect, useRef } from 'react';

interface WheelItem {
  id: string;
  label: string;
}

interface WheelCarouselProps {
  items: WheelItem[];
  focusedIndex: number;
  onFocusChange: (index: number) => void;
  onSelect: (id: string) => void;
}

const VISIBLE_ITEMS = 7; // 3 above + focused + 3 below

function getBadgeStyle(distance: number, focused: boolean): React.CSSProperties {
  const absD = Math.abs(distance);
  const scale = focused ? 1.25 : Math.max(0.55, 1 - absD * 0.15);
  const opacity = focused ? 1 : Math.max(0.3, 1 - absD * 0.2);
  const translateY = distance * 62;
  const translateX = focused ? -12 : absD * 8;
  const blur = focused ? 0 : absD * 0.5;
  const zIndex = 10 - absD;

  return {
    position: 'absolute' as const,
    left: '50%',
    top: '50%',
    transform: `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scale})`,
    opacity,
    filter: blur > 0 ? `blur(${blur}px)` : 'none',
    zIndex,
    transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    cursor: 'pointer',
    pointerEvents: absD > 3 ? 'none' : 'auto',
  };
}

function OvalBadge({
  label,
  focused,
  onClick,
}: {
  label: string;
  focused: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 240,
        height: 62,
        borderRadius: '50%',
        background: focused
          ? 'linear-gradient(180deg, #3a2800 0%, #1a1200 50%, #2a1e00 100%)'
          : 'linear-gradient(180deg, #2a2a2a 0%, #111 50%, #1e1e1e 100%)',
        border: focused ? '2px solid #f39c12' : '2px solid #555',
        boxShadow: focused
          ? '0 0 24px rgba(243,156,18,0.7), 0 0 8px rgba(243,156,18,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontSize: focused ? 15 : 13,
          fontWeight: 700,
          fontFamily: 'system-ui, Arial, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: focused ? '#f39c12' : '#ccc',
          textShadow: focused ? '0 0 10px rgba(243,156,18,0.8)' : 'none',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function WheelCarousel({ items, focusedIndex, onFocusChange, onSelect }: WheelCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onFocusChange((focusedIndex - 1 + items.length) % items.length);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onFocusChange((focusedIndex + 1) % items.length);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (items[focusedIndex]) onSelect(items[focusedIndex].id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [focusedIndex, items, onFocusChange, onSelect]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {items.map((item, idx) => {
        const distance = idx - focusedIndex;
        if (Math.abs(distance) > Math.floor(VISIBLE_ITEMS / 2) + 1) return null;
        const focused = idx === focusedIndex;
        return (
          <div key={item.id} style={getBadgeStyle(distance, focused)}>
            <OvalBadge
              label={item.label}
              focused={focused}
              onClick={() => {
                onFocusChange(idx);
                if (focused) onSelect(item.id);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
