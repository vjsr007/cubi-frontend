import { SystemLogo } from '../../components/common/SystemLogo';
import type { SystemInfo } from '../../types';

const SYSTEM_COLORS: Record<string, string> = {
  nes: '#c0392b',       snes: '#7d3c98',      n64: '#1a5276',
  gamecube: '#6c3483',  wii: '#2e86c1',        wiiu: '#1abc9c',
  switch: '#e74c3c',    gb: '#8e9a2b',         gba: '#5b2c6f',
  gbc: '#2e86c1',       nds: '#7f8c8d',        '3ds': '#e74c3c',
  genesis: '#1c2833',   dreamcast: '#2980b9',  saturn: '#5d6d7e',
  gamegear: '#2471a3',  mastersystem: '#1a5276',
  ps1: '#7d8aa6',       ps2: '#2c3e50',        ps3: '#34495e',
  psp: '#2c3e50',       vita: '#1a5276',
  xbox: '#27ae60',      xbox360: '#107c10',
  atari2600: '#d35400', atari5200: '#c0392b',  atari7800: '#a93226',
  atarilynx: '#f39c12', atarijaguar: '#e74c3c', neogeo: '#f1c40f',
  pc: '#0078d4',
  default: '#3a3a4a',
};

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

interface AuroraSystemBoxProps {
  system: SystemInfo;
  focused: boolean;
  /** Width of the main face in px */
  width?: number;
  height?: number;
  depth?: number;
}

export function AuroraSystemBox({
  system,
  focused,
  width = 200,
  height = 280,
  depth = 22,
}: AuroraSystemBoxProps) {
  const color = SYSTEM_COLORS[system.id] ?? SYSTEM_COLORS.default;
  const dark  = darken(color, 40);

  return (
    <div
      style={{
        width: width + depth,
        height,
        position: 'relative',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* ── Front Face ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: depth,
          width,
          height,
          transform: `translateZ(${depth / 2}px)`,
          backfaceVisibility: 'hidden',
          borderRadius: '1px 6px 6px 1px',
          overflow: 'hidden',
          background: `linear-gradient(155deg, ${color}55 0%, #0d0005 60%, #050005 100%)`,
          border: focused ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.06)',
          boxSizing: 'border-box',
          animation: focused ? 'aurora-focus-ring 2s ease-in-out infinite' : undefined,
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background: `linear-gradient(90deg, ${dark}, ${color}, ${dark})`,
          }}
        />

        {/* System logo centered */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: '20px 16px',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: focused ? `drop-shadow(0 0 12px ${color})` : undefined,
              transition: 'filter 0.3s ease',
            }}
          >
            <SystemLogo systemId={system.id} size={72} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                color: 'white',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: 'Arial, sans-serif',
                textShadow: '0 1px 6px rgba(0,0,0,0.8)',
                lineHeight: 1.25,
              }}
            >
              {system.full_name ?? system.name}
            </div>
            <div
              style={{
                marginTop: 6,
                background: `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, 0.25)`,
                border: `1px solid ${color}66`,
                borderRadius: 12,
                padding: '2px 10px',
                display: 'inline-block',
                color: 'rgba(255,255,255,0.8)',
                fontSize: 11,
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {system.game_count ?? 0} games
            </div>
          </div>
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${dark}, ${color}, ${dark})`,
          }}
        />
      </div>

      {/* ── Left Spine ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: depth / 2,
          width: depth,
          height,
          transform: 'rotateY(-90deg)',
          transformOrigin: `${depth / 2}px center`,
          backfaceVisibility: 'hidden',
          background: `linear-gradient(90deg, ${dark} 0%, ${color} 40%, ${color} 60%, ${dark} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            fontSize: 7,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxHeight: height - 20,
          }}
        >
          {system.name}
        </span>
      </div>

      {/* ── Right Edge ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: depth,
          height,
          transform: `rotateY(90deg) translateZ(${depth / 2}px)`,
          transformOrigin: 'right center',
          backfaceVisibility: 'hidden',
          background: '#060006',
        }}
      />
    </div>
  );
}
