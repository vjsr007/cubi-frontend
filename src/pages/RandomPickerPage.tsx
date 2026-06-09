import { useState, useEffect, useCallback } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { api } from '../lib/invoke';
import { toImageSrc } from '../lib/media';
import { ArcadeButton } from '../components/arcade/ArcadeButton';
import type { GameInfo, SystemInfo } from '../types';

type SpinPhase = 'idle' | 'spinning' | 'slowing' | 'done';

const SPIN_DURATION = 2800;
const PHASES: { after: number; interval: number }[] = [
  { after: 0,    interval: 55  },
  { after: 800,  interval: 90  },
  { after: 1400, interval: 140 },
  { after: 1900, interval: 200 },
  { after: 2300, interval: 280 },
  { after: 2600, interval: 380 },
];

function getInterval(elapsed: number): number {
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (elapsed >= PHASES[i].after) return PHASES[i].interval;
  }
  return PHASES[0].interval;
}

export function RandomPickerPage() {
  const systems = useLibraryStore((s) => s.systems);
  const launchGame = useLibraryStore((s) => s.launchGame);

  const [allGames, setAllGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [displayGame, setDisplayGame] = useState<GameInfo | null>(null);
  const [pickedGame, setPickedGame] = useState<GameInfo | null>(null);
  const [phase, setPhase] = useState<SpinPhase>('idle');
  const [imgError, setImgError] = useState(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    api.getAllGames().then((games) => {
      setAllGames(games);
      setLoading(false);
    });
  }, []);

  const filteredGames = selectedSystemId
    ? allGames.filter((g) => g.system_id === selectedSystemId)
    : allGames;

  const spin = useCallback(() => {
    if (phase !== 'idle' || filteredGames.length === 0) return;

    const final = filteredGames[Math.floor(Math.random() * filteredGames.length)];
    setPickedGame(null);
    setImgError(false);
    setPhase('spinning');

    let elapsed = 0;

    const tick = () => {
      elapsed += getInterval(elapsed);

      if (elapsed >= SPIN_DURATION) {
        setDisplayGame(final);
        setPickedGame(final);
        setPhase('done');
        return;
      }

      const random = filteredGames[Math.floor(Math.random() * filteredGames.length)];
      setDisplayGame(random);

      setTimeout(tick, getInterval(elapsed));
    };

    setTimeout(tick, getInterval(0));
  }, [phase, filteredGames]);

  const handleLaunch = async () => {
    if (!pickedGame) return;
    setLaunching(true);
    try {
      await launchGame(pickedGame.id);
    } finally {
      setLaunching(false);
    }
  };

  const handleSystemSelect = (id: string | null) => {
    setSelectedSystemId(id);
    setPhase('idle');
    setPickedGame(null);
    setDisplayGame(null);
  };

  const isSpinning = phase === 'spinning' || phase === 'slowing';
  const imgSrc = !imgError ? toImageSrc(displayGame?.box_art ?? null) : null;

  const systemName = pickedGame
    ? systems.find((s) => s.id === pickedGame.system_id)?.name ?? pickedGame.system_id
    : null;

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(160deg, #070712 0%, #0d0920 50%, #070712 100%)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2, color: '#fff',
            textShadow: '0 0 20px #a855f7, 0 0 40px #7c3aed' }}>
            LUCKY PLAY
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', letterSpacing: 1 }}>
            — máquina aleatoria
          </span>
        </div>

        {/* System filter */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <FilterPill
            label={`Todos (${allGames.length})`}
            active={selectedSystemId === null}
            onClick={() => handleSystemSelect(null)}
          />
          {systems.filter((s) => allGames.some((g) => g.system_id === s.id)).map((s) => (
            <FilterPill
              key={s.id}
              label={`${s.name} (${allGames.filter((g) => g.system_id === s.id).length})`}
              active={selectedSystemId === s.id}
              onClick={() => handleSystemSelect(s.id)}
            />
          ))}
        </div>
      </div>

      {/* Main slot area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 28px',
        minHeight: 0,
      }}>
        {loading ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Cargando juegos…</div>
        ) : filteredGames.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            No hay juegos en este sistema.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 40, alignItems: 'center', width: '100%', maxWidth: 900 }}>

            {/* Slot machine */}
            <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {/* Machine frame */}
              <div style={{
                position: 'relative',
                width: 260,
                height: 360,
                borderRadius: 16,
                border: `2px solid ${isSpinning ? '#a855f7' : phase === 'done' ? '#22d3ee' : '#3b1d6e'}`,
                background: '#0f0820',
                boxShadow: isSpinning
                  ? '0 0 30px #a855f755, inset 0 0 40px #1a0a3060'
                  : phase === 'done'
                  ? '0 0 40px #22d3ee44, inset 0 0 40px #0a2a3060'
                  : '0 0 15px #1a0a3060, inset 0 0 30px #0d091a',
                transition: 'border-color 0.4s, box-shadow 0.4s',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {/* Scan lines overlay */}
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
                }} />

                {/* Top/bottom gradient masks */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 60, zIndex: 3, pointerEvents: 'none',
                  background: 'linear-gradient(to bottom, #0f0820, transparent)',
                }} />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, zIndex: 3, pointerEvents: 'none',
                  background: 'linear-gradient(to top, #0f0820, transparent)',
                }} />

                {/* Art */}
                {displayGame ? (
                  <img
                    key={isSpinning ? displayGame.id : `final-${displayGame.id}`}
                    src={imgSrc ?? undefined}
                    alt={displayGame.title}
                    onError={() => setImgError(true)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: isSpinning ? 'blur(1.5px) brightness(0.7)' : 'brightness(1)',
                      transition: isSpinning ? 'none' : 'filter 0.5s',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 48 }}>🎰</span>
                    <span style={{ color: '#4b2a8a', fontSize: 13, letterSpacing: 1 }}>GIRA PARA JUGAR</span>
                  </div>
                )}

                {/* No-art fallback */}
                {displayGame && !imgSrc && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8,
                  }}>
                    <span style={{ fontSize: 36 }}>🎮</span>
                    <span style={{
                      color: '#e2d9ff', fontSize: 15, fontWeight: 700, textAlign: 'center',
                      textShadow: '0 2px 6px #000',
                    }}>
                      {displayGame.title}
                    </span>
                  </div>
                )}

                {/* Spinning indicator */}
                {isSpinning && (
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 4,
                    background: 'linear-gradient(180deg, transparent 20%, #a855f710 50%, transparent 80%)',
                    animation: 'scanSweep 0.3s linear infinite',
                  }} />
                )}
              </div>

              {/* Spin button */}
              <ArcadeButton
                variant={isSpinning ? 'chrome' : 'violet'}
                size="lg"
                shine={!isSpinning}
                pulse={phase === 'idle'}
                onClick={spin}
                disabled={isSpinning || filteredGames.length === 0}
                style={{ width: 200 }}
              >
                {isSpinning ? '⟳ Girando…' : '🎰 GIRAR'}
              </ArcadeButton>
            </div>

            {/* Game info panel */}
            <div style={{
              flex: 1,
              minHeight: 360,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 20,
            }}>
              {phase === 'done' && pickedGame ? (
                <>
                  <div>
                    <div style={{
                      fontSize: 11, letterSpacing: 3, color: '#22d3ee',
                      textTransform: 'uppercase', marginBottom: 8,
                    }}>
                      Tu próximo juego
                    </div>
                    <div style={{
                      fontSize: 28, fontWeight: 800, color: '#fff',
                      lineHeight: 1.2, textShadow: '0 0 20px #22d3ee88',
                      marginBottom: 6,
                    }}>
                      {pickedGame.title}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                      {systemName && <Tag color="#a855f7">{systemName}</Tag>}
                      {pickedGame.year && <Tag color="#f59e0b">{pickedGame.year}</Tag>}
                      {pickedGame.genre && <Tag color="#10b981">{pickedGame.genre}</Tag>}
                      {pickedGame.players > 1 && <Tag color="#3b82f6">{pickedGame.players}P</Tag>}
                      {pickedGame.favorite && <Tag color="#ec4899">♥ Favorito</Tag>}
                    </div>

                    {pickedGame.description && (
                      <p style={{
                        color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.6,
                        maxWidth: 420,
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {pickedGame.description}
                      </p>
                    )}
                  </div>

                  {pickedGame.developer && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      <span style={{ color: '#6b7280' }}>Dev: </span>{pickedGame.developer}
                      {pickedGame.publisher && pickedGame.publisher !== pickedGame.developer && (
                        <> · <span style={{ color: '#6b7280' }}>Pub: </span>{pickedGame.publisher}</>
                      )}
                    </div>
                  )}

                  {pickedGame.play_count > 0 && (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      Jugado {pickedGame.play_count} {pickedGame.play_count === 1 ? 'vez' : 'veces'}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <ArcadeButton
                      variant="cyan"
                      size="lg"
                      shine
                      icon="▶"
                      onClick={handleLaunch}
                      disabled={launching}
                    >
                      {launching ? 'Lanzando…' : 'JUGAR AHORA'}
                    </ArcadeButton>
                    <ArcadeButton
                      variant="magenta"
                      size="md"
                      onClick={() => { setPhase('idle'); setPickedGame(null); setDisplayGame(null); }}
                    >
                      Otro juego
                    </ArcadeButton>
                  </div>
                </>
              ) : (
                <div style={{ color: '#3b1d6e' }}>
                  <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>🎰</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#5a3a9a', marginBottom: 6 }}>
                    {isSpinning ? 'Buscando tu juego…' : `${filteredGames.length} juegos disponibles`}
                  </div>
                  <div style={{ fontSize: 13, color: '#3b1d6e' }}>
                    {isSpinning ? 'Preparando la selección perfecta' : 'Presiona GIRAR para descubrir qué jugar hoy'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanSweep {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px',
        borderRadius: 20,
        border: `1px solid ${active ? '#a855f7' : '#2a1a4a'}`,
        background: active ? '#a855f720' : 'transparent',
        color: active ? '#e2d9ff' : '#5a3a8a',
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: 12,
      border: `1px solid ${color}44`,
      background: `${color}18`,
      color,
      fontSize: 12,
      fontWeight: 600,
    }}>
      {children}
    </span>
  );
}
