import { useState, useEffect, useCallback, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { useUiStore } from '../stores/uiStore';
import { useLibraryStore } from '../stores/libraryStore';
import { api } from '../lib/invoke';
import type { PcImportGame, PcGameSource, PcLibraryStatus } from '../types';
import { STORE_LOGOS } from '../assets/store-logos';

// ── Thumbnail with loading skeleton ──────────────────────────────────

function GameThumbnail({ url }: { url?: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    url ? 'loading' : 'error'
  );
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!url) { setStatus('error'); return; }
    setStatus('loading');
    // Handle images already in the browser cache — onLoad won't fire again
    if (imgRef.current?.complete && (imgRef.current.naturalWidth ?? 0) > 0) {
      setStatus('loaded');
    }
  }, [url]);

  const BOX: React.CSSProperties = {
    width: 30,
    height: 42,
    borderRadius: 4,
    flexShrink: 0,
    overflow: 'hidden',
    position: 'relative',
  };

  if (!url || status === 'error') {
    return (
      <div
        style={{
          ...BOX,
          background: 'rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          color: 'rgba(255,255,255,0.2)',
        }}
      >
        🎮
      </div>
    );
  }

  return (
    <div style={BOX}>
      {status === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.05) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }}
        />
      )}
      <img
        ref={imgRef}
        src={url}
        alt=""
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          // Use opacity so the browser still loads the image and fires onLoad
          opacity: status === 'loaded' ? 1 : 0,
          transition: 'opacity 0.25s',
        }}
      />
    </div>
  );
}

// ── Store logo badge ────────────────────────────────────────────────

function StoreLogo({ id, size = 16 }: { id: string; size?: number }) {
  const src = STORE_LOGOS[id];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={id}
      width={size}
      height={size}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, opacity: 0.9 }}
    />
  );
}

type Tab = PcGameSource;

const SOURCES: { id: Tab; label: string }[] = [
  { id: 'steam',  label: 'Steam'          },
  { id: 'epic',   label: 'Epic Games'     },
  { id: 'ea',     label: 'EA App'         },
  { id: 'gog',    label: 'GOG Galaxy'     },
  { id: 'xbox',   label: 'Xbox Game Pass' },
  { id: 'manual', label: 'Manual'         },
];

const card: React.CSSProperties = {
  background: 'var(--color-surface-2, #1a1a2e)',
  border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
  borderRadius: 10,
  padding: '16px 20px',
};

