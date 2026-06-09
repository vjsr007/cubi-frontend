import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { api } from '../lib/invoke';
import { useUiStore } from '../stores/uiStore';
import { useConfigStore } from '../stores/configStore';
import { CatalogSystemCard } from '../components/catalog/CatalogSystemCard';
import { CatalogGameList } from '../components/catalog/CatalogGameList';
import { SystemWikiPanel } from '../components/wiki/SystemWikiPanel';
import type { CatalogSystemStats, CatalogGame, CatalogConfig, RgsxDownloadItem } from '../types';

type StatusFilter = 'all' | 'owned' | 'missing' | 'rgsx';
type RgsxDlState = 'idle' | 'pending' | 'downloading' | 'done' | 'error';

const SYSTEM_NAMES: Record<string, string> = {
  nes: 'NES', snes: 'Super Nintendo', n64: 'Nintendo 64',
  gb: 'Game Boy', gbc: 'Game Boy Color', gba: 'Game Boy Advance',
  nds: 'Nintendo DS', fds: 'Famicom Disk System',
  gamecube: 'GameCube', wii: 'Wii', wiiu: 'Wii U', switch: 'Nintendo Switch', '3ds': 'Nintendo 3DS',
  genesis: 'Sega Genesis', megadrive: 'Mega Drive',
  mastersystem: 'Sega Master System', gamegear: 'Game Gear',
  saturn: 'Sega Saturn', dreamcast: 'Sega Dreamcast', sg1000: 'SG-1000',
  ps1: 'PlayStation', ps2: 'PlayStation 2', ps3: 'PlayStation 3', ps4: 'PlayStation 4',
  psp: 'PSP', psvita: 'PS Vita', xbox: 'Xbox', xbox360: 'Xbox 360',
  atari2600: 'Atari 2600', atari5200: 'Atari 5200', atari7800: 'Atari 7800',
  atarilynx: 'Atari Lynx', atarist: 'Atari ST', atarijaguar: 'Atari Jaguar',
  pcengine: 'PC Engine / TurboGrafx-16', ngpc: 'Neo Geo Pocket Color',
  neogeo: 'Neo Geo', arcade: 'Arcade (MAME)', fbneo: 'FinalBurn Neo',
  cps1: 'CPS-1', cps2: 'CPS-2', cps3: 'CPS-3',
  wswan: 'WonderSwan', wswanc: 'WonderSwan Color',
  colecovision: 'ColecoVision', intellivision: 'Intellivision',
  msx: 'MSX', c64: 'Commodore 64', amiga: 'Amiga',
  satellaview: 'Satellaview', scummvm: 'ScummVM', '3do': '3DO',
};

const RGSX_ALIASES: Record<string, string[]> = {
  genesis: ['megadrive', 'genesis', 'md'],
  megadrive: ['megadrive', 'genesis', 'md'],
  ps1: ['psx', 'ps1', 'playstation'],
  ps2: ['ps2', 'playstation2'],
  psp: ['psp'],
  psvita: ['psvita', 'vita'],
  pcengine: ['pcengine', 'tg16', 'turbografx'],
  atarijaguar: ['atarijaguar', 'jaguar'],
  atarilynx: ['atarilynx', 'lynx'],
  '3do': ['3do'],
  fbneo: ['fbneo', 'finalburn'],
  neogeo: ['neogeo', 'ng'],
};

const normalizeTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Strict match: exact normalized, or substring only when shorter ≥ 80% of longer (avoids Beta/variant false positives)
function rgsxTitleMatch(catalogTitle: string, map: Map<string, string>): string | undefined {
  const nt = normalizeTitle(catalogTitle);
  if (map.has(nt)) return map.get(nt);
  for (const [nk, original] of map) {
    if (nt.length < 4 || nk.length < 4) continue;
    const shorter = nt.length <= nk.length ? nt : nk;
    const longer  = nt.length <= nk.length ? nk : nt;
    if (shorter.length / longer.length >= 0.92 && longer.includes(shorter)) return original;
  }
  return undefined;
}
function hasRgsxMatch(title: string, map: Map<string, string>): boolean {
  return rgsxTitleMatch(title, map) !== undefined;
}

function systemDisplayName(id: string): string {
  return SYSTEM_NAMES[id] ?? id;
}

