import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/invoke';
import type { RgsxPlatform, RgsxGame, RgsxDownloadItem } from '../../types';

interface Props {
  rgsxDeviceUrl: string;
  systemId: string;
  systemName: string;
  missingTitles?: string[];
  ownedTitles?: string[];
  onRgsxGamesLoaded?: (gameNames: string[]) => void;
}

type DownloadState = 'idle' | 'pending' | 'downloading' | 'done' | 'error';

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const titleMatches = (a: string, b: string) => {
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
};

// cubi system_id → possible RGSX folder names (in priority order)
const SYSTEM_ALIASES: Record<string, string[]> = {
  genesis:      ['megadrive', 'genesis', 'md'],
  megadrive:    ['megadrive', 'genesis', 'md'],
  ps1:          ['psx', 'ps1', 'playstation'],
  ps2:          ['ps2', 'playstation2'],
  ps3:          ['ps3', 'playstation3'],
  psp:          ['psp'],
  psvita:       ['psvita', 'vita'],
  pcengine:     ['pcengine', 'tg16', 'turbografx'],
  atarijaguar:  ['atarijaguar', 'jaguar'],
  atarilynx:    ['atarilynx', 'lynx'],
  atarist:      ['atarist', 'st'],
  '3do':        ['3do'],
  fbneo:        ['fbneo', 'finalburn'],
  neogeo:       ['neogeo', 'ng'],
  sgb:          ['sgb', 'supergameboy'],
  satellaview:  ['satellaview', 'satelview'],
};

