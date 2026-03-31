import { useEffect, useRef } from 'react';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUiStore } from '../../stores/uiStore';
import { useI18nStore } from '../../stores/i18nStore';
import { useGamepad } from '../../hooks/useGamepad';
import { toImageSrc } from '../../lib/media';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { GamepadButton } from '../../hooks/useGamepad';
import type { SortField } from '../../types';

export function GameList() {
  const store = useLibraryStore();
  const { showToast, navigateTo } = useUiStore();
  const { t } = useI18nStore();
  const listRef = useRef<HTMLDivElement>(null);

  const filteredGames = store.getFilteredGames();
  const total = filteredGames.length;
  const focused = store.focusedGameIndex;

  const handleButton = (btn: GamepadButton) => {
    const cur = useLibraryStore.getState().focusedGameIndex;
    const n = useLibraryStore.getState().getFilteredGames().length;
    if (n === 0) return;
    switch (btn) {
      case 'DOWN': case 'RIGHT': store.setFocusedGameIndex(Math.min(cur + 1, n - 1)); break;
      case 'UP': case 'LEFT':    store.setFocusedGameIndex(Math.max(cur - 1, 0)); break;
      case 'A': {
        const game = useLibraryStore.getState().getFilteredGames()[cur];
        if (game) navigateTo('game-detail', game.id);
        break;
      }
      case 'Y': {
        const game = useLibraryStore.getState().getFilteredGames()[cur];
        if (game) store.toggleFavorite(game.id);
        break;
      }
      case 'X': {
        const game = useLibraryStore.getState().getFilteredGames()[cur];
        if (game) store.launchGame(game.id).catch((e) => showToast(String(e), 'error'));
        break;
      }
    }
  };

  useGamepad({ onButton: handleButton });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cur = useLibraryStore.getState().focusedGameIndex;
      const n = useLibraryStore.getState().getFilteredGames().length;
      if (n === 0) return;
      switch (e.key) {
        case 'ArrowDown':  e.preventDefault(); store.setFocusedGameIndex(Math.min(cur + 1, n - 1)); break;
        case 'ArrowUp':    e.preventDefault(); store.setFocusedGameIndex(Math.max(cur - 1, 0)); break;
        case 'Enter': {
          const game = useLibraryStore.getState().getFilteredGames()[cur];
          if (game) navigateTo('game-detail', game.id);
          break;
        }
        case 'f': case 'F': {
          const game = useLibraryStore.getState().getFilteredGames()[cur];
          if (game) store.toggleFavorite(game.id);
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (listRef.current) {
      const rows = listRef.current.querySelectorAll('[data-game-row]');
      const row = rows[focused] as HTMLElement;
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focused]);

  const handleSort = (field: SortField) => {
    if (store.sortField === field) {
      store.setSortOrder(store.sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      store.setSortField(field);
      store.setSortOrder('asc');
    }
  };

  const sortIcon = (field: SortField) => {
    if (store.sortField !== field) return '';
    return store.sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  if (store.isLoadingGames) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" message={t('library.loadingGames')} />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎮</div>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{t('library.noGames')}</p>
        </div>
      </div>
    );
  }

  const headerStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: 11, fontWeight: 600,
    color: 'var(--color-text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.04em', cursor: 'pointer', userSelect: 'none',
    whiteSpace: 'nowrap', borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
  };

  return (
    <div ref={listRef} style={{ flex: 1, overflowY: 'auto' }}>
      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 60px 100px 70px 90px 50px', position: 'sticky', top: 0, zIndex: 2 }}>
        <div style={headerStyle} />
        <div style={headerStyle} onClick={() => handleSort('title')}>
          {t('filters.sortTitle')}{sortIcon('title')}
        </div>
        <div style={headerStyle}>{t('game.genre')}</div>
        <div style={headerStyle} onClick={() => handleSort('year')}>
          {t('game.year')}{sortIcon('year')}
        </div>
        <div style={headerStyle} onClick={() => handleSort('last_played')}>
          {t('game.lastPlayed')}{sortIcon('last_played')}
        </div>
        <div style={headerStyle} onClick={() => handleSort('play_count')}>
          {t('game.playCount')}{sortIcon('play_count')}
        </div>
        <div style={headerStyle} onClick={() => handleSort('rating')}>
          {t('game.rating')}{sortIcon('rating')}
        </div>
        <div style={headerStyle}>★</div>
      </div>

      {/* Game rows */}
      {filteredGames.map((game, index) => {
        const isFocused = index === focused;
        const imgSrc = toImageSrc(game.box_art ?? null);
        return (
          <div
            key={game.id}
            data-game-row=""
            onClick={() => {
              store.setFocusedGameIndex(index);
              navigateTo('game-detail', game.id);
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 100px 60px 100px 70px 90px 50px',
              alignItems: 'center',
              cursor: 'pointer',
              borderBottom: '1px solid var(--color-border)',
              background: isFocused ? 'rgba(124,58,237,0.1)' : 'transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { if (!isFocused) e.currentTarget.style.background = 'var(--color-surface-2)'; }}
            onMouseLeave={(e) => { if (!isFocused) e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Thumbnail */}
            <div style={{ padding: '4px 6px' }}>
              {imgSrc ? (
                <img src={imgSrc} alt="" style={{ width: 28, height: 38, objectFit: 'cover', borderRadius: 3, display: 'block' }} />
              ) : (
                <div style={{ width: 28, height: 38, borderRadius: 3, background: 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🎮</div>
              )}
            </div>
            {/* Title */}
            <div style={{ padding: '8px 12px', fontSize: 13, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {game.title}
            </div>
            {/* Genre */}
            <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {game.genre ?? '—'}
            </div>
            {/* Year */}
            <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--color-text-muted)' }}>
              {game.year ?? '—'}
            </div>
            {/* Last Played */}
            <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--color-text-muted)' }}>
              {game.last_played ? new Date(game.last_played).toLocaleDateString() : '—'}
            </div>
            {/* Play Count */}
            <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
              {game.play_count > 0 ? `${game.play_count}x` : '—'}
            </div>
            {/* Rating */}
            <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--color-text-muted)' }}>
              {game.rating > 0 ? `${(game.rating * 10).toFixed(0)}%` : '—'}
            </div>
            {/* Favorite */}
            <div
              onClick={(e) => { e.stopPropagation(); store.toggleFavorite(game.id); }}
              style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', textAlign: 'center', color: game.favorite ? '#f59e0b' : 'var(--color-text-muted)' }}
            >
              {game.favorite ? '★' : '☆'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
