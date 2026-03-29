import { useState, useMemo } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { SystemLogo } from '../common/SystemLogo';
import type { GameInfo, GameMedia } from '../../types';

interface GameBoxCaseProps {
  game: GameInfo;
  media: GameMedia | null | undefined;
  /** Controlled flip state. If omitted, component manages its own. */
  flipped?: boolean;
  onFlip?: () => void;
  /** Box face width in px */
  width?: number;
  /** Box face height in px */
  height?: number;
  /** Spine thickness in px */
  spineWidth?: number;
}

const SYSTEM_COLORS: Record<string, string> = {
  nes: '#c0392b', snes: '#7d3c98', n64: '#1a5276', gamecube: '#6c3483',
  wii: '#2e86c1', wiiu: '#1abc9c', switch: '#e74c3c', gb: '#8e9a2b',
  gba: '#5b2c6f', gbc: '#2e86c1', nds: '#7f8c8d', '3ds': '#e74c3c',
  genesis: '#1c2833', dreamcast: '#2980b9', saturn: '#5d6d7e', gamegear: '#2471a3',
  mastersystem: '#1a5276', ps1: '#7d8aa6', ps2: '#2c3e50', ps3: '#34495e',
  psp: '#2c3e50', vita: '#1a5276', xbox: '#27ae60', xbox360: '#85c83e',
  atari2600: '#d35400', atari5200: '#c0392b', atari7800: '#a93226', atarilynx: '#f39c12',
  atarijaguar: '#e74c3c', neogeo: '#f1c40f', neogeopocket: '#2c3e50',
  turbografx16: '#e67e22', pcengine: '#e67e22', sg1000: '#1a5276',
  '3do': '#d4ac0d', vectrex: '#7f8c8d', colecovision: '#2e4053',
  msx: '#c0392b', wswan: '#5d6d7e', wswanc: '#2e86c1', scummvm: '#27ae60',
};

export function GameBoxCase({
  game,
  media,
  flipped: controlledFlipped,
  onFlip,
  width = 280,
  height = 380,
  spineWidth = 20,
}: GameBoxCaseProps) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isFlipped = controlledFlipped ?? internalFlipped;

  const handleClick = () => {
    if (onFlip) {
      onFlip();
    } else {
      setInternalFlipped((f) => !f);
    }
  };

  const systemColor = SYSTEM_COLORS[game.system_id] ?? '#555';

  const frontSrc = useMemo(() => {
    const path = media?.box_art ?? game.box_art;
    return path ? convertFileSrc(path) : null;
  }, [media?.box_art, game.box_art]);

  const backSrc = useMemo(() => {
    return media?.back_cover ? convertFileSrc(media.back_cover) : null;
  }, [media?.back_cover]);

  const halfSpine = spineWidth / 2;

  return (
    <div
      style={{
        perspective: 1000,
        width: width + spineWidth,
        height,
        cursor: 'pointer',
      }}
      onClick={handleClick}
      title="Click to flip"
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s ease-in-out',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          willChange: 'transform',
        }}
      >
        {/* ── Front Face ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: spineWidth,
            width,
            height,
            backfaceVisibility: 'hidden',
            borderRadius: '4px 8px 8px 4px',
            overflow: 'hidden',
            boxShadow: '4px 4px 20px rgba(0,0,0,0.5)',
            background: 'var(--color-surface-2, #1a1a2e)',
          }}
        >
          {frontSrc ? (
            <img
              src={frontSrc}
              alt={game.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <FrontPlaceholder game={game} systemColor={systemColor} />
          )}
        </div>

        {/* ── Back Face ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width,
            height,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '8px 4px 4px 8px',
            overflow: 'hidden',
            boxShadow: '-4px 4px 20px rgba(0,0,0,0.5)',
            background: 'var(--color-surface-2, #1a1a2e)',
          }}
        >
          {backSrc ? (
            <img
              src={backSrc}
              alt={`${game.title} — Back`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <BackMetadata game={game} media={media} systemColor={systemColor} />
          )}
        </div>

        {/* ── Left Spine ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: spineWidth,
            height,
            backfaceVisibility: 'hidden',
            transform: `rotateY(-90deg) translateZ(${halfSpine}px)`,
            transformOrigin: `${halfSpine}px center`,
            background: `linear-gradient(180deg, ${systemColor}, ${darken(systemColor, 30)})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              fontSize: 9,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              opacity: 0.9,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxHeight: height - 20,
            }}
          >
            {game.title}
          </span>
        </div>

        {/* ── Right Spine (back side) ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: spineWidth,
            height,
            backfaceVisibility: 'hidden',
            transform: `rotateY(90deg) translateZ(${width - halfSpine}px)`,
            transformOrigin: `${halfSpine}px center`,
            background: `linear-gradient(180deg, ${darken(systemColor, 10)}, ${darken(systemColor, 40)})`,
          }}
        />
      </div>
    </div>
  );
}

/* ── Subcomponents ── */

function FrontPlaceholder({ game, systemColor }: { game: GameInfo; systemColor: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(160deg, ${systemColor}22 0%, ${systemColor}44 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 16,
      }}
    >
      <SystemLogo systemId={game.system_id} size={64} fallbackText="" />
      <span
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--color-text, #eee)',
          textAlign: 'center',
          lineHeight: 1.3,
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {game.title}
      </span>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted, #888)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {game.system_id}
      </span>
    </div>
  );
}

function BackMetadata({ game, media, systemColor }: { game: GameInfo; media: GameMedia | null | undefined; systemColor: string }) {
  const screenshotSrc = media?.screenshot ? convertFileSrc(media.screenshot) : null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(180deg, #0d0d0d 0%, #1a1a2e 100%)`,
        display: 'flex',
        flexDirection: 'column',
        padding: 20,
        gap: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: `2px solid ${systemColor}`, paddingBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#eee', lineHeight: 1.2 }}>
          {game.title}
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#888' }}>
          {[game.year, game.genre].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Screenshot thumbnail */}
      {screenshotSrc && (
        <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
          <img
            src={screenshotSrc}
            alt="Screenshot"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      {/* Description */}
      {game.description && (
        <p style={{
          margin: 0,
          fontSize: 10,
          color: '#aaa',
          lineHeight: 1.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: screenshotSrc ? 4 : 8,
          WebkitBoxOrient: 'vertical',
        }}>
          {game.description}
        </p>
      )}

      {/* Details grid */}
      <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {game.developer && <DetailRow label="Developer" value={game.developer} />}
        {game.publisher && <DetailRow label="Publisher" value={game.publisher} />}
        {game.players > 0 && <DetailRow label="Players" value={`${game.players}`} />}
        {game.rating > 0 && <DetailRow label="Rating" value={`${(game.rating * 10).toFixed(0)}%`} />}
      </div>

      {/* System branding bar */}
      <div
        style={{
          marginTop: 'auto',
          background: systemColor,
          borderRadius: 3,
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <SystemLogo systemId={game.system_id} size={16} fallbackText="" />
        <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {game.system_id}
        </span>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <p style={{ margin: '1px 0 0', fontSize: 11, color: '#ccc', fontWeight: 500 }}>{value}</p>
    </div>
  );
}

/* ── Utility ── */

function darken(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(2.55 * percent));
  const b = Math.max(0, (num & 0x0000ff) - Math.round(2.55 * percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
