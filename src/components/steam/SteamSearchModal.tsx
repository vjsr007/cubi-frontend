import { useState } from 'react';
import { api } from '../../lib/invoke';
import { useI18nStore } from '../../stores/i18nStore';
import type { SteamSearchResult } from '../../types/steam';

interface Props {
  gameTitle: string;
  onLink: (appId: number) => void;
  onClose: () => void;
}

export function SteamSearchModal({ gameTitle, onLink, onClose }: Props) {
  const [query, setQuery] = useState(gameTitle);
  const [results, setResults] = useState<SteamSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const { t } = useI18nStore();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await api.searchSteamGames(query.trim());
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--color-background)', border: '1px solid var(--color-border)',
        borderRadius: 12, padding: 20, width: 420, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
            {t('steam.findOnSteam')}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'var(--color-text-muted)',
              fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder={t('steam.searchPlaceholder')}
            autoFocus
            style={{
              flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 6, padding: '8px 10px', fontSize: 13, color: 'var(--color-text)', outline: 'none',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            style={{
              background: 'var(--color-primary)', color: '#fff', border: 'none',
              borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 600,
              cursor: searching ? 'not-allowed' : 'pointer',
            }}
          >
            {searching ? '...' : t('steam.search')}
          </button>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: 350, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {results.map((r) => (
            <button
              key={r.app_id}
              onClick={() => onLink(r.app_id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 6, cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; }}
            >
              {r.icon_url && (
                <img src={r.icon_url} alt="" style={{ width: 32, height: 15, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
              )}
              <span style={{ fontSize: 12, color: 'var(--color-text)', flex: 1 }}>{r.name}</span>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{r.app_id}</span>
            </button>
          ))}
          {results.length === 0 && !searching && (
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', margin: '20px 0' }}>
              {t('steam.searchHint')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
