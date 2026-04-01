import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { api } from '../lib/invoke';
import { useUiStore } from '../stores/uiStore';
import { CatalogSystemCard } from '../components/catalog/CatalogSystemCard';
import { CatalogGameList } from '../components/catalog/CatalogGameList';
import { SystemWikiPanel } from '../components/wiki/SystemWikiPanel';
import type { CatalogSystemStats, CatalogGame, CatalogConfig } from '../types';

type StatusFilter = 'all' | 'owned' | 'missing';

/** Map system_id → display name (mirrors Rust system_display_name) */
const SYSTEM_NAMES: Record<string, string> = {
  nes: 'NES', snes: 'Super Nintendo', n64: 'Nintendo 64',
  gb: 'Game Boy', gbc: 'Game Boy Color', gba: 'Game Boy Advance',
  nds: 'Nintendo DS', fds: 'Famicom Disk System',
  gamecube: 'GameCube', wii: 'Wii', wiiu: 'Wii U', switch: 'Nintendo Switch', '3ds': 'Nintendo 3DS',
  genesis: 'Sega Genesis', megadrive: 'Mega Drive',
  mastersystem: 'Sega Master System', gamegear: 'Game Gear',
  saturn: 'Sega Saturn', dreamcast: 'Sega Dreamcast',
  sg1000: 'SG-1000',
  ps1: 'PlayStation', ps2: 'PlayStation 2', ps3: 'PlayStation 3', ps4: 'PlayStation 4',
  psp: 'PSP', psvita: 'PS Vita',
  xbox: 'Xbox', xbox360: 'Xbox 360',
  atari2600: 'Atari 2600', atari5200: 'Atari 5200',
  atari7800: 'Atari 7800', atarilynx: 'Atari Lynx',
  atarist: 'Atari ST', atarijaguar: 'Atari Jaguar',
  pcengine: 'PC Engine / TurboGrafx-16', ngpc: 'Neo Geo Pocket Color',
  neogeo: 'Neo Geo', arcade: 'Arcade (MAME)', fbneo: 'FinalBurn Neo',
  cps1: 'CPS-1', cps2: 'CPS-2', cps3: 'CPS-3',
  wswan: 'WonderSwan', wswanc: 'WonderSwan Color',
  colecovision: 'ColecoVision', intellivision: 'Intellivision',
  msx: 'MSX', c64: 'Commodore 64', amiga: 'Amiga',
  satellaview: 'Satellaview', scummvm: 'ScummVM', '3do': '3DO',
};
function systemDisplayName(id: string): string {
  return SYSTEM_NAMES[id] ?? id;
}

