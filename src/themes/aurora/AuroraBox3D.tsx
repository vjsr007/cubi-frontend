import { useMemo } from 'react';
import { toImageSrc } from '../../lib/media';
import { SystemLogo } from '../../components/common/SystemLogo';
import type { GameInfo, GameMedia } from '../../types';

interface AuroraBox3DProps {
  game: GameInfo;
  media?: GameMedia | null;
  focused: boolean;
  width?: number;
  height?: number;
  depth?: number;
}

/** Microsoft Xbox green palette */
const XBOX_GREEN  = '#107c10';
const XBOX_DARK   = '#0a5a0a';
const XBOX_LIGHT  = '#52b043';

const SYSTEM_COLORS: Record<string, string> = {
  nes: '#c0392b',       snes: '#7d3c98',      n64: '#1a5276',
  gamecube: '#6c3483',  wii: '#2e86c1',        wiiu: '#1abc9c',
  switch: '#e74c3c',    gb: '#8e9a2b',         gba: '#5b2c6f',
  gbc: '#2e86c1',       nds: '#7f8c8d',        '3ds': '#e74c3c',
  genesis: '#1c2833',   dreamcast: '#2980b9',  saturn: '#5d6d7e',
  gamegear: '#2471a3',  mastersystem: '#1a5276',
  ps1: '#7d8aa6',       ps2: '#2c3e50',        ps3: '#34495e',
  psp: '#2c3e50',       vita: '#1a5276',
  xbox: '#27ae60',      xbox360: XBOX_GREEN,
  atari2600: '#d35400', atari5200: '#c0392b',
  pc: '#0078d4',
  default: '#444',
};

/** Xbox 360 logo SVG (simplified) */
function XboxLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" stroke="white" strokeWidth="1.5" />
      <path
        d="M5 8c2-3 4-4 7-4s5 1 7 4"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M5 8c-1 2-1 4 0 6l7 7 7-7c1-2 1-4 0-6"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="12" r="2.5" fill="white" opacity="0.9" />
    </svg>
  );
}

/** Placeholder front face when no box art */
function BoxPlaceholder({ game, systemColor }: { game: GameInfo; systemColor: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(160deg, ${systemColor}aa 0%, #0d0005 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 10,
      }}
    >
      <SystemLogo systemId={game.system_id} size={48} />
      <span
        style={{
          color: 'white',
          fontSize: 11,
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.3,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          textOverflow: 'ellipsis',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        }}
      >
        {game.title}
      </span>
    </div>
  );
}

export function AuroraBox3D({
  game,
  media,
  focused,
  width = 135,
  height = 190,
  depth = 16,
}: AuroraBox3DProps) {
  const systemColor = SYSTEM_COLORS[game.system_id] ?? SYSTEM_COLORS.default;

  // For Xbox 360 games use the Xbox green, otherwise use system color for spine
  const isXbox360 = game.system_id === 'xbox360' || game.system_id === 'xbox';
  const spineColor = isXbox360 ? XBOX_GREEN : systemColor;
  const spineDark  = isXbox360 ? XBOX_DARK  : systemColor;
  const spineLight = isXbox360 ? XBOX_LIGHT : systemColor;

  const frontSrc = useMemo(() => {
    const path = media?.box_art ?? game.box_art;
    return toImageSrc(path);
  }, [media?.box_art, game.box_art]);

  const headerLabel = isXbox360 ? 'XBOX 360' : game.system_id.toUpperCase().replace(/_/g, ' ');

  const focusGlow = focused
    ? { animation: 'aurora-focus-ring 2s ease-in-out infinite' }
    : {};

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
          borderRadius: '1px 5px 5px 1px',
          overflow: 'hidden',
          background: '#111',
          ...focusGlow,
        }}
      >
        {/* Green Xbox header bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 26,
            background: `linear-gradient(90deg, ${spineColor} 0%, ${spineLight} 50%, ${spineColor} 100%)`,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            paddingLeft: 6,
            zIndex: 2,
          }}
        >
          {isXbox360 && <XboxLogo size={14} />}
          <span
            style={{
              color: 'white',
              fontSize: 8,
              fontWeight: 900,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {headerLabel}
          </span>
        </div>

        {/* Box art */}
        <div style={{ position: 'absolute', inset: 0, paddingTop: 26 }}>
          {frontSrc ? (
            <img
              src={frontSrc}
              alt={game.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <BoxPlaceholder game={game} systemColor={systemColor} />
          )}
        </div>

        {/* Focus highlight border */}
        {focused && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: `2px solid ${spineLight}`,
              borderRadius: '1px 5px 5px 1px',
              pointerEvents: 'none',
              boxSizing: 'border-box',
            }}
          />
        )}
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
          background: `linear-gradient(90deg, ${spineDark} 0%, ${spineColor} 40%, ${spineLight} 50%, ${spineColor} 60%, ${spineDark} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Spine content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            height: '100%',
            padding: '6px 0',
          }}
        >
          {isXbox360 && (
            <div style={{ marginBottom: 2 }}>
              <XboxLogo size={10} />
            </div>
          )}
          <span
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              fontSize: 7,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxHeight: height - 30,
            }}
          >
            {isXbox360 ? `XBOX 360 · ${game.title}` : game.title}
          </span>
        </div>
      </div>

      {/* ── Right Edge (dark) ── */}
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
          background: '#0a0a0a',
        }}
      />

      {/* ── Top Edge ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: depth,
          width,
          height: depth,
          transform: `rotateX(90deg) translateZ(${depth / 2}px)`,
          transformOrigin: `center top`,
          backfaceVisibility: 'hidden',
          background: `linear-gradient(90deg, ${spineColor}, ${spineLight}, ${spineColor})`,
        }}
      />

      {/* ── Bottom Edge ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: depth,
          width,
          height: depth,
          transform: `rotateX(-90deg) translateZ(${depth / 2}px)`,
          transformOrigin: `center bottom`,
          backfaceVisibility: 'hidden',
          background: '#111',
        }}
      />
    </div>
  );
}