export function CatalogPage() {
  const { navigateTo, showToast } = useUiStore();
  const { config } = useConfigStore();
  const rgsxDeviceUrl = config?.general?.rgsx_device_url ?? null;

  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [stats, setStats] = useState<CatalogSystemStats[]>([]);
  const [catalogConfig, setCatalogConfig] = useState<CatalogConfig | null>(null);
  const [defaultUrls, setDefaultUrls] = useState<Record<string, string>>({});

  const [games, setGames] = useState<CatalogGame[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; currentSystem: string } | null>(null);
  const autoSyncTriggered = useRef(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [wikiSystemId, setWikiSystemId] = useState<string | null>(null);

  // RGSX inline state
  const [rgsxPlatformName, setRgsxPlatformName] = useState<string | null>(null);
  // normalized title → original RGSX game name
  const [rgsxGameMap, setRgsxGameMap] = useState<Map<string, string>>(new Map());
  const [rgsxDlStates, setRgsxDlStates] = useState<Record<string, RgsxDlState>>({});
  const [rgsxProgress, setRgsxProgress] = useState<Record<string, RgsxDownloadItem>>({});
  const rgsxPollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const PAGE_SIZE = 50;

  const loadStats = useCallback(async () => {
    try {
      const [s, cfg, urls] = await Promise.all([
        api.getCatalogStats(),
        api.getCatalogConfig(),
        api.getDefaultDatUrls(),
      ]);
      setStats(s);
      setCatalogConfig(cfg);
      setDefaultUrls(urls);
      return { stats: s, urls };
    } catch (e) {
      console.error('Failed to load catalog stats:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    loadStats().then((result) => {
      setInitialLoadDone(true);
      if (result && result.stats.length === 0 && Object.keys(result.urls).length > 0 && !autoSyncTriggered.current) {
        autoSyncTriggered.current = true;
        setTimeout(() => handleSyncAllWithProgress(Object.keys(result.urls)), 500);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGames = useCallback(async () => {
    if (!selectedSystem) return;
    setLoading(true);
    try {
      const isRgsx = statusFilter === 'rgsx';
      const result = await api.getCatalogGames({
        system_id: selectedSystem,
        status: isRgsx ? 'missing' : statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        page: isRgsx ? 1 : page,
        page_size: isRgsx ? 5000 : PAGE_SIZE,
      });
      setGames(result.games);
      setTotal(result.total);
    } catch (e) {
      console.error('Failed to load catalog games:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedSystem, statusFilter, search, page]);

  useEffect(() => { loadGames(); }, [loadGames]);

  // Fetch RGSX platform + games whenever system changes
  useEffect(() => {
    if (!rgsxDeviceUrl || !selectedSystem) {
      setRgsxPlatformName(null);
      setRgsxGameMap(new Map());
      setRgsxDlStates({});
      return;
    }
    const sid = selectedSystem.toLowerCase();
    const sname = systemDisplayName(selectedSystem).toLowerCase();
    const aliases = RGSX_ALIASES[sid] ?? [sid];

    api.rgsxGetPlatforms(rgsxDeviceUrl)
      .then((platforms) => {
        let match = platforms.find((p) => aliases.includes(p.folder.toLowerCase()));
        if (!match) match = platforms.find((p) => p.platform_name.toLowerCase().includes(sname));
        if (!match) match = platforms.find((p) =>
          p.platform_name.toLowerCase().split(/[\s/,]+/).some((w) => w.length > 3 && sname.includes(w))
        );
        if (!match) { setRgsxPlatformName(null); setRgsxGameMap(new Map()); return; }

        setRgsxPlatformName(match.platform_name);
        setRgsxDlStates({});

        api.rgsxGetGames(rgsxDeviceUrl, match.platform_name)
          .then((rgames) => {
            const map = new Map<string, string>();
            for (const g of rgames) map.set(normalizeTitle(g.name), g.name);
            setRgsxGameMap(map);
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, [selectedSystem, rgsxDeviceUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const pollRgsxProgress = useCallback(async () => {
    if (!rgsxDeviceUrl) return;
    try {
      const p = await api.rgsxGetProgress(rgsxDeviceUrl);
      setRgsxProgress(p.downloads);
      // Auto-advance states based on server response
      setRgsxDlStates((prev) => {
        const next = { ...prev };
        for (const [, item] of Object.entries(p.downloads)) {
          const key = item.game_name ?? '';
          if (!key) continue;
          if (item.status === 'Completed') next[key] = 'done';
          else if (item.status === 'Error') next[key] = 'error';
          else if (item.status === 'Downloading' || item.status === 'Connecting') next[key] = 'downloading';
        }
        return next;
      });
    } catch { /* ignore poll errors */ }
  }, [rgsxDeviceUrl]);

  // Start/stop polling while any download is active
  useEffect(() => {
    const hasActive = Object.values(rgsxDlStates).some((s) => s === 'pending' || s === 'downloading');
    if (hasActive && !rgsxPollTimer.current) {
      rgsxPollTimer.current = setInterval(pollRgsxProgress, 2000);
    }
    if (!hasActive && rgsxPollTimer.current) {
      clearInterval(rgsxPollTimer.current);
      rgsxPollTimer.current = null;
    }
    return () => { if (rgsxPollTimer.current) { clearInterval(rgsxPollTimer.current); rgsxPollTimer.current = null; } };
  }, [rgsxDlStates, pollRgsxProgress]);

  const handleRgsxDownload = useCallback(async (rgsxGameName: string) => {
    if (!rgsxDeviceUrl || !rgsxPlatformName) return;
    setRgsxDlStates((s) => ({ ...s, [rgsxGameName]: 'pending' }));
    try {
      const result = await api.rgsxDownloadGame(rgsxDeviceUrl, rgsxPlatformName, rgsxGameName, false);
      setRgsxDlStates((s) => ({ ...s, [rgsxGameName]: result.success ? 'downloading' : 'error' }));
      if (result.success) pollRgsxProgress();
    } catch {
      setRgsxDlStates((s) => ({ ...s, [rgsxGameName]: 'error' }));
    }
  }, [rgsxDeviceUrl, rgsxPlatformName, pollRgsxProgress]);

  // Handlers
  const handleImportDat = async () => {
    if (!selectedSystem) return;
    try {
      const { open: openDialog } = await import('@tauri-apps/plugin-dialog');
      const filePath = await openDialog({
        title: 'Select DAT file',
        filters: [{ name: 'DAT files', extensions: ['dat', 'xml'] }],
      });
      if (!filePath) return;
      setImporting(true);
      const sync = await api.importDatFile(selectedSystem, filePath as string);
      showToast(`Imported ${sync.entry_count} entries from ${sync.dat_name}`, 'success');
      await loadStats();
      await loadGames();
    } catch (e) {
      showToast(`Import failed: ${e}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleSyncSystem = async (systemId: string) => {
    setSyncing(systemId);
    try {
      const sync = await api.syncCatalog(systemId);
      showToast(`Synced ${sync.entry_count} entries for ${sync.dat_name}`, 'success');
      await loadStats();
      if (selectedSystem === systemId) await loadGames();
    } catch (e) {
      showToast(`Sync failed: ${e}`, 'error');
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAllWithProgress = async (systemIds: string[]) => {
    if (systemIds.length === 0) {
      showToast('No download URLs configured.', 'error');
      return;
    }
    setSyncing('all');
    let synced = 0, failed = 0;
    for (let i = 0; i < systemIds.length; i++) {
      const sid = systemIds[i];
      setSyncProgress({ current: i + 1, total: systemIds.length, currentSystem: systemDisplayName(sid) });
      try {
        await api.syncCatalog(sid);
        synced++;
        await loadStats();
      } catch (e) {
        console.warn(`Sync failed for ${sid}:`, e);
        failed++;
      }
    }
    setSyncProgress(null);
    showToast(`Synced ${synced} systems${failed > 0 ? `, ${failed} failed` : ''}`, synced > 0 ? 'success' : 'error');
    await loadStats();
    setSyncing(null);
  };

  const handleSyncAll = async () => {
    const systemIds = Object.keys({ ...defaultUrls, ...catalogConfig?.download_urls });
    await handleSyncAllWithProgress(systemIds);
  };

  const handleRefreshOwnership = async () => {
    try {
      const count = await api.refreshCatalogOwnership(selectedSystem ?? undefined);
      showToast(`Ownership refreshed: ${count} matches`, 'success');
      await loadStats();
      if (selectedSystem) await loadGames();
    } catch (e) {
      showToast(`Refresh failed: ${e}`, 'error');
    }
  };

  const handleDownload = async (url: string) => {
    try { await open(url); } catch (e) { console.error('Failed to open URL:', e); }
  };

  const handleViewGame = (gameId: string) => navigateTo('game-detail', gameId);

  const handleSetDownloadUrl = async () => {
    if (!selectedSystem) return;
    const url = prompt('Enter download base URL for this system:',
      catalogConfig?.download_urls[selectedSystem] ?? '');
    if (url === null) return;
    try {
      await api.setCatalogDownloadUrl(selectedSystem, url);
      setCatalogConfig(await api.getCatalogConfig());
    } catch (e) {
      console.error('Failed to set URL:', e);
    }
  };

  const currentStats = stats.find((s) => s.system_id === selectedSystem);
  const downloadBaseUrl = catalogConfig?.download_urls[selectedSystem ?? ''];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const allSystems: CatalogSystemStats[] = useMemo(() => {
    const statsMap = new Map(stats.map((s) => [s.system_id, s]));
    const allUrls = { ...defaultUrls, ...catalogConfig?.download_urls };
    for (const sid of Object.keys(allUrls)) {
      if (!statsMap.has(sid)) {
        statsMap.set(sid, {
          system_id: sid,
          system_name: systemDisplayName(sid),
          total: 0, owned: 0, missing: 0, last_synced: undefined,
        });
      }
    }
    return [...statsMap.values()].sort((a, b) => {
      if (a.total > 0 && b.total === 0) return -1;
      if (a.total === 0 && b.total > 0) return 1;
      return a.system_name.localeCompare(b.system_name);
    });
  }, [stats, defaultUrls, catalogConfig]);

  const selectedSystemInfo: CatalogSystemStats | undefined =
    currentStats ?? allSystems.find((s) => s.system_id === selectedSystem);

  // When RGSX filter is active, filter client-side by what's available in RGSX
  const displayedGames = useMemo(() => {
    if (statusFilter !== 'rgsx' || rgsxGameMap.size === 0) return games;
    return games.filter((g) => !g.owned && hasRgsxMatch(g.title, rgsxGameMap));
  }, [games, statusFilter, rgsxGameMap]);

  const WikiModal = () => wikiSystemId ? (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={() => setWikiSystemId(null)}
    >
      <div
        style={{ width: '90%', maxWidth: 800, maxHeight: '90%', borderRadius: 16, overflow: 'auto', background: 'var(--color-background)', border: '1px solid var(--color-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <SystemWikiPanel systemId={wikiSystemId} systemName={systemDisplayName(wikiSystemId)} onClose={() => setWikiSystemId(null)} />
      </div>
    </div>
  ) : null;

  // ── System Detail View ────────────────────────────────────────────
  if (selectedSystem && selectedSystemInfo) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--color-text)' }}>
        {/* Toolbar */}
        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
          <button
            onClick={() => { setSelectedSystem(null); setPage(1); setSearch(''); setStatusFilter('all'); }}
            style={btnStyle}
          >
            ← Back
          </button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{selectedSystemInfo.system_name}</span>
          {selectedSystemInfo.total > 0 && (
            <span style={{ opacity: 0.6, fontSize: 13 }}>
              ({selectedSystemInfo.owned}/{selectedSystemInfo.total} owned)
            </span>
          )}
          {/* RGSX indicator — inline chip, no separate panel */}
          {rgsxPlatformName && (
            <span style={{ fontSize: 11, color: '#00bcd4', border: '1px solid rgba(0,188,212,0.4)', borderRadius: 6, padding: '3px 8px', background: 'rgba(0,188,212,0.08)' }}>
              🎮 RGSX · {rgsxGameMap.size > 0 ? `${rgsxGameMap.size} games` : '…'}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => handleSyncSystem(selectedSystem)} disabled={syncing === selectedSystem} style={btnStyle}>
            {syncing === selectedSystem ? 'Syncing…' : '☁ Sync'}
          </button>
          <button onClick={handleImportDat} disabled={importing} style={btnStyle}>
            {importing ? 'Importing…' : '📥 Import DAT'}
          </button>
          <button onClick={handleRefreshOwnership} style={btnStyle}>🔄 Refresh</button>
          <button onClick={handleSetDownloadUrl} style={btnStyle}>⚙ URL</button>
          {rgsxDeviceUrl && (
            <button onClick={() => open(rgsxDeviceUrl)} style={{ ...btnStyle, borderColor: '#00bcd4', color: '#00bcd4' }} title="Open RGSX web interface">
              🎮 RGSX Web
            </button>
          )}
          <button onClick={() => setWikiSystemId(selectedSystem)} style={btnStyle}>ℹ Wiki</button>
        </div>

        {/* Filters */}
        <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <input
            type="text"
            placeholder="🔍 Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 12px', color: 'var(--color-text)', fontSize: 13, width: 240 }}
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 12px', color: 'var(--color-text)', fontSize: 13 }}
          >
            <option value="all">All</option>
            <option value="owned">Owned</option>
            <option value="missing">Missing</option>
            {rgsxPlatformName && <option value="rgsx">⬇ RGSX</option>}
          </select>
          {statusFilter === 'rgsx' && rgsxGameMap.size > 0 && (
            <span style={{ fontSize: 12, color: '#00bcd4', opacity: 0.8 }}>
              {displayedGames.length} available
            </span>
          )}
          {statusFilter === 'rgsx' && rgsxGameMap.size === 0 && (
            <span style={{ fontSize: 12, opacity: 0.5 }}>Loading RGSX…</span>
          )}
        </div>

        {/* RGSX active downloads progress bar */}
        {Object.values(rgsxDlStates).some((s) => s === 'pending' || s === 'downloading') && (
          <div style={{ padding: '6px 20px', borderBottom: '1px solid var(--color-border)', background: 'rgba(0,188,212,0.06)', flexShrink: 0 }}>
            {Object.entries(rgsxDlStates)
              .filter(([, s]) => s === 'pending' || s === 'downloading' || s === 'done')
              .map(([name, state]) => {
                const item = Object.values(rgsxProgress).find((d) => d.game_name === name);
                const pct = item?.progress_percent ?? (state === 'done' ? 100 : 0);
                const dlMB = item ? (item.downloaded_size / 1_048_576).toFixed(1) : '0';
                const totMB = item && item.total_size > 0 ? (item.total_size / 1_048_576).toFixed(1) : null;
                return (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#00bcd4', flexShrink: 0, width: 12 }}>
                      {state === 'done' ? '✓' : state === 'pending' ? '⏳' : '↓'}
                    </span>
                    <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: state === 'done' ? 0.5 : 1 }}>
                      {name}
                    </span>
                    {totMB && (
                      <span style={{ fontSize: 11, opacity: 0.6, flexShrink: 0 }}>{dlMB}/{totMB} MB</span>
                    )}
                    <div style={{ width: 120, height: 4, background: 'var(--color-border)', borderRadius: 2, flexShrink: 0, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: state === 'done' ? '#28a745' : '#00bcd4',
                        borderRadius: 2,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#00bcd4', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>
                      {state === 'done' ? 'Done' : `${pct.toFixed(0)}%`}
                    </span>
                  </div>
                );
              })}
          </div>
        )}

        {/* Game list — RGSX buttons are inline inside each row */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', opacity: 0.5 }}>Loading…</div>
          ) : (
            <CatalogGameList
              games={displayedGames}
              downloadBaseUrl={downloadBaseUrl}
              rgsxGameMap={rgsxGameMap.size > 0 ? rgsxGameMap : undefined}
              rgsxDlStates={rgsxDlStates}
              onRgsxDownload={handleRgsxDownload}
              onViewGame={handleViewGame}
              onDownload={handleDownload}
            />
          )}
        </div>

        {/* Pagination — hidden when RGSX filter active (client-side filtered) */}
        {totalPages > 1 && statusFilter !== 'rgsx' && (
          <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderTop: '1px solid var(--color-border)', flexShrink: 0, fontSize: 13 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={btnStyle}>◄ Prev</button>
            <span style={{ opacity: 0.7 }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={btnStyle}>Next ►</button>
          </div>
        )}

        <WikiModal />
      </div>
    );
  }

  // ── System Overview ───────────────────────────────────────────────
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '24px 32px', color: 'var(--color-text)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📚 Game Catalog</h1>
        <div style={{ flex: 1 }} />
        {rgsxDeviceUrl && (
          <button onClick={() => open(rgsxDeviceUrl)} style={{ ...btnStyle, borderColor: '#00bcd4', color: '#00bcd4' }} title="Open RGSX web interface">
            🎮 RGSX
          </button>
        )}
        <button onClick={handleSyncAll} disabled={syncing === 'all'} style={btnStyle}>
          {syncing === 'all' ? 'Syncing All…' : '☁ Sync All'}
        </button>
        <button onClick={handleRefreshOwnership} style={{ ...btnStyle, marginLeft: 8 }}>🔄 Refresh Ownership</button>
      </div>

      {syncProgress && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary)', borderRadius: 12, padding: '16px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>☁️</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Syncing: {syncProgress.currentSystem}</span>
            <span style={{ opacity: 0.6, fontSize: 13, marginLeft: 'auto' }}>{syncProgress.current} / {syncProgress.total}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%`, borderRadius: 3, background: 'var(--color-primary)', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {!initialLoadDone ? (
        <div style={{ padding: 32, textAlign: 'center', opacity: 0.5 }}>Loading catalog…</div>
      ) : allSystems.length === 0 && !syncProgress ? (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <p style={{ opacity: 0.7, marginBottom: 16 }}>
            No catalog data yet. Click "Sync All" to download DAT files, or use "Import DAT" on a system.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {allSystems.map((s) => (
            <CatalogSystemCard
              key={s.system_id}
              stats={s}
              onClick={() => { setSelectedSystem(s.system_id); setPage(1); }}
              onShowWiki={() => setWikiSystemId(s.system_id)}
            />
          ))}
        </div>
      )}

      <WikiModal />
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '6px 14px',
  fontSize: 13,
  color: 'var(--color-text)',
  cursor: 'pointer',
};