export function CatalogPage() {
  const { navigateTo, showToast } = useUiStore();

  // State: overview vs detail
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [stats, setStats] = useState<CatalogSystemStats[]>([]);
  const [catalogConfig, setCatalogConfig] = useState<CatalogConfig | null>(null);
  const [defaultUrls, setDefaultUrls] = useState<Record<string, string>>({});

  // Detail state
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null); // system_id being synced
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; currentSystem: string } | null>(null);
  const autoSyncTriggered = useRef(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [wikiSystemId, setWikiSystemId] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  // Load stats + config + default URLs
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

  // Initial load + auto-sync if catalog is empty
  useEffect(() => {
    loadStats().then((result) => {
      setInitialLoadDone(true);
      if (result && result.stats.length === 0 && Object.keys(result.urls).length > 0 && !autoSyncTriggered.current) {
        autoSyncTriggered.current = true;
        // Small delay so the user sees the empty state briefly
        setTimeout(() => {
          handleSyncAllWithProgress(Object.keys(result.urls));
        }, 500);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load games for selected system
  const loadGames = useCallback(async () => {
    if (!selectedSystem) return;
    setLoading(true);
    try {
      const result = await api.getCatalogGames({
        system_id: selectedSystem,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        page,
        page_size: PAGE_SIZE,
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
      showToast('No download URLs configured. Set URLs for systems first.', 'error');
      return;
    }
    setSyncing('all');
    let synced = 0;
    let failed = 0;
    for (let i = 0; i < systemIds.length; i++) {
      const sid = systemIds[i];
      setSyncProgress({ current: i + 1, total: systemIds.length, currentSystem: systemDisplayName(sid) });
      try {
        await api.syncCatalog(sid);
        synced++;
        // Refresh stats after each successful sync so cards update in real-time
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
    try {
      await open(url);
    } catch (e) {
      console.error('Failed to open URL:', e);
    }
  };

  const handleViewGame = (gameId: string) => {
    navigateTo('game-detail', gameId);
  };

  const handleSetDownloadUrl = async () => {
    if (!selectedSystem) return;
    const url = prompt('Enter download base URL for this system:',
      catalogConfig?.download_urls[selectedSystem] ?? '');
    if (url === null) return;
    try {
      await api.setCatalogDownloadUrl(selectedSystem, url);
      const cfg = await api.getCatalogConfig();
      setCatalogConfig(cfg);
    } catch (e) {
      console.error('Failed to set URL:', e);
    }
  };

  const currentStats = stats.find((s) => s.system_id === selectedSystem);
  const downloadBaseUrl = catalogConfig?.download_urls[selectedSystem ?? ''];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Merge stats with default URLs so unsync'd systems appear as clickable cards
  const allSystems: CatalogSystemStats[] = useMemo(() => {
    const statsMap = new Map(stats.map((s) => [s.system_id, s]));
    const allUrls = { ...defaultUrls, ...catalogConfig?.download_urls };
    for (const sid of Object.keys(allUrls)) {
      if (!statsMap.has(sid)) {
        statsMap.set(sid, {
          system_id: sid,
          system_name: systemDisplayName(sid),
          total: 0,
          owned: 0,
          missing: 0,
          last_synced: undefined,
        });
      }
    }
    // Sort: systems with data first, then by name
    return [...statsMap.values()].sort((a, b) => {
      if (a.total > 0 && b.total === 0) return -1;
      if (a.total === 0 && b.total > 0) return 1;
      return a.system_name.localeCompare(b.system_name);
    });
  }, [stats, defaultUrls, catalogConfig]);

  // Resolve display info for the selected system (from stats or placeholder)
  const selectedSystemInfo: CatalogSystemStats | undefined =
    currentStats ?? allSystems.find((s) => s.system_id === selectedSystem);

  // ── System Detail View ──────────────────────────────────────────
  if (selectedSystem && selectedSystemInfo) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--color-text)' }}>
        {/* Toolbar */}
        <div
          style={{
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            flexShrink: 0,
          }}
        >
          <button onClick={() => { setSelectedSystem(null); setPage(1); setSearch(''); setStatusFilter('all'); }} style={btnStyle}>
            ← Back
          </button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {selectedSystemInfo.system_name}
          </span>
          {selectedSystemInfo.total > 0 && (
            <span style={{ opacity: 0.6, fontSize: 13 }}>
              ({selectedSystemInfo.owned}/{selectedSystemInfo.total} owned)
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => handleSyncSystem(selectedSystem)}
            disabled={syncing === selectedSystem}
            style={btnStyle}
          >
            {syncing === selectedSystem ? 'Syncing…' : '☁ Sync'}
          </button>
          <button onClick={handleImportDat} disabled={importing} style={btnStyle}>
            {importing ? 'Importing…' : '📥 Import DAT'}
          </button>
          <button onClick={handleRefreshOwnership} style={btnStyle}>
            🔄 Refresh
          </button>
          <button onClick={handleSetDownloadUrl} style={btnStyle}>
            ⚙ URL
          </button>
          <button onClick={() => setWikiSystemId(selectedSystem)} style={btnStyle}>
            ℹ Wiki
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            placeholder="🔍 Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '6px 12px',
              color: 'var(--color-text)',
              fontSize: 13,
              width: 240,
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '6px 12px',
              color: 'var(--color-text)',
              fontSize: 13,
            }}
          >
            <option value="all">All</option>
            <option value="owned">Owned</option>
            <option value="missing">Missing</option>
          </select>
        </div>

        {/* Game List */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', opacity: 0.5 }}>Loading…</div>
          ) : (
            <CatalogGameList
              games={games}
              downloadBaseUrl={downloadBaseUrl}
              onViewGame={handleViewGame}
              onDownload={handleDownload}
            />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              borderTop: '1px solid var(--color-border)',
              flexShrink: 0,
              fontSize: 13,
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={btnStyle}
            >
              ◄ Prev
            </button>
            <span style={{ opacity: 0.7 }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={btnStyle}
            >
              Next ►
            </button>
          </div>
        )}

        {/* Wiki modal */}
        {wikiSystemId && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
            onClick={() => setWikiSystemId(null)}
          >
            <div
              style={{
                width: '90%', maxWidth: 800, maxHeight: '90%',
                borderRadius: 16, overflow: 'auto',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <SystemWikiPanel
                systemId={wikiSystemId}
                systemName={systemDisplayName(wikiSystemId)}
                onClose={() => setWikiSystemId(null)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── System Overview ─────────────────────────────────────────────
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '24px 32px', color: 'var(--color-text)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📚 Game Catalog</h1>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleSyncAll}
          disabled={syncing === 'all'}
          style={btnStyle}
        >
          {syncing === 'all' ? 'Syncing All…' : '☁ Sync All'}
        </button>
        <button onClick={handleRefreshOwnership} style={{ ...btnStyle, marginLeft: 8 }}>
          🔄 Refresh Ownership
        </button>
      </div>

      {/* Sync progress banner */}
      {syncProgress && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-primary)',
            borderRadius: 12,
            padding: '16px 24px',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>☁️</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              Syncing: {syncProgress.currentSystem}
            </span>
            <span style={{ opacity: 0.6, fontSize: 13, marginLeft: 'auto' }}>
              {syncProgress.current} / {syncProgress.total}
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: 'var(--color-surface-2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%`,
                borderRadius: 3,
                background: 'var(--color-primary)',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      )}

      {!initialLoadDone ? (
        <div style={{ padding: 32, textAlign: 'center', opacity: 0.5 }}>Loading catalog…</div>
      ) : allSystems.length === 0 && !syncProgress ? (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <p style={{ opacity: 0.7, marginBottom: 16 }}>
            No catalog data yet. Click "Sync All" above to download DAT files for all preconfigured systems,
            or click a system card and use "Import DAT" / "Sync" to add data.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
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

      {/* Wiki modal */}
      {wikiSystemId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
          onClick={() => setWikiSystemId(null)}
        >
          <div
            style={{
              width: '90%', maxWidth: 800, maxHeight: '90%',
              borderRadius: 16, overflow: 'auto',
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <SystemWikiPanel
              systemId={wikiSystemId}
              systemName={systemDisplayName(wikiSystemId)}
              onClose={() => setWikiSystemId(null)}
            />
          </div>
        </div>
      )}
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
