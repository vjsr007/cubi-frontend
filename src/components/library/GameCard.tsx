import { useState } from 'react';
import { toImageSrc } from '../../lib/media';
import { useGameMedia, bestImage } from '../../hooks/useMedia';
import { useLibraryStore } from '../../stores/libraryStore';
import { VideoPreview } from '../media/VideoPreview';
import type { GameInfo } from '../../types';
import './GameCard.css';

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
  const launchingGameId = useLibraryStore((s) => s.launchingGameId);
  const isLaunching = launchingGameId === game.id;

  const { data: media } = useGameMedia(game.id);

  const showVideo = (hovered || isFocused) && !!media?.video;
  const richImage = bestImage(media);
  const imgPath = richImage ?? game.box_art ?? null;
  const imgSrc = !imgError ? toImageSrc(imgPath) : null;

  return (
    <button
      className={`game-card ${isFocused ? 'game-card--focus' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`${game.title}${game.year ? ', ' + game.year : ''}`}
    >
      <div className="game-card-art">
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
          <div className="game-card-placeholder">{game.title}</div>
        )}

        <div className="game-card-scanlines" />

        {/* Badges */}
        {game.favorite && (
          <span className="game-card-badge game-card-badge--fav" title="Favorite">★</span>
        )}
        {media?.video && !hovered && (
          <span className="game-card-badge game-card-badge--video" title="Has video">🎬</span>
        )}
        {game.play_count > 0 && (
          <span className="game-card-badge game-card-badge--count">{game.play_count}×</span>
        )}

        {/* Play / Launch overlay */}
        {(hovered || isLaunching) && (
          <div className="game-card-play-overlay">
            {isLaunching ? (
              <div className="game-card-spinner" />
            ) : (
              <span
                className="game-card-play"
                onClick={(e) => { e.stopPropagation(); onLaunch(); }}
              >
                ▶
              </span>
            )}
          </div>
        )}

        {/* Favorite toggle on hover */}
        {hovered && (
          <button
            className="game-card-fav-toggle"
            onClick={(e) => { e.stopPropagation(); onFavorite(); }}
            title={game.favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {game.favorite ? '★' : '☆'}
          </button>
        )}
      </div>

      <div className="game-card-meta">
        <div className="game-card-title" title={game.title}>{game.title}</div>
        {game.year && (
          <div className="game-card-sub">{game.year}</div>
        )}
      </div>
    </button>
  );
}
