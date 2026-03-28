import { useLibraryStore } from '../../stores/libraryStore';
import type { SortField, ViewMode } from '../../types';

export function FilterBar() {
  const {
    searchQuery, setSearchQuery,
    sortField, setSortField,
    sortOrder, setSortOrder,
    viewMode, setViewMode,
    showFavoritesOnly, toggleFavoritesOnly,
    games, getFilteredGames,
  } = useLibraryStore();

  const filteredCount = getFilteredGames().length;

  const inputStyle = {
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
      {/* Search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 240 }}>
        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--color-text-muted)' }}>🔍</span>
        <input
          type="text"
          placeholder="Search games..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...inputStyle, width: '100%', paddingLeft: 26 }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        />
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
        ★ Favorites
      </button>

      {/* Sort */}
      <select
        value={sortField}
        onChange={(e) => setSortField(e.target.value as SortField)}
        style={{ ...inputStyle, cursor: 'pointer' }}
      >
        <option value="title">Title</option>
        <option value="last_played">Last Played</option>
        <option value="play_count">Play Count</option>
        <option value="rating">Rating</option>
        <option value="year">Year</option>
      </select>

      <button
        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        style={{ ...inputStyle, cursor: 'pointer', padding: '6px 10px' }}
        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
      >
        {sortOrder === 'asc' ? '↑' : '↓'}
      </button>

      {/* View mode */}
      <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
        {(['grid', 'list'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
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
