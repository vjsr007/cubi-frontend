import { useState, useEffect, useMemo } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUiStore } from '../../stores/uiStore';
import { HyperSpinTheme as HSTheme } from './HyperSpinTheme';
import type { HSGame } from './HyperSpinTheme';
import { Toast } from '../../components/common/Toast';
import { SettingsPage } from '../../pages/SettingsPage';
import { ScraperPage } from '../../pages/ScraperPage';
import { PcGamesPage } from '../../pages/PcGamesPage';
import { EmulatorConfigPage } from '../../pages/EmulatorConfigPage';
import { RomPathsPage } from '../../pages/RomPathsPage';
import { InputMappingPage } from '../../pages/InputMappingPage';
import { EmulatorSettingsPage } from '../../pages/EmulatorSettingsPage';
import { GameVerificationPage } from '../../pages/GameVerificationPage';
import { CatalogPage } from '../../pages/CatalogPage';
import { RandomPickerPage } from '../../pages/RandomPickerPage';

type HyperView = 'systems' | 'games';

function mediaSrc(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return convertFileSrc(path);
}

export function HyperSpinTheme() {
  const { systems, games, loadSystems, selectSystem, selectedSystemId, launchGame } = useLibraryStore();
  const { currentPage, navigateTo, showToast } = useUiStore();
  const [view, setView] = useState<HyperView>('systems');
  const [systemIndex, setSystemIndex] = useState(0);

  useEffect(() => { loadSystems(); }, []);

  useEffect(() => {
    if (systems.length > 0 && !selectedSystemId) {
      selectSystem(systems[0].id);
    }
  }, [systems]);

  useEffect(() => {
    if (systems[systemIndex]) {
      selectSystem(systems[systemIndex].id);
    }
  }, [systemIndex]);

  const systemGames = useMemo<HSGame[]>(() =>
    systems.map((s) => ({
      id: s.id,
      title: s.full_name || s.name,
      systemId: s.id,
      systemName: 'Systems',
      wheelArt: mediaSrc(s.icon),
    })), [systems]);

  const hsGames = useMemo<HSGame[]>(() =>
    games.map((g) => ({
      id: g.id,
      title: g.title,
      systemId: g.system_id,
      systemName: systems.find((s) => s.id === g.system_id)?.name ?? g.system_id,
      year: g.year ? Number(g.year) : undefined,
      genre: g.genre,
      developer: g.developer,
      publisher: g.publisher,
      players: g.players > 1 ? `${g.players}` : '1',
      rating: g.rating ? Math.round(g.rating * 5) : undefined,
      playCount: g.play_count,
      description: g.description,
      wheelArt: mediaSrc(g.box_art),
      logoArt: mediaSrc(g.logo ?? g.box_art),
      fanart: mediaSrc(g.hero_art ?? g.background_art),
      videoPath: mediaSrc(g.trailer_local ?? g.trailer_url),
    })), [games, systems]);

  const handleLaunchGame = async (g: HSGame) => {
    try {
      await launchGame(g.id);
      showToast(`Launching ${g.title}…`, 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleSelectSystem = (s: HSGame) => {
    const idx = systems.findIndex((sys) => sys.id === s.id);
    if (idx >= 0) setSystemIndex(idx);
    setView('games');
  };

  const overlayStyle = { height: '100%', background: '#0d0d0d', display: 'flex' as const, flexDirection: 'column' as const };

  if (currentPage === 'settings') {
    return (
      <div style={overlayStyle}>
        <div style={{ padding: '10px 16px', background: '#1a1a1a', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigateTo('library')} style={{ background: 'none', border: '1px solid #444', borderRadius: 6, color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>← Back</button>
          <span style={{ color: '#f39c12', fontWeight: 600, fontSize: 15 }}>Settings</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}><SettingsPage /></div>
        <Toast />
      </div>
    );
  }
  if (currentPage === 'scraper')          return <><ScraperPage /><Toast /></>;
  if (currentPage === 'pc-games')         return <div style={overlayStyle}><PcGamesPage /><Toast /></div>;
  if (currentPage === 'emulator-config')  return <div style={overlayStyle}><EmulatorConfigPage /><Toast /></div>;
  if (currentPage === 'rom-paths')        return <div style={overlayStyle}><RomPathsPage /><Toast /></div>;
  if (currentPage === 'input-mapping')    return <div style={overlayStyle}><InputMappingPage /><Toast /></div>;
  if (currentPage === 'emulator-settings') return <div style={overlayStyle}><EmulatorSettingsPage /><Toast /></div>;
  if (currentPage === 'game-verification') return <div style={overlayStyle}><GameVerificationPage /><Toast /></div>;
  if (currentPage === 'catalog')          return <div style={overlayStyle}><CatalogPage /><Toast /></div>;
  if (currentPage === 'random-picker')    return <div style={overlayStyle}><RandomPickerPage /><Toast /></div>;

  return (
    <>
      {view === 'systems' ? (
        <HSTheme
          games={systemGames}
          onLaunch={handleSelectSystem}
          onExit={() => navigateTo('settings')}
          onMenu={() => navigateTo('settings')}
        />
      ) : (
        <HSTheme
          games={hsGames}
          onLaunch={handleLaunchGame}
          onFavorite={(g) => useLibraryStore.getState().toggleFavorite(g.id)}
          onExit={() => { setView('systems'); }}
          onMenu={() => navigateTo('settings')}
        />
      )}
      <Toast />
    </>
  );
}
