import type { CatalogGame } from '../../types';

interface Props {
  game: CatalogGame;
  downloadBaseUrl?: string;
  onViewGame?: (gameId: string) => void;
  onDownload?: (url: string) => void;
}

export function CatalogGameRow({ game, downloadBaseUrl, onViewGame, onDownload }: Props) {
  const sizeStr = game.file_size
    ? game.file_size > 1_073_741_824
      ? `${(game.file_size / 1_073_741_824).toFixed(1)} GB`
      : `${(game.file_size / 1_048_576).toFixed(1)} MB`
    : '—';

  const downloadUrl = downloadBaseUrl
    ? `${downloadBaseUrl.replace(/\/+$/, '')}/${encodeURIComponent(game.file_name)}`
    : null;

  return (
    <tr
      style={{
        borderBottom: '1px solid var(--color-border)',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = 'var(--color-surface-2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
      }}
    >
      <td style={{ padding: '8px 12px', fontSize: 13 }}>{game.title}</td>
      <td style={{ padding: '8px 12px', fontSize: 12, opacity: 0.7 }}>{game.region || '—'}</td>
      <td style={{ padding: '8px 12px', fontSize: 13, textAlign: 'center' }}>
        {game.owned ? (
          <span style={{ color: '#28a745' }}>✅</span>
        ) : (
          <span style={{ color: '#dc3545' }}>❌</span>
        )}
      </td>
      <td style={{ padding: '8px 12px', fontSize: 12, opacity: 0.7 }}>{sizeStr}</td>
      <td style={{ padding: '8px 12px' }}>
        {game.owned && game.owned_game_id ? (
          <button
            onClick={() => onViewGame?.(game.owned_game_id!)}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-primary)',
              borderRadius: 6,
              color: 'var(--color-primary)',
              padding: '3px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            View
          </button>
        ) : downloadUrl ? (
          <button
            onClick={() => onDownload?.(downloadUrl)}
            style={{
              background: 'transparent',
              border: '1px solid #17a2b8',
              borderRadius: 6,
              color: '#17a2b8',
              padding: '3px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ⬇ DL
          </button>
        ) : null}
      </td>
    </tr>
  );
}
