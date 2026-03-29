import { convertFileSrc } from '@tauri-apps/api/core';
import { useGameMedia, useSystemMedia, bestImage } from '../../hooks/useMedia';
import { useI18nStore } from '../../stores/i18nStore';
import { VideoPreview } from '../../components/media/VideoPreview';
import { MediaImage } from '../../components/media/MediaImage';
import { SystemLogo } from '../../components/common/SystemLogo';
import type { SystemInfo, GameInfo } from '../../types';

interface PreviewPanelProps {
  system: SystemInfo | null;
  game: GameInfo | null;
  mode: 'system' | 'game';
  focused?: boolean;
}

export function PreviewPanel({ system, game, mode, focused = true }: PreviewPanelProps) {
  const { data: gameMedia, isLoading: gameMediaLoading } = useGameMedia(mode === 'game' ? (game?.id ?? null) : null);
  const { data: systemMedia } = useSystemMedia(system?.id ?? null);
  const { t } = useI18nStore();

  const showVideo = mode === 'game' && !!gameMedia?.video;
  const displayImage = mode === 'game'
    ? bestImage(gameMedia) ?? game?.box_art ?? null
    : null;

  const title = mode === 'game' ? game?.title : system?.full_name;
  const subtitle = mode === 'game'
    ? [game?.genre, game?.year, game?.developer].filter(Boolean).join(' · ')
    : system ? `${system.game_count} game${system.game_count !== 1 ? 's' : ''}` : '';

  const fanArtSrc = systemMedia?.fan_art ? convertFileSrc(systemMedia.fan_art) : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '24px 32px',
        gap: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* System fanart as background */}
      {fanArtSrc && (
        <img
          src={fanArtSrc}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.12,
            filter: 'blur(8px)',
            transform: 'scale(1.05)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* TV/CRT Frame */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 480,
          aspectRatio: '4/3',
          background: '#000',
          borderRadius: 16,
          border: '6px solid #2a2a2a',
          boxShadow: `
            0 0 0 2px #111,
            0 0 0 8px #1e1e1e,
            0 0 0 10px #333,
            0 8px 32px rgba(0,0,0,0.8),
            inset 0 0 60px rgba(0,0,0,0.5)
          `,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Scanlines overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
            zIndex: 4,
            pointerEvents: 'none',
          }}
        />
        {/* Screen glare */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '40%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
            zIndex: 5,
            pointerEvents: 'none',
            borderRadius: '10px 10px 0 0',
          }}
        />

        {gameMediaLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48,
              border: '3px solid rgba(243,156,18,0.2)',
              borderTop: '3px solid #f39c12',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <div style={{ fontSize: 12, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {t('hyperspin.loading')}
            </div>
          </div>
        ) : showVideo && gameMedia?.video ? (
          <VideoPreview videoPath={gameMedia.video} playing={true} />
        ) : displayImage ? (
          <MediaImage
            path={displayImage}
            alt={title ?? ''}
            style={{ width: '100%', height: '100%' }}
            lazy={false}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: 0.4 }}>
            <div style={{ fontSize: 64 }}>🕹️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', padding: '0 16px' }}>
              {system?.name ?? t('hyperspin.selectSystem')}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ textAlign: 'center', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        {/* System logo in system mode */}
        {mode === 'system' && system && (
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SystemLogo
              systemId={system.id}
              size={48}
              fallbackText={system.name}
              style={{
                filter: 'drop-shadow(0 0 12px rgba(243,156,18,0.5)) brightness(1.1)',
              }}
            />
          </div>
        )}
        {/* Wheel logo if available in system mode */}
        {mode === 'system' && systemMedia?.wheel && (
          <div style={{ marginBottom: 8, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={convertFileSrc(systemMedia.wheel)}
              alt={system?.name ?? ''}
              style={{ maxHeight: 40, maxWidth: 200, objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(243,156,18,0.4))' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f39c12', textTransform: 'uppercase', letterSpacing: '0.06em', textShadow: '0 0 20px rgba(243,156,18,0.5)', lineHeight: 1.2 }}>
          {title ?? '—'}
        </h2>
        {subtitle && (
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#888', letterSpacing: '0.05em' }}>
            {subtitle}
          </p>
        )}
        {/* Extra game metadata */}
        {mode === 'game' && game && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            {game.play_count > 0 && (
              <span style={{ fontSize: 11, color: '#555', background: '#1a1a1a', padding: '2px 8px', borderRadius: 4 }}>
                ▶ {game.play_count}x played
              </span>
            )}
            {game.favorite && (
              <span style={{ fontSize: 11, color: '#e74c3c', background: '#1a1a1a', padding: '2px 8px', borderRadius: 4 }}>
                ♥ Favorite
              </span>
            )}
            {gameMedia?.video && (
              <span style={{ fontSize: 11, color: '#27ae60', background: '#1a1a1a', padding: '2px 8px', borderRadius: 4 }}>
                🎬 Video
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