const btn: React.CSSProperties = {
  background: 'var(--color-primary, #107c10)',
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  padding: '8px 18px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};

const btnSecondary: React.CSSProperties = {
  background: 'var(--color-surface-2, #2a2a3e)',
  border: '1px solid var(--color-border, rgba(255,255,255,0.15))',
  borderRadius: 8,
  color: 'var(--color-text, #fff)',
  padding: '8px 14px',
  cursor: 'pointer',
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--color-surface-2, #1a1a2e)',
  border: '1px solid var(--color-border, rgba(255,255,255,0.15))',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--color-text, #fff)',
  outline: 'none',
};

export function PcGamesPage() {
  const { showToast, navigateTo } = useUiStore();
  const { loadSystems } = useLibraryStore();

  const [tab, setTab] = useState<Tab>('steam');
  const [libraryStatus, setLibraryStatus] = useState<PcLibraryStatus | null>(null);

  // SteamGridDB API key (loaded from config)
  const [sgdbKey, setSgdbKey] = useState('');
  // Steam Web API credentials (REQ-024)
  const [steamId, setSteamId] = useState('');
  const [steamApiKey, setSteamApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  // Import results per source
  const [results, setResults] = useState<Partial<Record<Tab, PcImportGame[]>>>({});
  const [scanning, setScanning] = useState<Partial<Record<Tab, boolean>>>({});
  const [selected, setSelected] = useState<Partial<Record<Tab, Set<string>>>>({});

  // Manual form
  const [manualTitle, setManualTitle] = useState('');
  const [manualExe, setManualExe] = useState('');
  const [manualDev, setManualDev] = useState('');
  const [manualPub, setManualPub] = useState('');
  const [manualYear, setManualYear] = useState('');
  const [manualGenre, setManualGenre] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  useEffect(() => {
    api.detectPcLibs().then(setLibraryStatus).catch(() => {});
    // Load stored API keys and Steam credentials from app config
    api.getConfig().then((cfg) => {
      if (cfg.general.steamgriddb_api_key) setSgdbKey(cfg.general.steamgriddb_api_key);
      if (cfg.general.steam_id) setSteamId(cfg.general.steam_id);
      if (cfg.general.steam_api_key) setSteamApiKey(cfg.general.steam_api_key);
    }).catch(() => {});
  }, []);

  const saveApiKey = async () => {
    setSavingKey(true);
    try {
      const cfg = await api.getConfig();
      cfg.general.steamgriddb_api_key = sgdbKey.trim() || undefined;
      cfg.general.steam_id = steamId.trim() || undefined;
      cfg.general.steam_api_key = steamApiKey.trim() || undefined;
      await api.setConfig(cfg);
      showToast('Settings saved', 'success');
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setSavingKey(false);
    }
  };

  const scan = useCallback(async (source: Tab, forceRefresh = false) => {
    setScanning((s) => ({ ...s, [source]: true }));
    try {
      const key = sgdbKey.trim() || undefined;
      let games: PcImportGame[] = [];
      if (source === 'steam') {
        games = await api.importSteamGames(
          key,
          steamId.trim() || undefined,
          steamApiKey.trim() || undefined,
          forceRefresh,
        );
      } else if (source === 'epic') {
        games = await api.importEpicGames(key, forceRefresh);
      } else if (source === 'ea') {
        games = await api.importEaGames(key);
      } else if (source === 'gog') {
        games = await api.importGogGames(key, forceRefresh);
      } else if (source === 'xbox') {
        games = await api.importXboxGames(key, forceRefresh);
      }

      setResults((r) => ({ ...r, [source]: games }));
      // Select only installed games by default
      setSelected((s) => ({
        ...s,
        [source]: new Set(games.filter((g) => g.installed).map((g) => g.file_path)),
      }));
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setScanning((s) => ({ ...s, [source]: false }));
    }
  }, [showToast, sgdbKey, steamId, steamApiKey]);

  const toggleGame = (source: Tab, filePath: string) => {
    setSelected((s) => {
      const set = new Set(s[source] ?? []);
      if (set.has(filePath)) set.delete(filePath);
      else set.add(filePath);
      return { ...s, [source]: set };
    });
  };

  const selectAll = (source: Tab) => {
    const games = results[source] ?? [];
    setSelected((s) => ({ ...s, [source]: new Set(games.map((g) => g.file_path)) }));
  };

  const deselectAll = (source: Tab) => {
    setSelected((s) => ({ ...s, [source]: new Set() }));
  };

  const importSelected = async (source: Tab) => {
    const games = results[source] ?? [];
    const sel = selected[source] ?? new Set();
    // Only import installed games (uninstalled games can't be launched locally)
    const toImport = games.filter((g) => sel.has(g.file_path) && g.installed);
    if (toImport.length === 0) return;

    try {
      const count = await api.savePcGames(toImport);
      showToast(`${count} games imported from ${source}`, 'success');
      await loadSystems();
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const browseExe = async () => {
    try {
      const file = await open({
        multiple: false,
        filters: [{ name: 'Executable', extensions: ['exe', 'lnk'] }],
      });
      if (file && typeof file === 'string') {
        setManualExe(file);
        if (!manualTitle) {
          const name = file.split('\\').pop()?.replace(/\.(exe|lnk)$/i, '') ?? '';
          setManualTitle(name);
        }
      }
    } catch { /* cancelled */ }
  };

  const handleManualAdd = async () => {
    if (!manualTitle.trim() || !manualExe.trim()) {
      showToast('Title and executable path are required', 'error');
      return;
    }
    setManualSaving(true);
    try {
      await api.addPcGame(
        manualTitle.trim(),
        manualExe.trim(),
        undefined,
        manualDev.trim() || undefined,
        manualPub.trim() || undefined,
        manualYear.trim() || undefined,
        manualGenre.trim() || undefined,
      );
      showToast(`"${manualTitle}" added`, 'success');
      await loadSystems();
      setManualTitle(''); setManualExe('');
      setManualDev(''); setManualPub('');
      setManualYear(''); setManualGenre('');
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setManualSaving(false);
    }
  };

  const sourceAvailable = (src: Tab): boolean => {
    if (!libraryStatus) return true;
    if (src === 'steam') return libraryStatus.steam_found;
    if (src === 'epic') return libraryStatus.epic_found;
    if (src === 'ea') return libraryStatus.ea_found;
    if (src === 'gog') return libraryStatus.gog_found;
    if (src === 'xbox') return libraryStatus.xbox_found;
    return true;
  };

  return (
    <div
      style={{
        height: '100%',
        background: 'var(--color-bg, #0a000a)',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 20px',
          background: 'rgba(0,0,0,0.5)',
          borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.1))',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <button onClick={() => navigateTo('settings')} style={btnSecondary}>
          ← Back
        </button>
        <span style={{ color: 'var(--color-text, #fff)', fontWeight: 700, fontSize: 16 }}>
          🖥️ PC Games
        </span>
        {/* Library status chips */}
        {libraryStatus && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {SOURCES.filter((s) => s.id !== 'manual').map((s) => (
              <span
                key={s.id}
                style={{
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: sourceAvailable(s.id)
                    ? 'rgba(16,124,16,0.25)'
                    : 'rgba(255,255,255,0.06)',
                  color: sourceAvailable(s.id) ? '#52b043' : 'rgba(255,255,255,0.3)',
                  border: `1px solid ${sourceAvailable(s.id) ? 'rgba(16,124,16,0.4)' : 'transparent'}`,
                }}
              >
                <StoreLogo id={s.id} size={12} />{' '}{s.label} {sourceAvailable(s.id) ? '✓' : '✗'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* API Keys / Steam credentials bar */}
      <div
        style={{
          padding: '8px 20px',
          background: 'rgba(0,0,0,0.35)',
          borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {/* SteamGridDB key */}
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, whiteSpace: 'nowrap' }}>
          🎨 SGDB Key
        </span>
        <input
          type="password"
          value={sgdbKey}
          onChange={(e) => setSgdbKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveApiKey(); }}
          placeholder="SteamGridDB API key (optional)"
          style={{ ...inputStyle, width: 220, flex: 'none', fontSize: 12, padding: '5px 10px' }}
        />
        {/* Steam credentials (REQ-024) */}
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, whiteSpace: 'nowrap', marginLeft: 8 }}>
          🎮 Steam ID
        </span>
        <input
          type="text"
          value={steamId}
          onChange={(e) => setSteamId(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveApiKey(); }}
          placeholder="Steam ID or vanity URL"
          style={{ ...inputStyle, width: 180, flex: 'none', fontSize: 12, padding: '5px 10px' }}
        />
        <input
          type="password"
          value={steamApiKey}
          onChange={(e) => setSteamApiKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveApiKey(); }}
          placeholder="Steam Web API Key"
          style={{ ...inputStyle, width: 190, flex: 'none', fontSize: 12, padding: '5px 10px' }}
        />
        <button
          onClick={saveApiKey}
          style={{ ...btnSecondary, fontSize: 12, padding: '5px 12px', opacity: savingKey ? 0.5 : 1 }}
          disabled={savingKey}
        >
          {savingKey ? 'Saving…' : 'Save'}
        </button>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, whiteSpace: 'nowrap' }}>
          Steam cloud lib requires API key
        </span>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '8px 20px 0',
          background: 'rgba(0,0,0,0.3)',
          borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
          flexShrink: 0,
        }}
      >
        {SOURCES.map((s) => (
          <button
            key={s.id}
            onClick={() => setTab(s.id)}
            style={{
              background: tab === s.id ? 'var(--color-primary, #107c10)' : 'transparent',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              color: tab === s.id ? '#fff' : 'rgba(255,255,255,0.5)',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: tab === s.id ? 700 : 400,
              opacity: s.id !== 'manual' && !sourceAvailable(s.id) ? 0.4 : 1,
            }}
          >
            {s.id !== 'manual'
              ? <><StoreLogo id={s.id} size={14} />{' '}{s.label}</>
              : <>➕ {s.label}</>
            }
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {tab === 'manual' ? (
          <ManualAddForm
            title={manualTitle} setTitle={setManualTitle}
            exe={manualExe} setExe={setManualExe}
            dev={manualDev} setDev={setManualDev}
            pub={manualPub} setPub={setManualPub}
            year={manualYear} setYear={setManualYear}
            genre={manualGenre} setGenre={setManualGenre}
            onBrowse={browseExe}
            onAdd={handleManualAdd}
            saving={manualSaving}
          />
        ) : (
          <ImportTab
            source={tab}
            available={sourceAvailable(tab)}
            games={results[tab]}
            selected={selected[tab] ?? new Set()}
            scanning={!!scanning[tab]}
            onScan={() => scan(tab)}
            onRefresh={() => scan(tab, true)}
            onToggle={(fp) => toggleGame(tab, fp)}
            onSelectAll={() => selectAll(tab)}
            onDeselectAll={() => deselectAll(tab)}
            onImport={() => importSelected(tab)}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function ImportTab({
  source, available, games, selected, scanning,
  onScan, onRefresh, onToggle, onSelectAll, onDeselectAll, onImport,
}: {
  source: Tab;
  available: boolean;
  games?: PcImportGame[];
  selected: Set<string>;
  scanning: boolean;
  onScan: () => void;
  onRefresh: () => void;
  onToggle: (fp: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onImport: () => void;
}) {
  if (!available) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        <p>
          {source === 'steam' && 'Steam not detected on this system.'}
          {source === 'epic' && 'Epic Games Launcher not detected on this system.'}
          {source === 'ea' && 'EA App not detected on this system.'}
          {source === 'gog' && 'GOG Galaxy not detected on this system.'}
        </p>
      </div>
    );
  }

  const selectedCount = selected.size;
  const totalCount = games?.length ?? 0;
  const installedCount = games?.filter((g) => g.installed).length ?? 0;
  const uninstalledCount = totalCount - installedCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Scan button */}
      {!games && (
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            Click Scan to discover installed games from {source.charAt(0).toUpperCase() + source.slice(1)}.
          </div>
          <button onClick={onScan} style={btn} disabled={scanning}>
            {scanning ? 'Scanning…' : '🔍 Scan'}
          </button>
        </div>
      )}

      {games && (
        <>
          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              {totalCount} games
              {uninstalledCount > 0 && (
                <> · <span style={{ color: 'rgba(255,255,255,0.3)' }}>{uninstalledCount} not installed</span></>
              )}
              {' '}· {selectedCount} selected
            </span>
            <button onClick={onSelectAll} style={btnSecondary}>Select All</button>
            <button onClick={onDeselectAll} style={btnSecondary}>Deselect All</button>
            <button onClick={onScan} style={btnSecondary} disabled={scanning}>
              {scanning ? 'Scanning…' : '🔄 Rescan'}
            </button>
            <button onClick={onRefresh} style={btnSecondary} disabled={scanning} title="Force-refresh from cloud API">
              {scanning ? '…' : '☁ Refresh library'}
            </button>
            <button
              onClick={onImport}
              style={{ ...btn, marginLeft: 'auto', opacity: selectedCount === 0 ? 0.4 : 1 }}
              disabled={selectedCount === 0}
            >
              ⬇ Import {selectedCount > 0 ? `(${selectedCount})` : ''}
            </button>
          </div>

          {/* Game list */}
          {totalCount === 0 ? (
            <div style={{ ...card, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 30 }}>
              No games found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {games.map((g) => (
                <div
                  key={g.file_path}
                  onClick={() => {
                    if (g.installed) {
                      onToggle(g.file_path);
                    } else {
                      // Open the store page / install URL for uninstalled games
                      openUrl(g.file_path).catch(() => {});
                    }
                  }}
                  title={g.installed ? undefined : `Click to open install page in ${g.source}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: g.installed && selected.has(g.file_path)
                      ? 'rgba(16,124,16,0.15)'
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${g.installed && selected.has(g.file_path) ? 'rgba(16,124,16,0.4)' : 'transparent'}`,
                    transition: 'background 0.15s',
                    opacity: g.installed ? 1 : 0.65,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={g.installed && selected.has(g.file_path)}
                    disabled={!g.installed}
                    onChange={() => g.installed && onToggle(g.file_path)}
                    style={{
                      accentColor: '#107c10',
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      cursor: g.installed ? 'pointer' : 'not-allowed',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {/* Box art thumbnail */}
                  <GameThumbnail url={g.box_art} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: 'var(--color-text, #fff)',
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {g.title}
                      {/* Installed / Not installed badge */}
                      {g.installed ? (
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase' as const,
                          background: 'rgba(16,124,16,0.2)',
                          color: '#4ece4e',
                          flexShrink: 0,
                        }}>
                          Installed
                        </span>
                      ) : (
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase' as const,
                          background: 'rgba(255,255,255,0.07)',
                          color: 'rgba(255,255,255,0.4)',
                          flexShrink: 0,
                        }}>
                          Not installed
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: 11,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <StoreLogo id={g.source} size={11} />
                      {g.install_path ?? g.file_path}
                    </div>
                  </div>
                  {g.file_size > 0 && (
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, flexShrink: 0 }}>
                      {formatSize(g.file_size)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ManualAddForm({
  title, setTitle, exe, setExe,
  dev, setDev, pub: pub_, setPub,
  year, setYear, genre, setGenre,
  onBrowse, onAdd, saving,
}: {
  title: string; setTitle: (v: string) => void;
  exe: string; setExe: (v: string) => void;
  dev: string; setDev: (v: string) => void;
  pub: string; setPub: (v: string) => void;
  year: string; setYear: (v: string) => void;
  genre: string; setGenre: (v: string) => void;
  onBrowse: () => void;
  onAdd: () => void;
  saving: boolean;
}) {
  return (
    <div style={{ ...card, maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ color: 'var(--color-text, #fff)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
        Add PC Game Manually
      </div>

      <Field label="Title *">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Game title"
          style={inputStyle}
        />
      </Field>

      <Field label="Executable *">
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          <input
            value={exe}
            onChange={(e) => setExe(e.target.value)}
            placeholder="C:\Games\MyGame\game.exe"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={onBrowse} style={btnSecondary}>Browse…</button>
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Developer">
          <input value={dev} onChange={(e) => setDev(e.target.value)} placeholder="e.g. Valve" style={inputStyle} />
        </Field>
        <Field label="Publisher">
          <input value={pub_} onChange={(e) => setPub(e.target.value)} placeholder="e.g. EA" style={inputStyle} />
        </Field>
        <Field label="Year">
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" style={inputStyle} />
        </Field>
        <Field label="Genre">
          <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. FPS" style={inputStyle} />
        </Field>
      </div>

      <button
        onClick={onAdd}
        style={{ ...btn, alignSelf: 'flex-start', opacity: saving ? 0.5 : 1 }}
        disabled={saving}
      >
        {saving ? 'Adding…' : '➕ Add Game'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}
