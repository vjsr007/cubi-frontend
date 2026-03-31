import { useState } from 'react';
import { api } from '../../lib/invoke';
import { useI18nStore } from '../../stores/i18nStore';
import type { YoutubeSearchResult } from '../../types';

interface Props {
  gameId: string;
  gameTitle: string;
  onDownloaded: () => void;
  onError: (msg: string) => void;
}

export function YouTubeSearch({ gameId, gameTitle, onDownloaded, onError }: Props) {
  const [query, setQuery] = useState(gameTitle + ' trailer');
  const [results, setResults] = useState<YoutubeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { t } = useI18nStore();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const res = await api.searchYoutube(query.trim());
      setResults(res);
    } catch (e) {
      const msg = String(e);
      // Show a user-friendly message instead of raw instance URLs
      if (msg.includes('Invidious') || msg.includes('HTTP')) {
        setSearchError(t('editor.youtubeNoResults') + ' (API unavailable — install yt-dlp for reliable search)');
      } else {
        setSearchError(msg);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = async (result: YoutubeSearchResult) => {
    setDownloading(result.video_id);
    try {
      await api.downloadYoutubeVideo(gameId, result.url);
      onDownloaded();
    } catch (e) {
      onError(String(e));
    } finally {
      setDownloading(null);
    }
  };

  const btnStyle: React.CSSProperties = {
    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
    borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
    color: 'var(--color-text-muted)',
  };

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: 12,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
        {t('editor.youtubeSearch')}
      </span>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          placeholder={t('editor.youtubeSearchPlaceholder')}
          style={{
            flex: 1, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--color-text)', outline: 'none',
          }}
        />
        <button onClick={handleSearch} disabled={searching} style={{ ...btnStyle, padding: '6px 14px' }}>
          {searching ? '...' : t('editor.youtubeSearch')}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
          {results.map((r) => (
            <div
              key={r.video_id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--color-surface-2)', borderRadius: 6, padding: '6px 10px',
                border: '1px solid var(--color-border)',
              }}
            >
              <img
                src={`https://img.youtube.com/vi/${r.video_id}/mqdefault.jpg`}
                alt={r.title}
                style={{ width: 80, height: 45, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
              />
              <span style={{ flex: 1, fontSize: 11, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.title}
              </span>
              <button
                onClick={() => handleDownload(r)}
                disabled={!!downloading}
                style={{
                  ...btnStyle,
                  background: downloading === r.video_id ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: downloading === r.video_id ? '#fff' : 'var(--color-text-muted)',
                  flexShrink: 0,
                }}
              >
                {downloading === r.video_id ? t('editor.youtubeDownloading') : t('editor.youtubeDownload')}
              </button>
            </div>
          ))}
        </div>
      )}

      {searchError && (
        <p style={{ fontSize: 11, color: 'var(--color-error, #ef4444)', margin: 0 }}>
          {searchError}
        </p>
      )}

      {results.length === 0 && !searching && !searchError && query && (
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
          {t('editor.youtubeNoResults')}
        </p>
      )}
    </div>
  );
}
