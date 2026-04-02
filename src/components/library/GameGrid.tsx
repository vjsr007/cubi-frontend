import { useEffect, useRef, useCallback } from 'react';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUiStore } from '../../stores/uiStore';
import { useI18nStore } from '../../stores/i18nStore';
import { useGamepad } from '../../hooks/useGamepad';
import { GameCard } from './GameCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { GamepadButton } from '../../hooks/useGamepad';

export function GameGrid() {
  const store = useLibraryStore();
  const COLUMNS = store.gridColumns;
  const { showToast, navigateTo } = useUiStore();
  const { t } = useI18nStore();
  const gridRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filteredGames = store.getFilteredGames();
  const total = filteredGames.length;
  const focused = store.focusedGameIndex;
  const hasMore = store.hasMoreGames();

  // Load more from backend when sentinel is visible
  const loadMore = useCallback(() => {
    if (hasMore && !store.isLoadingMore) store.loadMoreGames();
  }, [hasMore, store]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root: gridRef.current, rootMargin: '400px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Auto-load if gamepad/keyboard navigates near the end
  useEffect(() => {
    if (hasMore && focused >= total - COLUMNS * 2) {
      store.loadMoreGames();
    }
  }, [focused, total, hasMore, COLUMNS, store]);

  const handleButton = (btn: GamepadButton) => {
    const cur = useLibraryStore.getState().focusedGameIndex;
    const n = useLibraryStore.getState().getFilteredGames().length;
    if (n === 0) return;

    switch (btn) {
      case 'RIGHT': store.setFocusedGameIndex(Math.min(cur + 1, n - 1)); break;
      case 'LEFT':  store.setFocusedGameIndex(Math.max(cur - 1, 0)); break;
      case 'DOWN':  store.setFocusedGameIndex(Math.min(cur + useLibraryStore.getState().gridColumns, n - 1)); break;
      case 'UP':    store.setFocusedGameIndex(Math.max(cur - useLibraryStore.getState().gridColumns, 0)); break;
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
        if (game) navigateTo('game-detail', game.id);
        break;
      }
    }
  };

  useGamepad({ onButton: handleButton });

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cur = useLibraryStore.getState().focusedGameIndex;
      const n = useLibraryStore.getState().getFilteredGames().length;
      if (n === 0) return;

      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); store.setFocusedGameIndex(Math.min(cur + 1, n - 1)); break;
        case 'ArrowLeft':  e.preventDefault(); store.setFocusedGameIndex(Math.max(cur - 1, 0)); break;
        case 'ArrowDown':  e.preventDefault(); store.setFocusedGameIndex(Math.min(cur + COLUMNS, n - 1)); break;
        case 'ArrowUp':    e.preventDefault(); store.setFocusedGameIndex(Math.max(cur - COLUMNS, 0)); break;
        case 'Enter': {
          const games = useLibraryStore.getState().getFilteredGames();
          const game = games[cur];
          if (game) navigateTo('game-detail', game.id);
          break;
        }
        case 'f': case 'F': {
          const games = useLibraryStore.getState().getFilteredGames();
          const game = games[cur];
          if (game) store.toggleFavorite(game.id);
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll focused card into view
  useEffect(() => {
    if (gridRef.current) {
      const cards = gridRef.current.querySelectorAll('[data-game-card]');
      const card = cards[focused] as HTMLElement;
      card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focused]);

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

  return (
    <div
      ref={gridRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: 16,
        display: 'grid',
        gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`,
        gap: 12,
        alignContent: 'start',
      }}
    >
      {filteredGames.map((game, index) => (
        <div key={game.id} data-game-card="">
          <GameCard
            game={game}
            isFocused={index === focused}
            onClick={() => {
              store.setFocusedGameIndex(index);
              navigateTo('game-detail', game.id);
            }}
            onLaunch={() => store.launchGame(game.id).catch((e) => showToast(String(e), 'error'))}
            onFavorite={() => store.toggleFavorite(game.id)}
          />
        </div>
      ))}
      {hasMore && (
        <div ref={sentinelRef} style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: 16 }}>
          {store.isLoadingMore
            ? <LoadingSpinner size="sm" />
            : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{total} / {store.totalGames}</span>
          }
        </div>
      )}
    </div>
  );
}
