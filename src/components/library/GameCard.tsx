import { useState } from 'react';
import { motion } from 'framer-motion';
import { convertFileSrc } from '@tauri-apps/api/core';
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
  const [hovered, setHovered] = useState(false);

  const imgSrc = game.box_art && !imgError ? convertFileSrc(game.box_art) : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      onDoubleClick={onLaunch}
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
      {/* Box Art */}
      <div style={{ aspectRatio: '3/4', background: 'var(--color-surface-3)', position: 'relative', overflow: 'hidden' }}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={game.title}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 12, color: '#f59e0b' }}>★</div>
        )}
        {game.play_count > 0 && (
          <div style={{
            position: 'absolute', bottom: 4, left: 4,
            background: 'rgba(0,0,0,0.7)', borderRadius: 4,
            padding: '1px 5px', fontSize: 10, color: '#fff',
          }}>
            {game.play_count}×
          </div>
        )}

        {/* Favorite toggle on hover */}
        {hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(); }}
            style={{
              position: 'absolute', top: 4, left: 4,
              width: 24, height: 24, borderRadius: 4,
              background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer',
              fontSize: 12, color: game.favorite ? '#f59e0b' : '#fff',
            }}
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
