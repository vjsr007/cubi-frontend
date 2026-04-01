import { useState, useRef, useEffect } from 'react';
import { useLibraryStore } from '../../stores/libraryStore';
import { useI18nStore } from '../../stores/i18nStore';
import type { SortField, ViewMode } from '../../types';

interface FilterBarProps {
  onShowWiki?: () => void;
}

export function FilterBar({ onShowWiki }: FilterBarProps = {}) {
  const {
    searchQuery, setSearchQuery,
    sortField, setSortField,
    sortOrder, setSortOrder,
    viewMode, setViewMode,
    gridColumns, setGridColumns,
    showFavoritesOnly, toggleFavoritesOnly,
    games, getFilteredGames,
  } = useLibraryStore();
  const { t } = useI18nStore();

  const filteredCount = getFilteredGames().length;

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const suggestions = searchQuery.trim().length >= 2
    ? games
        .filter((g) => g.title.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 8)
        .map((g) => g.title)
    : [];

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestion((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedSuggestion >= 0) {
      e.preventDefault();
      setSearchQuery(suggestions[selectedSuggestion]);
      setShowSuggestions(false);
      setSelectedSuggestion(-1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    color: 'var(--color-text)',
    outline: 'none',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-surface)', flexShrink: 0,
    }}>
      {/* Search with autocomplete */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--color-text-muted)', pointerEvents: 'none' }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder={t('library.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
            setSelectedSuggestion(-1);
          }}
          onFocus={() => { if (searchQuery.trim().length >= 2) setShowSuggestions(true); }}
          onKeyDown={handleSearchKeyDown}
          style={{ ...inputStyle, width: '100%', paddingLeft: 26, paddingRight: searchQuery ? 28 : 10 }}
        />
        {/* Clear button */}
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setShowSuggestions(false); inputRef.current?.focus(); }}
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: 'var(--color-surface-3)', border: 'none', borderRadius: '50%',
              width: 18, height: 18, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-text-muted)', fontSize: 11, padding: 0,
              lineHeight: 1,
            }}
            title={t('common.cancel')}
          >
            ✕
          </button>
        )}

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, marginTop: 4, overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 50,
              maxHeight: 240, overflowY: 'auto',
            }}
          >
            {suggestions.map((title, i) => (
              <div
                key={i}
                onClick={() => {
                  setSearchQuery(title);
                  setShowSuggestions(false);
                  setSelectedSuggestion(-1);
                }}
                style={{
                  padding: '8px 12px', fontSize: 12, cursor: 'pointer',
                  color: 'var(--color-text)',
                  background: i === selectedSuggestion ? 'var(--color-primary)' : 'transparent',
                  ...(i === selectedSuggestion ? { color: '#fff' } : {}),
                }}
                onMouseEnter={(e) => {
                  if (i !== selectedSuggestion) e.currentTarget.style.background = 'var(--color-surface-2)';
                }}
                onMouseLeave={(e) => {
                  if (i !== selectedSuggestion) e.currentTarget.style.background = 'transparent';
                }}
              >
                {highlightMatch(title, searchQuery)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Count */}
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
        {filteredCount} / {games.length}
      </span>

      {/* Favorites toggle */}
      <button
        onClick={toggleFavoritesOnly}
        style={{
          ...inputStyle,
          cursor: 'pointer',
          background: showFavoritesOnly ? 'rgba(245,158,11,0.15)' : 'var(--color-surface-2)',
          color: showFavoritesOnly ? '#f59e0b' : 'var(--color-text-muted)',
          borderColor: showFavoritesOnly ? 'rgba(245,158,11,0.4)' : 'var(--color-border)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        ★ {t('filters.favorites')}
      </button>

      {/* Sort */}
      <select
        value={sortField}
        onChange={(e) => setSortField(e.target.value as SortField)}
        aria-label={t('library.sortBy')}
        style={{ ...inputStyle, cursor: 'pointer' }}
      >
        <option value="title">{t('filters.sortTitle')}</option>
        <option value="last_played">{t('filters.sortLastPlayed')}</option>
        <option value="play_count">{t('filters.sortPlayCount')}</option>
        <option value="rating">{t('filters.sortRating')}</option>
        <option value="year">{t('filters.sortYear')}</option>
      </select>

      <button
        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        style={{ ...inputStyle, cursor: 'pointer', padding: '6px 10px' }}
        title={sortOrder === 'asc' ? t('filters.ascending') : t('filters.descending')}
      >
        {sortOrder === 'asc' ? '↑' : '↓'}
      </button>

      {/* System Wiki info */}
      {onShowWiki && (
        <button
          onClick={onShowWiki}
          style={{ ...inputStyle, cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
          title="System Info"
        >
          ℹ️ Info
        </button>
      )}

      {/* Zoom controls (only in grid mode) */}
      {viewMode === 'grid' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setGridColumns(gridColumns + 1)}
            disabled={gridColumns >= 10}
            style={{
              ...inputStyle, cursor: gridColumns >= 10 ? 'default' : 'pointer',
              padding: '4px 8px', fontSize: 14, opacity: gridColumns >= 10 ? 0.3 : 1,
            }}
            title={t('library.zoomOut')}
          >−</button>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', minWidth: 16, textAlign: 'center' }}>
            {gridColumns}
          </span>
          <button
            onClick={() => setGridColumns(gridColumns - 1)}
            disabled={gridColumns <= 3}
            style={{
              ...inputStyle, cursor: gridColumns <= 3 ? 'default' : 'pointer',
              padding: '4px 8px', fontSize: 14, opacity: gridColumns <= 3 ? 0.3 : 1,
            }}
            title={t('library.zoomIn')}
          >+</button>
        </div>
      )}

      {/* View mode */}
      <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
        {(['grid', 'list'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            title={mode === 'grid' ? t('library.viewGrid') : t('library.viewList')}
            style={{
              padding: '6px 10px', border: 'none', cursor: 'pointer', fontSize: 13,
              background: viewMode === mode ? 'var(--color-primary)' : 'var(--color-surface-2)',
              color: viewMode === mode ? '#fff' : 'var(--color-text-muted)',
            }}
          >
            {mode === 'grid' ? '⊞' : '☰'}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Highlight the matching substring in bold */
function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: 'var(--color-primary)' }}>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}
