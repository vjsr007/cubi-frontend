import { useState } from 'react';
import { motion } from 'framer-motion';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useGameMedia, bestImage } from '../../hooks/useMedia';
import { VideoPreview } from '../media/VideoPreview';
import type { GameInfo } from '../../types';

interface Props {
  game: GameInfo;
  isFocused: boolean;
  onClick: () => void;
  onLaunch: () => void;
  onFavorite: () => void;
}

export function GameCard({ game, isFocused, onClick, onLaunch, onFavorite }: Props) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Fetch rich media — only when hovered or focused for performance
  const { data: media } = useGameMedia(hovered || isFocused ? game.id : null);

  const showVideo = (hovered || isFocused) && !!media?.video;

  // Priority: box_art from storage/downloaded_media > downloaded_images (game.box_art)
  const richImage = bestImage(media);
  const imgPath = richImage ?? game.box_art ?? null;
  const imgSrc = imgPath && !imgError ? convertFileSrc(imgPath) : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'var(--color-surface-2)',
        border: `1px solid ${isFocused ? 'var(--color-primary)' : 'var(--color-border)'}`,
        boxShadow: isFocused ? '0 0 0 2px rgba(124,58,237,0.4)' : 'none',
        transform: isFocused ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.1s, border-color 0.1s, box-shadow 0.1s',
      }}
    >
      {/* Box Art / Video on hover */}
      <div style={{ aspectRatio: '3/4', background: 'var(--color-surface-3)', position: 'relative', overflow: 'hidden' }}>
        {showVideo && media?.video ? (
          <VideoPreview videoPath={media.video} playing={hovered || isFocused} style={{ width: '100%', height: '100%' }} />
        ) : imgSrc ? (
          <img
            src={imgSrc}
            alt={game.title}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.25s ease-in',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
            <span style={{ fontSize: 28, marginBottom: 6 }}>🎮</span>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
              {game.title}
            </span>
          </div>
        )}

        {/* Hover overlay with play button */}
        {hovered && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10,
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); onLaunch(); }}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--color-primary)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 18,
              }}
            >
              ▶
            </button>
          </div>
        )}

        {/* Badges */}
        {game.favorite && (
          <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 12, color: '#f59e0b', zIndex: 11 }}>★</div>
        )}
        {game.play_count > 0 && (
          <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '1px 5px', fontSize: 10, color: '#fff', zIndex: 11 }}>
            {game.play_count}×
          </div>
        )}
        {media?.video && !hovered && (
          <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '1px 5px', fontSize: 9, color: '#27ae60', zIndex: 11 }}>
            🎬
          </div>
        )}

        {/* Favorite toggle on hover */}
        {hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(); }}
            style={{ position: 'absolute', top: 4, left: 4, width: 24, height: 24, borderRadius: 4, background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', fontSize: 12, color: game.favorite ? '#f59e0b' : '#fff', zIndex: 12 }}
            title={game.favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {game.favorite ? '★' : '☆'}
          </button>
        )}
      </div>

      {/* Title */}
      <div style={{ padding: '6px 8px' }}>
        <p style={{ fontSize: 11, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>
          {game.title}
        </p>
        {game.year && (
          <p style={{ fontSize: 10, margin: '2px 0 0', color: 'var(--color-text-muted)' }}>{game.year}</p>
        )}
      </div>
    </motion.div>
  );
}
