import { useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useUiStore } from '../stores/uiStore';
import { useLibraryStore } from '../stores/libraryStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export function GameDetailPage() {
  const { selectedGameId, navigateTo, showToast } = useUiStore();
  const { launchGame, games } = useLibraryStore();
  const [imgError, setImgError] = useState(false);

  const game = games.find((g) => g.id === selectedGameId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') navigateTo('library');
      if (e.key === 'Enter' && game) {
        launchGame(game.id).catch((e) => showToast(String(e), 'error'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game]);

  if (!game) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <LoadingSpinner size="lg" message="Loading game..." />
      </div>
    );
  }

  const imgSrc = game.box_art && !imgError ? convertFileSrc(game.box_art) : null;

  const statCard = (label: string, value: string | number) => (
    <div style={{ background: 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)', padding: '10px 14px' }}>
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{value}</p>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* Back button */}
        <button
          onClick={() => navigateTo('library')}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 24, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Back to Library
        </button>

        <div style={{ display: 'flex', gap: 32 }}>
          {/* Box Art */}
          <div style={{ flexShrink: 0, width: 180 }}>
            <div style={{ aspectRatio: '3/4', borderRadius: 12, overflow: 'hidden', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              {imgSrc ? (
                <img src={imgSrc} alt={game.title} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🎮</div>
              )}
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 8px' }}>{game.title}</h1>

            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              {game.year && <span>{game.year}</span>}
              {game.genre && <span>{game.genre}</span>}
              {game.developer && <span>{game.developer}</span>}
              {game.players > 1 && <span>{game.players} Players</span>}
            </div>

            {game.description && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
                {game.description}
              </p>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
              {statCard('Play Count', game.play_count)}
              {statCard('Last Played', game.last_played ? new Date(game.last_played).toLocaleDateString() : 'Never')}
              {statCard('Rating', game.rating > 0 ? `${(game.rating * 10).toFixed(0)}%` : '—')}
            </div>

            {/* File info */}
            <div style={{ background: 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)', padding: '10px 14px', marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 4px' }}>File</p>
              <p style={{ fontSize: 12, color: 'var(--color-text)', fontFamily: 'monospace', margin: '0 0 4px', wordBreak: 'break-all' }}>{game.file_name}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>{(game.file_size / 1024 / 1024).toFixed(1)} MB</p>
            </div>

            {/* Launch */}
            <button
              onClick={() => launchGame(game.id).catch((e) => showToast(String(e), 'error'))}
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 32px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              ▶ Launch Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
