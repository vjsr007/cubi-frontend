// ═══════════════════════════════════════════════════════════════
// GameCard.tsx — animated game tile with focus state, scanlines, sparks
// Gamepad-ready: pass `focused` from your wheel/grid selection state.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import './GameCard.css';

interface Props {
  title: string;
  year?: number | string;
  system?: string;
  /** Optional box art URL. Falls back to a colored plate with the title. */
  art?: string;
  /** Base hue for the placeholder plate. HEX or CSS color. */
  color?: string;
  /** Whether this card is currently focused (gamepad/keyboard selection). */
  focused?: boolean;
  favorite?: boolean;
  playCount?: number;
  hasVideo?: boolean;
  onClick?: () => void;
  onLaunch?: () => void;
}

export const GameCard: React.FC<Props> = ({
  title, year, system, art, color = '#553c9a',
  focused = false, favorite, playCount, hasVideo,
  onClick, onLaunch,
}) => {
  return (
    <button
      className={`game-card ${focused ? 'game-card--focus' : ''}`}
      style={{ '--card-color': color } as React.CSSProperties}
      onClick={focused && onLaunch ? onLaunch : onClick}
      aria-label={`${title}${year ? ', ' + year : ''}`}
    >
      <div className="game-card-art">
        {art ? (
          <img src={art} alt={title} />
        ) : (
          <div className="game-card-placeholder">{title}</div>
        )}
        <div className="game-card-scanlines" />
        {favorite && <span className="game-card-badge game-card-badge--fav" title="Favorite">★</span>}
        {hasVideo && <span className="game-card-badge game-card-badge--video" title="Has video">🎬</span>}
        {typeof playCount === 'number' && playCount > 0 && (
          <span className="game-card-badge game-card-badge--count">{playCount}×</span>
        )}
        <div className="game-card-play">▶</div>
      </div>
      <div className="game-card-meta">
        <div className="game-card-title" title={title}>{title}</div>
        {(year || system) && (
          <div className="game-card-sub">
            {year}{year && system ? ' · ' : ''}{system}
          </div>
        )}
      </div>
    </button>
  );
};

export default GameCard;
