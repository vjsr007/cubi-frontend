import type { CatalogSystemStats } from '../../types';

interface Props {
  stats: CatalogSystemStats;
  onClick: () => void;
  onShowWiki?: () => void;
  selected?: boolean;
}

export function CatalogSystemCard({ stats, onClick, onShowWiki, selected }: Props) {
  const percent = stats.total > 0 ? Math.round((stats.owned / stats.total) * 100) : 0;
  const isEmpty = stats.total === 0;

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        background: selected ? 'var(--color-primary)' : 'var(--color-surface)',
        border: `1px solid ${selected ? 'var(--color-primary)' : isEmpty ? 'var(--color-border)' : 'var(--color-border)'}`,
        borderRadius: 12,
        padding: 16,
        cursor: 'pointer',
        textAlign: 'left',
        color: selected ? '#fff' : 'var(--color-text)',
        opacity: isEmpty ? 0.7 : 1,
        transition: 'all 0.15s',
        minWidth: 180,
      }}
    >
      {onShowWiki && (
        <span
          onClick={(e) => { e.stopPropagation(); onShowWiki(); }}
          title="System Wiki"
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 24, height: 24, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: selected ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-2)',
            color: selected ? '#fff' : 'var(--color-text-muted)',
            fontSize: 13, cursor: 'pointer',
            opacity: 0.7, transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
        >
          ℹ
        </span>
      )}
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
        {stats.system_name}
      </div>
      {isEmpty ? (
        <>
          <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 8 }}>
            No data — click to sync
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            {stats.owned}/{stats.total}
          </div>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
            {percent}% owned
          </div>
          {/* Progress bar */}
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: selected ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-2)',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${percent}%`,
                borderRadius: 3,
                background: selected ? '#fff' : 'var(--color-primary)',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </>
      )}
      <div style={{ fontSize: 11, opacity: 0.5 }}>
        {stats.last_synced
          ? `Synced: ${new Date(stats.last_synced).toLocaleDateString()}`
          : 'Never synced'}
      </div>
    </button>
  );
}