export function RgsxPanel({ rgsxDeviceUrl, systemId, systemName, missingTitles, ownedTitles, onRgsxGamesLoaded }: Props) {
  const [platforms, setPlatforms] = useState<RgsxPlatform[]>([]);
  const [matchedPlatform, setMatchedPlatform] = useState<RgsxPlatform | null>(null);
  const [games, setGames] = useState<RgsxGame[]>([]);
  const [search, setSearch] = useState('');
  const [loadingGames, setLoadingGames] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadStates, setDownloadStates] = useState<Record<string, DownloadState>>({});
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, RgsxDownloadItem>>({});
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.rgsxGetPlatforms(rgsxDeviceUrl)
      .then((list) => {
        setPlatforms(list);
        const sid = systemId.toLowerCase();
        const sname = systemName.toLowerCase();
        const aliases = SYSTEM_ALIASES[sid] ?? [sid];

        // 1. Exact folder match (including aliases)
        let match = list.find((p) => aliases.includes(p.folder.toLowerCase()));
        // 2. Platform name contains system display name
        if (!match) match = list.find((p) => p.platform_name.toLowerCase().includes(sname));
        // 3. System name contains platform name word
        if (!match) match = list.find((p) =>
          p.platform_name.toLowerCase().split(/[\s/,]+/).some((w) => w.length > 3 && sname.includes(w))
        );
        // 4. Folder partial match
        if (!match) match = list.find((p) => aliases.some((a) => p.folder.toLowerCase().includes(a) || a.includes(p.folder.toLowerCase())));

        setMatchedPlatform(match ?? null);
      })
      .catch((e) => setError(String(e)));
  }, [rgsxDeviceUrl, systemId, systemName]);

  useEffect(() => {
    if (!matchedPlatform) return;
    setLoadingGames(true);
    setError(null);
    api.rgsxGetGames(rgsxDeviceUrl, matchedPlatform.platform_name)
      .then((list) => {
        setGames(list);
        onRgsxGamesLoaded?.(list.map((g) => g.name));
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoadingGames(false));
  }, [rgsxDeviceUrl, matchedPlatform]); // eslint-disable-line react-hooks/exhaustive-deps

  const pollProgress = useCallback(() => {
    api.rgsxGetProgress(rgsxDeviceUrl)
      .then((p) => {
        setProgress(p.downloads);
        // Auto-mark finished downloads
        setDownloadStates((prev) => {
          const next = { ...prev };
          for (const [key, item] of Object.entries(p.downloads)) {
            if (item.status === 'Completed') next[key] = 'done';
            else if (item.status === 'Error') next[key] = 'error';
            else if (item.status === 'Downloading' || item.status === 'Connecting') next[key] = 'downloading';
          }
          return next;
        });
      })
      .catch(() => {});
  }, [rgsxDeviceUrl]);

  useEffect(() => {
    const hasActive = Object.values(downloadStates).some(
      (s) => s === 'pending' || s === 'downloading',
    );
    if (hasActive && !progressTimer.current) {
      progressTimer.current = setInterval(pollProgress, 2000);
    }
    if (!hasActive && progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [downloadStates, pollProgress]);

  const handleDownload = async (game: RgsxGame) => {
    if (!matchedPlatform) return;
    setDownloadStates((s) => ({ ...s, [game.name]: 'pending' }));
    setDownloadErrors((e) => { const n = { ...e }; delete n[game.name]; return n; });
    try {
      const result = await api.rgsxDownloadGame(
        rgsxDeviceUrl,
        matchedPlatform.platform_name,
        game.name,
        false,
      );
      if (result.success) {
        setDownloadStates((s) => ({ ...s, [game.name]: 'downloading' }));
        pollProgress();
      } else {
        setDownloadStates((s) => ({ ...s, [game.name]: 'error' }));
        setDownloadErrors((e) => ({ ...e, [game.name]: result.error ?? 'Download failed' }));
      }
    } catch (e) {
      setDownloadStates((s) => ({ ...s, [game.name]: 'error' }));
      setDownloadErrors((err) => ({ ...err, [game.name]: String(e) }));
    }
  };

  const handleQueue = async (game: RgsxGame) => {
    if (!matchedPlatform) return;
    try {
      await api.rgsxDownloadGame(rgsxDeviceUrl, matchedPlatform.platform_name, game.name, true);
      setDownloadStates((s) => ({ ...s, [game.name]: 'pending' }));
    } catch (e) {
      setDownloadErrors((err) => ({ ...err, [game.name]: String(e) }));
    }
  };

  const isOwned = (name: string) =>
    ownedTitles?.some((t) => titleMatches(t, name)) ?? false;

  const isMissing = (name: string) =>
    missingTitles && missingTitles.length > 0
      ? missingTitles.some((t) => titleMatches(t, name))
      : false;

  const filtered = search
    ? games.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : games;

  if (error) {
    return (
      <div style={panelStyle}>
        <Header />
        <p style={{ color: 'var(--color-error)', fontSize: 13, margin: 0 }}>⚠ {error}</p>
      </div>
    );
  }

  if (!matchedPlatform && platforms.length > 0) {
    return (
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Header />
          <span style={{ fontSize: 12, opacity: 0.6 }}>— {systemName} not found in RGSX</span>
        </div>
      </div>
    );
  }

  if (!matchedPlatform) {
    return (
      <div style={panelStyle}>
        <Header />
        <span style={{ fontSize: 13, opacity: 0.5, marginLeft: 8 }}>Connecting to RGSX…</span>
      </div>
    );
  }

  const activeDownloads = Object.values(progress).filter(
    (d) => d.status === 'Downloading' || d.status === 'Connecting',
  );

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>🎮</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#00bcd4' }}>RGSX</span>
        <span style={{ fontSize: 12, opacity: 0.7 }}>{matchedPlatform.platform_name}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, opacity: 0.6 }}>
          {matchedPlatform.games_count || games.length} games
        </span>
        {activeDownloads.length > 0 && (
          <span style={{ fontSize: 12, color: '#00bcd4' }}>
            ↓ {activeDownloads.length} downloading
          </span>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search in RGSX…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: '5px 10px',
          color: 'var(--color-text)',
          fontSize: 13,
          marginBottom: 8,
          boxSizing: 'border-box',
        }}
      />

      {/* Games list */}
      {loadingGames ? (
        <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>Loading games…</p>
      ) : (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>No games found</p>
          )}
          {filtered.map((game) => {
            const state = downloadStates[game.name] ?? 'idle';
            const progItem = Object.values(progress).find((d) => d.game_name === game.name);
            const pct = progItem?.progress_percent ?? 0;
            const owned = isOwned(game.name);
            const missing = !owned && isMissing(game.name);

            return (
              <div key={game.name}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 0',
                    borderBottom: state === 'downloading' ? 'none' : '1px solid var(--color-border)',
                    opacity: owned || state === 'done' ? 0.55 : 1,
                  }}
                >
                  {/* Status badge */}
                  {owned || state === 'done' ? (
                    <span title="Already in library" style={{ fontSize: 11, color: '#28a745', flexShrink: 0 }}>✓</span>
                  ) : missing ? (
                    <span title="Missing from your library" style={{ fontSize: 11, color: '#ffc107', flexShrink: 0 }}>●</span>
                  ) : (
                    <span style={{ width: 11, flexShrink: 0 }} />
                  )}

                  <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {game.name}
                  </span>

                  {game.size && (
                    <span style={{ fontSize: 11, opacity: 0.45, flexShrink: 0 }}>{game.size}</span>
                  )}

                  {state === 'downloading' && pct > 0 && (
                    <span style={{ fontSize: 11, color: '#00bcd4', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>
                      {pct.toFixed(0)}%
                    </span>
                  )}

                  {downloadErrors[game.name] && (
                    <span title={downloadErrors[game.name]} style={{ fontSize: 11, color: '#dc3545', flexShrink: 0 }}>✗</span>
                  )}

                  {!owned && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => handleDownload(game)}
                        disabled={state === 'pending' || state === 'downloading' || state === 'done'}
                        title={state === 'pending' ? 'Queued…' : state === 'downloading' ? 'Downloading…' : state === 'done' ? 'Done' : 'Download now'}
                        style={dlBtnStyle(state)}
                      >
                        {state === 'pending' ? '⏳' : state === 'downloading' ? '↓' : state === 'done' ? '✓' : '⬇'}
                      </button>
                      <button
                        onClick={() => handleQueue(game)}
                        disabled={state !== 'idle'}
                        title="Add to queue"
                        style={{ ...dlBtnStyle('idle'), borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {state === 'downloading' && (
                  <div style={{ height: 3, background: 'var(--color-border)', borderRadius: 2, marginBottom: 1 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: '#00bcd4',
                        borderRadius: 2,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 16 }}>🎮</span>
      <span style={{ fontWeight: 700, fontSize: 14, color: '#00bcd4' }}>RGSX</span>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid #00bcd4',
  borderRadius: 12,
  padding: '12px 16px',
  margin: '10px 20px',
  flexShrink: 0,
};

function dlBtnStyle(state: DownloadState): React.CSSProperties {
  const colors: Record<DownloadState, string> = {
    idle: '#00bcd4',
    pending: '#ffc107',
    downloading: '#00bcd4',
    done: '#28a745',
    error: '#dc3545',
  };
  const color = colors[state];
  return {
    background: 'transparent',
    border: `1px solid ${color}`,
    borderRadius: 6,
    color,
    padding: '2px 8px',
    fontSize: 12,
    cursor: state === 'idle' ? 'pointer' : 'default',
    opacity: state === 'pending' ? 0.8 : 1,
    minWidth: 28,
    textAlign: 'center',
  };
}
