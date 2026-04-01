import { CatalogGameRow } from './CatalogGameRow';
import type { CatalogGame } from '../../types';

interface Props {
  games: CatalogGame[];
  downloadBaseUrl?: string;
  onViewGame?: (gameId: string) => void;
  onDownload?: (url: string) => void;
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 600,
  textAlign: 'left',
  color: 'var(--color-text-muted)',
  borderBottom: '2px solid var(--color-border)',
  position: 'sticky',
  top: 0,
  background: 'var(--color-surface)',
  zIndex: 1,
};

export function CatalogGameList({ games, downloadBaseUrl, onViewGame, onDownload }: Props) {
  if (games.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', opacity: 0.5, fontSize: 14 }}>
        No games found
      </div>
    );
  }

  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Title</th>
            <th style={{ ...thStyle, width: 100 }}>Region</th>
            <th style={{ ...thStyle, width: 70, textAlign: 'center' }}>Status</th>
            <th style={{ ...thStyle, width: 90 }}>Size</th>
            <th style={{ ...thStyle, width: 80 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <CatalogGameRow
              key={game.id}
              game={game}
              downloadBaseUrl={downloadBaseUrl}
              onViewGame={onViewGame}
              onDownload={onDownload}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
