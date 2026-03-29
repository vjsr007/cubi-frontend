import { useState, useEffect, useRef, useCallback } from 'react';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUiStore } from '../../stores/uiStore';
import { useConfigStore } from '../../stores/configStore';
import { useAudio } from '../../hooks/useAudio';
import { AuroraBokeh } from './AuroraBokeh';
import { AuroraCarousel } from './AuroraCarousel';
import { AuroraSystemCarousel } from './AuroraSystemCarousel';
import {
  AuroraHUD,
  AuroraInfoBar,
  AuroraTicker,
} from './AuroraHUD';
import { Toast } from '../../components/common/Toast';
import { SettingsPage } from '../../pages/SettingsPage';
import { ScraperPage } from '../../pages/ScraperPage';
import { PcGamesPage } from '../../pages/PcGamesPage';
import { EmulatorConfigPage } from '../../pages/EmulatorConfigPage';
import './aurora.css';

type AuroraView = 'systems' | 'games';

export function AuroraTheme() {
  const {
    systems,
    games,
    loadSystems,
    selectSystem,
    selectedSystemId,
    launchGame,
  } = useLibraryStore();
  const { showToast, currentPage, navigateTo } = useUiStore();
  const { config } = useConfigStore();
  const { playTick, playEnter } = useAudio();

  const [view, setView]               = useState<AuroraView>('systems');
  const [systemIndex, setSystemIndex] = useState(0);
  const [gameIndex, setGameIndex]     = useState(0);

  // Gamepad polling refs
  const rafRef     = useRef<number>(0);
  const lastMove   = useRef(0);
  const isRunning  = useRef(true);

  // ── Load systems on mount ─────────────────────────────────
  useEffect(() => {
    loadSystems();
  }, []);

  // Auto-select first system
  useEffect(() => {
    if (systems.length > 0 && !selectedSystemId) {
      selectSystem(systems[0].id);
    }
  }, [systems]);

  // Sync selected system when index changes
  useEffect(() => {
    if (systems[systemIndex]) {
      selectSystem(systems[systemIndex].id);
      setGameIndex(0);
    }
  }, [systemIndex, systems]);

  // ── Navigation helpers ────────────────────────────────────
  const navigateItem = useCallback(
    (delta: -1 | 1) => {
      playTick();
      if (view === 'systems') {
        if (systems.length === 0) return;
        setSystemIndex((i) => {
          const next = i + delta;
          if (next < 0) return systems.length - 1;
          if (next >= systems.length) return 0;
          return next;
        });
      } else {
        if (games.length === 0) return;
        setGameIndex((i) => {
          const next = i + delta;
          if (next < 0) return games.length - 1;
          if (next >= games.length) return 0;
          return next;
        });
      }
    },
    [view, systems.length, games.length, playTick]
  );

  const enterGames = useCallback(() => {
    if (systems.length === 0) return;
    playEnter();
    setView('games');
    setGameIndex(0);
  }, [systems.length, playEnter]);

  const backToSystems = useCallback(() => {
    playTick();
    setView('systems');
  }, [playTick]);

  const handleLaunch = useCallback(async () => {
    const game = games[gameIndex];
    if (!game) return;
    playEnter();
    try {
      await launchGame(game.id);
      showToast(`Launching ${game.title}…`, 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  }, [games, gameIndex, launchGame, showToast, playEnter]);

  // ── Keyboard handler ──────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (currentPage === 'settings' || currentPage === 'scraper' || currentPage === 'pc-games' || currentPage === 'emulator-config') return;
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); navigateItem(-1); break;
        case 'ArrowRight': e.preventDefault(); navigateItem(1);  break;
        case 'Enter':
          if (view === 'systems') enterGames();
          else handleLaunch();
          break;
        case 'Backspace': case 'b': case 'B':
          if (view === 'games') backToSystems();
          break;
        case 'Escape':
          if (view === 'games') backToSystems();
          else navigateTo('settings');
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentPage, view, navigateItem, enterGames, handleLaunch, backToSystems, navigateTo]);

  // ── Gamepad polling ───────────────────────────────────────
  useEffect(() => {
    if (currentPage === 'settings' || currentPage === 'scraper' || currentPage === 'pc-games' || currentPage === 'emulator-config') {
      isRunning.current = false;
      cancelAnimationFrame(rafRef.current);
      return;
    }
    isRunning.current = true;

    function poll() {
      if (!isRunning.current) return;
      const gp = navigator.getGamepads()[0];
      if (gp) {
        const now    = Date.now();
        const axisX  = gp.axes[0] ?? 0;
        const THRESH = 0.5;
        const DEBOUNCE = 150;

        // Left/right navigation (axis or d-pad)
        if (Math.abs(axisX) > THRESH && now - lastMove.current > DEBOUNCE) {
          lastMove.current = now;
          navigateItem(axisX < -THRESH ? -1 : 1);
        }
        if (gp.buttons[14]?.pressed && now - lastMove.current > DEBOUNCE) {
          lastMove.current = now; navigateItem(-1);
        }
        if (gp.buttons[15]?.pressed && now - lastMove.current > DEBOUNCE) {
          lastMove.current = now; navigateItem(1);
        }

        // LB / RB (buttons 4 / 5) — in system view only
        if (view === 'systems') {
          if (gp.buttons[4]?.pressed && now - lastMove.current > DEBOUNCE) {
            lastMove.current = now; navigateItem(-1);
          }
          if (gp.buttons[5]?.pressed && now - lastMove.current > DEBOUNCE) {
            lastMove.current = now; navigateItem(1);
          }
        }

        // A button (0) = select / launch
        if (gp.buttons[0]?.pressed && now - lastMove.current > 300) {
          lastMove.current = now;
          if (view === 'systems') enterGames();
          else handleLaunch();
        }

        // B button (1) = back to systems
        if (gp.buttons[1]?.pressed && now - lastMove.current > 300) {
          lastMove.current = now;
          if (view === 'games') backToSystems();
        }

        // Start (9) = settings
        if (gp.buttons[9]?.pressed && now - lastMove.current > 300) {
          lastMove.current = now; navigateTo('settings');
        }
      }
      rafRef.current = requestAnimationFrame(poll);
    }

    rafRef.current = requestAnimationFrame(poll);
    return () => {
      isRunning.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [currentPage, view, navigateItem, enterGames, handleLaunch, backToSystems, navigateTo]);

  const focusedGame   = games[gameIndex] ?? null;
  const currentSystem = systems[systemIndex];

  // total play count across all games (simple stat)
  const totalPlayCount = games.reduce((sum, g) => sum + (g.play_count ?? 0), 0);

  const userName = (config as { general?: { username?: string } })
    ?.general?.username ?? 'Player 1';

  // ── Settings / Scraper overlay ────────────────────────────
  if (currentPage === 'settings') {
    return (
      <div
        style={{
          height: '100%',
          background: 'linear-gradient(135deg, #0a0004 0%, #0d000a 100%)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '12px 20px',
            background: 'rgba(0,0,0,0.6)',
            borderBottom: '1px solid rgba(16,124,16,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            onClick={() => navigateTo('library')}
            style={{
              background: 'rgba(16,124,16,0.2)',
              border: '1px solid rgba(16,124,16,0.5)',
              color: '#52b043',
              padding: '6px 14px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ← Back
          </button>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Settings</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <SettingsPage />
        </div>
      </div>
    );
  }

  if (currentPage === 'scraper') {
    return (
      <div
        style={{
          height: '100%',
          background: 'linear-gradient(135deg, #0a0004 0%, #0d000a 100%)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '12px 20px',
            background: 'rgba(0,0,0,0.6)',
            borderBottom: '1px solid rgba(16,124,16,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            onClick={() => navigateTo('library')}
            style={{
              background: 'rgba(16,124,16,0.2)',
              border: '1px solid rgba(16,124,16,0.5)',
              color: '#52b043',
              padding: '6px 14px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ← Back
          </button>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Scraper</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <ScraperPage />
        </div>
      </div>
    );
  }

  if (currentPage === 'emulator-config') {
    return (
      <div style={{ height: '100%' }}>
        <EmulatorConfigPage />
      </div>
    );
  }

  if (currentPage === 'pc-games') {
    return (
      <div style={{ height: '100%' }}>
        <PcGamesPage />
      </div>
    );
  }

  // ── Welcome screen if no data_root configured ─────────────
  if (!config?.paths?.data_root) {
    return (
      <div
        style={{
          height: '100%',
          position: 'relative',
          background: '#0a0004',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <AuroraBokeh />
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 40,
              marginBottom: 16,
              filter: 'drop-shadow(0 0 20px rgba(16,124,16,0.5))',
            }}
          >
            🎮
          </div>
          <h2
            style={{
              color: 'white',
              fontSize: 22,
              margin: '0 0 8px',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            Welcome to Cubi
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 20px', fontFamily: 'Arial, sans-serif' }}>
            Configure your data folder to get started
          </p>
          <button
            onClick={() => navigateTo('settings')}
            style={{
              background: '#107c10',
              border: 'none',
              color: 'white',
              padding: '10px 28px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Open Settings
          </button>
        </div>
      </div>
    );
  }

  // ── Main Aurora UI ─────────────────────────────────────────
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #0d0005 0%, #140008 50%, #0a0003 100%)',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* ── Background: Xbox wallpaper ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/xbox-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
      />
      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(160deg, rgba(10,0,22,0.80) 0%, rgba(12,0,18,0.72) 50%, rgba(8,0,16,0.84) 100%)',
          zIndex: 1,
        }}
      />

      {/* ── Bokeh particles ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
        <AuroraBokeh />
      </div>

      {/* ── Center radial glow ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(80,20,40,0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* ── HUD overlays ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
        <AuroraHUD
          systems={systems}
          systemIndex={systemIndex}
          totalGames={view === 'games' ? games.length : systems.length}
          playCount={totalPlayCount}
          userName={userName}
        />
      </div>

      {/* ── Back hint when in games view ── */}
      {view === 'games' && (
        <button
          onClick={backToSystems}
          style={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 20,
            color: 'rgba(255,255,255,0.85)',
            fontSize: 11,
            padding: '4px 16px',
            cursor: 'pointer',
            letterSpacing: '0.04em',
            zIndex: 22,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          ‹ {currentSystem?.full_name ?? currentSystem?.name ?? 'Systems'}
        </button>
      )}

      {/* ── Carousel area ── */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '10%',
          bottom: '22%',
          zIndex: 10,
        }}
      >
        {view === 'systems' ? (
          <AuroraSystemCarousel
            systems={systems}
            focusedIndex={systemIndex}
            onNavigate={navigateItem}
          />
        ) : (
          <AuroraCarousel
            games={games}
            focusedIndex={gameIndex}
            onNavigate={navigateItem}
          />
        )}
      </div>

      {/* ── Info bar ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
        {view === 'systems' && currentSystem && (
          <AuroraInfoBar
            title={currentSystem.full_name ?? currentSystem.name}
            current={systemIndex + 1}
            total={systems.length}
          />
        )}
        {view === 'games' && focusedGame && (
          <AuroraInfoBar
            title={focusedGame.title}
            current={gameIndex + 1}
            total={games.length}
          />
        )}
      </div>

      {/* ── Bottom ticker ── */}
      <AuroraTicker
        systemName={
          view === 'systems'
            ? 'SYSTEMS  ·  ← → Navigate   A Select'
            : `${currentSystem?.full_name ?? 'GAMES'}  ·  ← → Navigate   A Launch   B Back`
        }
      />

      {/* Toast notifications */}
      <Toast />
    </div>
  );
}
