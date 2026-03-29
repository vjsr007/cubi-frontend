import { useState, useEffect, useRef } from 'react';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUiStore } from '../../stores/uiStore';
import { useConfigStore } from '../../stores/configStore';
import { WheelCarousel } from './WheelCarousel';
import { GameWheel } from './GameWheel';
import { PreviewPanel } from './PreviewPanel';
import { BottomBar } from './BottomBar';
import { Toast } from '../../components/common/Toast';
import { SettingsPage } from '../../pages/SettingsPage';
import { ScraperPage } from '../../pages/ScraperPage';
import { useAudio } from '../../hooks/useAudio';
import { useI18nStore } from '../../stores/i18nStore';
import type { GameInfo } from '../../types';

type HyperView = 'systems' | 'games';

export function HyperSpinTheme() {
  const { systems, games, loadSystems, selectSystem, selectedSystemId, launchGame } = useLibraryStore();
  const { showToast, currentPage, navigateTo } = useUiStore();
  const { config } = useConfigStore();

  const [view, setView] = useState<HyperView>('systems');
  const [systemIndex, setSystemIndex] = useState(0);
  const [gameIndex, setGameIndex] = useState(0);
  const [previewGame, setPreviewGame] = useState<GameInfo | null>(null);

  // Gamepad polling refs for system wheel
  const rafRef = useRef<number>(0);
  const lastMoveRef = useRef(0);
  const { playTick, playEnter } = useAudio();
  const { t } = useI18nStore();

  useEffect(() => {
    loadSystems();
  }, []);

  // Auto-select first system
  useEffect(() => {
    if (systems.length > 0 && !selectedSystemId) {
      selectSystem(systems[0].id);
    }
  }, [systems]);

  // Sync preview game with focused game
  useEffect(() => {
    if (view === 'games' && games.length > 0) {
      setPreviewGame(games[gameIndex] ?? null);
    } else {
      setPreviewGame(null);
    }
  }, [view, games, gameIndex]);

  // Load games when system changes
  useEffect(() => {
    if (systems[systemIndex]) {
      selectSystem(systems[systemIndex].id);
      setGameIndex(0);
    }
  }, [systemIndex]);

  // Gamepad polling for system wheel
  useEffect(() => {
    if (view !== 'systems') return;
    let running = true;
    function poll() {
      if (!running) return;
      const gp = navigator.getGamepads()[0];
      if (gp) {
        const axis = gp.axes[1] ?? 0;
        const now = Date.now();
        if (Math.abs(axis) > 0.5 && now - lastMoveRef.current > 150) {
          lastMoveRef.current = now;
          playTick();
          if (axis < -0.5) setSystemIndex((i) => (i - 1 + systems.length) % systems.length);
          else setSystemIndex((i) => (i + 1) % systems.length);
        }
        if (gp.buttons[0]?.pressed && now - lastMoveRef.current > 300) {
          lastMoveRef.current = now;
          playEnter();
          setView('games');
        }
        if (gp.buttons[8]?.pressed && now - lastMoveRef.current > 300) {
          lastMoveRef.current = now;
          navigateTo('settings');
        }
      }
      rafRef.current = requestAnimationFrame(poll);
    }
    rafRef.current = requestAnimationFrame(poll);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [view, systems, playTick, playEnter]);

  const handleSelectSystem = (_id: string) => {
    setView('games');
    setGameIndex(0);
  };

  const handleSelectGame = async (game: GameInfo) => {
    try {
      await launchGame(game.id);
      showToast(`Launching ${game.title}...`, 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleBackToSystems = () => {
    setView('systems');
    setGameIndex(0);
  };

  const currentSystem = systems[systemIndex] ?? null;

  // Settings overlay
  if (currentPage === 'settings') {
    return (
      <div style={{ height: '100%', background: '#0d0d0d', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 20px', background: '#1a1a1a', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigateTo('library')}
            style={{ background: 'none', border: '1px solid #444', borderRadius: 6, color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}
          >
            {t('hyperspin.back')}
          </button>
          <span style={{ color: '#f39c12', fontWeight: 600, fontSize: 15 }}>{t('hyperspin.settings')}</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <SettingsPage />
        </div>
        <Toast />
      </div>
    );
  }

  if (currentPage === 'scraper') {
    return <ScraperPage />;
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(ellipse at 30% 50%, #3a0808 0%, #1a0404 40%, #0a0a0a 100%)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Settings button */}
      <button
        onClick={() => navigateTo('settings')}
        title={t('hyperspin.settings')}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 20,
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid #333',
          borderRadius: 8,
          color: '#888',
          width: 36,
          height: 36,
          fontSize: 16,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ⚙
      </button>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left: Preview Panel */}
        <div style={{ flex: '0 0 55%', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          <PreviewPanel
            system={currentSystem}
            game={view === 'games' ? (games[gameIndex] ?? null) : null}
            mode={view === 'games' ? 'game' : 'system' as const}
          />
        </div>

        {/* Right: Wheel */}
        <div style={{ flex: '0 0 45%', position: 'relative' }}>
          {/* Subtle right-side metallic sheen */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.015) 100%)',
              pointerEvents: 'none',
            }}
          />

          {view === 'systems' ? (
            <WheelCarousel
              items={systems.map((s) => ({ id: s.id, label: s.name }))}
              focusedIndex={systemIndex}
              onFocusChange={setSystemIndex}
              onSelect={handleSelectSystem}
            />
          ) : (
            <GameWheel
              games={games}
              focusedIndex={gameIndex}
              onFocusChange={setGameIndex}
              onSelect={handleSelectGame}
              onBack={handleBackToSystems}
            />
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <BottomBar
        mode={view === 'games' ? 'game' : 'system'}
        systemName={currentSystem?.name}
      />

      <Toast />
    </div>
  );
}
