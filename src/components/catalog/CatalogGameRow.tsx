import type { CatalogGame } from '../../types';

interface Props {
  game: CatalogGame;
  downloadBaseUrl?: string;
  rgsxGameMap?: Map<string, string>;
  rgsxDlStates?: Record<string, string>;
  onRgsxDownload?: (rgsxGameName: string) => void;
  onViewGame?: (gameId: string) => void;
  onDownload?: (url: string) => void;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Same 80% ratio rule as CatalogPage to avoid Beta/variant false positives
function findRgsxMatch(title: string, map: Map<string, string>): string | undefined {
  const nt = norm(title);
  if (map.has(nt)) return map.get(nt);
  for (const [nk, original] of map) {
    if (nt.length < 4 || nk.length < 4) continue;
    const shorter = nt.length <= nk.length ? nt : nk;
    const longer  = nt.length <= nk.length ? nk : nt;
    if (shorter.length / longer.length >= 0.92 && longer.includes(shorter)) return original;
  }
  return undefined;
}

export function CatalogGameRow({ game, downloadBaseUrl, rgsxGameMap, rgsxDlStates, onRgsxDownload, onViewGame, onDownload }: Props) {
  const sizeStr = game.file_size
    ? game.file_size > 1_073_741_824
      ? `${(game.file_size / 1_073_741_824).toFixed(1)} GB`
      : `${(game.file_size / 1_048_576).toFixed(1)} MB`
    : '—';

  const downloadUrl = downloadBaseUrl
    ? `${downloadBaseUrl.replace(/\/+$/, '')}/${encodeURIComponent(game.file_name)}`
    : null;

  const rgsxMatch = !game.owned && rgsxGameMap ? findRgsxMatch(game.title, rgsxGameMap) : undefined;
  const rgsxState = rgsxMatch ? (rgsxDlStates?.[rgsxMatch] ?? 'idle') : undefined;

  return (
    <tr
      style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.1s' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--color-surface-2)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
    >
      <td style={{ padding: '8px 12px', fontSize: 13 }}>{game.title}</td>
      <td style={{ padding: '8px 12px', fontSize: 12, opacity: 0.7 }}>{game.region || '—'}</td>
      <td style={{ padding: '8px 12px', fontSize: 13, textAlign: 'center' }}>
        {game.owned ? <span style={{ color: '#28a745' }}>✅</span> : <span style={{ color: '#dc3545' }}>❌</span>}
      </td>
      <td style={{ padding: '8px 12px', fontSize: 12, opacity: 0.7 }}>{sizeStr}</td>
      <td style={{ padding: '8px 12px' }}>
        {game.owned && game.owned_game_id ? (
          <button
            onClick={() => onViewGame?.(game.owned_game_id!)}
            style={{ background: 'transparent', border: '1px solid var(--color-primary)', borderRadius: 6, color: 'var(--color-primary)', padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}
          >
            View
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 4 }}>
            {rgsxMatch && (
              <button
                onClick={() => rgsxState === 'idle' && onRgsxDownload?.(rgsxMatch)}
                disabled={rgsxState !== 'idle'}
                title={rgsxState === 'done' ? 'Downloaded' : rgsxState === 'downloading' ? 'Downloading…' : rgsxState === 'pending' ? 'Queued…' : `Download via RGSX: ${rgsxMatch}`}
                style={{
                  background: 'transparent',
                  border: `1px solid ${rgsxState === 'done' ? '#28a745' : rgsxState === 'error' ? '#dc3545' : '#00bcd4'}`,
                  borderRadius: 6,
                  color: rgsxState === 'done' ? '#28a745' : rgsxState === 'error' ? '#dc3545' : '#00bcd4',
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: rgsxState === 'idle' ? 'pointer' : 'default',
                  minWidth: 52,
                  textAlign: 'center',
                }}
              >
                {rgsxState === 'pending' ? '⏳' : rgsxState === 'downloading' ? '↓ RGSX' : rgsxState === 'done' ? '✓' : rgsxState === 'error' ? '✗' : '⬇ RGSX'}
              </button>
            )}
            {downloadUrl && (
              <button
                onClick={() => onDownload?.(downloadUrl)}
                style={{ background: 'transparent', border: '1px solid #17a2b8', borderRadius: 6, color: '#17a2b8', padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
              >
                ⬇ DL
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
