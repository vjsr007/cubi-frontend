import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { api } from '../lib/invoke';
import type { GameInfo, SystemInfo } from '../types';

const CELL_H = 150;
const REEL_CENTER = 220; // px from top to center band midpoint

const GENRE_EMOJI: Record<string, string> = {
  'Action':       '⚔️', 'Acción': '⚔️', 'ACCIÓN': '⚔️',
  'Adventure':    '🗺️', 'Aventura': '🗺️', 'AVENTURA': '🗺️',
  'RPG':          '💎', 'Role-Playing': '💎',
  'Shooter':      '🚀', 'SHOOTER': '🚀', 'Shoot': '🚀',
  'Platform':     '🍄', 'Plataformas': '🍄', 'PLATAFORMAS': '🍄', 'Platformer': '🍄',
  'Racing':       '🏎️', 'Carreras': '🏎️',
  'Puzzle':       '🧩', 'PUZZLE': '🧩',
  'Sports':       '⚽', 'Deportes': '⚽',
  'Fighting':     '👊', 'Lucha': '👊', 'LUCHA': '👊',
  'Strategy':     '🎯', 'Estrategia': '🎯', 'ESTRATEGIA': '🎯',
  'Simulation':   '🏗️',
  'Beat em Up':   '🥊', 'BEAT EM UP': '🥊',
  'Run and Gun':  '🔫', 'RUN N GUN': '🔫',
  'Arcade':       '👾', 'ARCADE': '👾',
};

function genreEmoji(genre?: string): string {
  if (!genre) return '🎮';
  for (const [k, v] of Object.entries(GENRE_EMOJI)) {
    if (genre.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return '🎮';
}

function fmtNum(n: number): string {
  return n.toLocaleString('es');
}

const CONFETTI_COLORS = ['#00f0ff', '#ff006e', '#ffce5e', '#39ff14', '#b026ff', '#ff6b00'];

export function RandomPickerPage() {
  const systems = useLibraryStore((s) => s.systems);
  const launchGame = useLibraryStore((s) => s.launchGame);

  const [allGames, setAllGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [pickedGame, setPickedGame] = useState<GameInfo | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [rolls, setRolls] = useState(0);
  const [streak, setStreak] = useState(0);
  const [confetti, setConfetti] = useState<{ id: number; left: number; color: string; circle: boolean; dur: number; delay: number }[]>([]);
  const [jackpot, setJackpot] = useState(false);
  const [marquee, setMarquee] = useState('◂ READY TO ROLL ▸');
  const [reelWin, setReelWin] = useState(false);
  const [cabWin, setCabWin] = useState(false);
  const [leverDown, setLeverDown] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const confettiId = useRef(0);

  const [reelStrip, setReelStrip] = useState<GameInfo[]>([]);

  useEffect(() => {
    api.getAllGames().then((games) => {
      setAllGames(games);
      setLoading(false);
    });
  }, []);

  const filteredGames = useMemo(() =>
    selectedSystemId ? allGames.filter((g) => g.system_id === selectedSystemId) : allGames,
    [allGames, selectedSystemId]
  );

  const buildStrip = useCallback((landOn: GameInfo, pool: GameInfo[]): GameInfo[] => {
    const strip: GameInfo[] = [];
    for (let i = 0; i < 40; i++) strip.push(pool[Math.floor(Math.random() * pool.length)]);
    strip[38] = landOn;
    return strip;
  }, []);

  const burst = useCallback(() => {
    const items = Array.from({ length: 60 }, (_, i) => ({
      id: confettiId.current++,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      circle: Math.random() > 0.5,
      dur: 1.6 + Math.random() * 1.4,
      delay: Math.random() * 0.3,
    }));
    setConfetti((prev) => [...prev, ...items]);
    setTimeout(() => setConfetti((prev) => prev.filter((c) => !items.find((i) => i.id === c.id))), 2500);
  }, []);

  const spin = useCallback(() => {
    if (spinning || filteredGames.length === 0) return;

    const landOn = filteredGames[Math.floor(Math.random() * filteredGames.length)];
    const isJackpot = Math.random() < 0.12;
    const strip = buildStrip(landOn, filteredGames);
    setReelStrip(strip);

    setSpinning(true);
    setReelWin(false);
    setMarquee('◂ ROLLING… ▸');
    setLeverDown(true);
    setTimeout(() => setLeverDown(false), 180);

    const track = trackRef.current;
    if (track) {
      track.style.transition = 'none';
      track.style.transform = 'translateY(0px)';
      void track.offsetHeight;
      const finalY = -(38 * CELL_H) + (REEL_CENTER - CELL_H / 2);
      const dur = 2200 + Math.random() * 600;
      track.style.transition = `transform ${dur}ms cubic-bezier(0.12, 0.7, 0.1, 1)`;
      track.style.transform = `translateY(${finalY}px)`;

      setTimeout(() => {
        setPickedGame(landOn);
        setSpinning(false);
        setReelWin(true);
        setCabWin(true);
        setMarquee(`★ ${landOn.title.toUpperCase()} ★`);
        setTimeout(() => setCabWin(false), 600);
        setRolls((r) => r + 1);
        setStreak((s) => s + 1);
        burst();
        if (isJackpot) {
          setJackpot(true);
          setTimeout(() => burst(), 300);
          setTimeout(() => burst(), 600);
          setTimeout(() => setJackpot(false), 1600);
        }
      }, dur + 60);
    }
  }, [spinning, filteredGames, buildStrip, burst]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); spin(); }
      else if (e.key === 'r' || e.key === 'R') spin();
      else if (e.key === 'Enter' && pickedGame && !spinning) handleLaunch();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [spin, pickedGame, spinning]);

  const handleLaunch = async () => {
    if (!pickedGame) return;
    setLaunching(true);
    setMarquee('▶ LAUNCHING…');
    burst();
    try { await launchGame(pickedGame.id); } finally { setLaunching(false); }
  };

  const handleSystemSelect = (id: string | null) => {
    setSelectedSystemId(id);
    setPickedGame(null);
    setStreak(0);
    setReelWin(false);
    setReelStrip([]);
    setMarquee('◂ READY TO ROLL ▸');
    if (trackRef.current) {
      trackRef.current.style.transition = 'none';
      trackRef.current.style.transform = 'translateY(0px)';
    }
  };

  const systemName = pickedGame
    ? systems.find((s) => s.id === pickedGame.system_id)?.name ?? pickedGame.system_id
    : null;

  const poolCount = filteredGames.length;

  return (
    <div style={{
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: `
        radial-gradient(ellipse 60% 50% at 20% 0%, rgba(124,58,237,.22) 0%, transparent 55%),
        radial-gradient(ellipse 50% 50% at 90% 100%, rgba(255,0,110,.16) 0%, transparent 55%),
        radial-gradient(ellipse 50% 40% at 60% 50%, rgba(0,240,255,.08) 0%, transparent 60%),
        #07060f`,
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#e5e5e5',
    }}>
      {/* CRT scanline overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50,
        background: 'repeating-linear-gradient(0deg, transparent 0, transparent 1px, rgba(255,255,255,.02) 1px, rgba(0,0,0,.15) 2px)',
        opacity: 0.35, mixBlendMode: 'overlay',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, padding: '28px 40px 16px', position: 'relative', zIndex: 5 }}>
        <h1 style={{
          fontSize: 44, fontWeight: 900, letterSpacing: '0.04em', margin: 0, position: 'relative',
          background: 'linear-gradient(180deg, #fff 0%, #b794ff 100%)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          textShadow: 'none',
          filter: 'drop-shadow(0 0 30px rgba(124,58,237,.5))',
        }}>
          LUCKY PLAY
          <span style={{
            position: 'absolute', fontSize: 20, top: -8, right: -26,
            animation: 'lp-twinkle 2s ease-in-out infinite',
          }}>✦</span>
        </h1>
        <span style={{ fontSize: 15, color: '#7a7a92', letterSpacing: '0.04em' }}>
          — máquina aleatoria · <b style={{ color: '#00f0ff' }}>{fmtNum(poolCount)}</b> juegos en el bombo
        </span>
      </div>

      {/* Filter chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 40px 18px',
        position: 'relative', zIndex: 5, maxHeight: 170, overflow: 'hidden',
        maskImage: 'linear-gradient(180deg, black 80%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(180deg, black 80%, transparent 100%)',
      }}>
        <Chip label="Todos" count={allGames.length} active={selectedSystemId === null} onClick={() => handleSystemSelect(null)} />
        {systems
          .filter((s) => allGames.some((g) => g.system_id === s.id))
          .map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              count={allGames.filter((g) => g.system_id === s.id).length}
              active={selectedSystemId === s.id}
              onClick={() => handleSystemSelect(s.id)}
            />
          ))}
      </div>

      {/* Stage */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 56,
        alignItems: 'center', padding: '0 60px 40px', position: 'relative', zIndex: 5, minHeight: 0,
      }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#555' }}>Cargando juegos…</div>
        ) : (
          <>
            {/* Slot Cabinet */}
            <div style={{ position: 'relative', width: 420, justifySelf: 'end' }}>
              <div style={{
                position: 'relative', borderRadius: 24, padding: 18,
                background: 'linear-gradient(180deg, #1a1330 0%, #0d0a1a 100%)',
                boxShadow: spinning
                  ? '0 0 0 2px rgba(255,0,110,.7), 0 0 50px rgba(255,0,110,.5), 0 0 100px rgba(255,0,110,.25)'
                  : '0 0 0 2px rgba(0,240,255,.5), 0 0 40px rgba(0,240,255,.35), 0 0 80px rgba(0,240,255,.15), inset 0 2px 20px rgba(0,240,255,.08)',
                transition: 'box-shadow .3s',
                animation: cabWin ? 'lp-cab-win .6s ease-out' : undefined,
              }}>
                {/* Corner bolts */}
                {(['tl','tr','bl','br'] as const).map((pos) => (
                  <span key={pos} style={{
                    position: 'absolute',
                    top: pos.startsWith('t') ? 8 : undefined, bottom: pos.startsWith('b') ? 8 : undefined,
                    left: pos.endsWith('l') ? 8 : undefined, right: pos.endsWith('r') ? 8 : undefined,
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'radial-gradient(circle at 30% 30%, #5af, #249)',
                    boxShadow: '0 0 6px rgba(0,240,255,.6)',
                  }} />
                ))}

                {/* Marquee */}
                <div style={{
                  textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 11,
                  letterSpacing: '0.3em', textTransform: 'uppercase', padding: '6px 0 12px',
                  color: spinning ? '#ff006e' : '#00f0ff',
                  textShadow: spinning ? '0 0 8px rgba(255,0,110,.6)' : '0 0 8px rgba(0,240,255,.6)',
                  animation: spinning ? 'lp-flicker .3s steps(2) infinite' : undefined,
                }}>{marquee}</div>

                {/* Reel window */}
                <div style={{
                  position: 'relative', height: 440, borderRadius: 14, overflow: 'hidden',
                  background: '#05040c',
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,.9), inset 0 0 0 1px rgba(255,255,255,.04)',
                }}>
                  {/* Top/bottom fade masks */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90, background: 'linear-gradient(180deg, #05040c, transparent)', zIndex: 6, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, background: 'linear-gradient(0deg, #05040c, transparent)', zIndex: 6, pointerEvents: 'none' }} />

                  {/* Center selection band */}
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: '50%', height: CELL_H,
                    transform: 'translateY(-50%)', zIndex: 5, pointerEvents: 'none',
                    borderTop: `2px solid ${reelWin ? 'rgba(57,255,20,.8)' : 'rgba(0,240,255,.6)'}`,
                    borderBottom: `2px solid ${reelWin ? 'rgba(57,255,20,.8)' : 'rgba(0,240,255,.6)'}`,
                    boxShadow: reelWin
                      ? '0 0 32px rgba(57,255,20,.5), inset 0 0 40px rgba(57,255,20,.1)'
                      : '0 0 24px rgba(0,240,255,.3), inset 0 0 40px rgba(0,240,255,.06)',
                    transition: 'border-color .3s, box-shadow .3s',
                  }} />

                  {/* Reel track */}
                  <div ref={trackRef} style={{ position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', flexDirection: 'column', willChange: 'transform' }}>
                    {reelStrip.length === 0 ? (
                      <div style={{ height: CELL_H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12 }}>
                        <span style={{ fontSize: 54 }}>🎰</span>
                        <span style={{ fontSize: 14, color: '#6a6a85', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'ui-monospace,monospace' }}>GIRA PARA JUGAR</span>
                      </div>
                    ) : reelStrip.map((g, i) => (
                      <ReelCell key={i} game={g} systems={systems} />
                    ))}
                  </div>
                </div>

                {/* Physical lever */}
                <div
                  onClick={spin}
                  title="¡Tira de la palanca!"
                  style={{
                    position: 'absolute', right: -40, top: '50%',
                    transform: leverDown ? 'translateY(-30%)' : 'translateY(-50%)',
                    transition: 'transform .15s',
                    zIndex: 8, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', marginBottom: -6,
                    background: 'radial-gradient(circle at 35% 30%, #ff5a8a, #cc1144)',
                    boxShadow: '0 0 16px rgba(255,0,110,.7), inset 0 -3px 6px rgba(0,0,0,.4)',
                  }} />
                  <div style={{ width: 8, height: 90, background: 'linear-gradient(180deg, #888, #444)', borderRadius: 4 }} />
                  <div style={{ width: 24, height: 14, background: '#333', borderRadius: '0 0 6px 6px' }} />
                </div>
              </div>
            </div>

            {/* Result panel */}
            <div style={{ maxWidth: 560 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, letterSpacing: '0.32em', color: '#00f0ff',
                textTransform: 'uppercase', textShadow: '0 0 12px rgba(0,240,255,.5)',
                marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00f0ff', boxShadow: '0 0 8px #00f0ff', display: 'inline-block', animation: 'lp-dot 1.5s ease-in-out infinite' }} />
                Tu próximo juego
              </div>

              <h2 style={{
                fontSize: 64, fontWeight: 900, lineHeight: 1, margin: '0 0 18px',
                color: '#fff', letterSpacing: '-0.01em',
                textShadow: '0 4px 24px rgba(0,0,0,.6)',
                minHeight: 64,
                opacity: spinning ? 0.4 : 1,
                filter: spinning ? 'blur(2px)' : 'none',
                transition: 'opacity .2s, filter .2s',
              }}>
                {pickedGame?.title ?? '—'}
              </h2>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 34 }}>
                {systemName && <TagEl>{systemName}</TagEl>}
                {pickedGame?.year && <TagEl meta>{pickedGame.year}</TagEl>}
                {pickedGame?.genre && <TagEl meta>{pickedGame.genre.toUpperCase()}</TagEl>}
                {pickedGame?.favorite && <TagEl>♥ Favorito</TagEl>}
              </div>

              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <BtnPlay onClick={handleLaunch} disabled={!pickedGame || launching || spinning}>
                  <span style={{ fontSize: 20 }}>▶</span> {launching ? 'Lanzando…' : 'Jugar ahora'}
                </BtnPlay>
                <BtnReroll onClick={spin} disabled={spinning || filteredGames.length === 0}>
                  <span style={{ fontSize: 20 }}>🎲</span> Otro juego
                </BtnReroll>
              </div>

              <div style={{ display: 'flex', gap: 28, marginTop: 34, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                <Stat label="Tiradas hoy" value={rolls} color="#00f0ff" />
                <Stat label="Racha" value={streak} color="#ffce5e" />
                <Stat label="En el bombo" value={poolCount} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Keyboard hint */}
      <div style={{
        position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
        fontSize: 11, color: '#555', letterSpacing: '0.2em', textTransform: 'uppercase',
        fontFamily: 'ui-monospace, monospace', zIndex: 5, whiteSpace: 'nowrap',
      }}>
        <Kbd>Espacio</Kbd> girar · <Kbd>Enter</Kbd> jugar · <Kbd>R</Kbd> otra vez
      </div>

      {/* Confetti */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60, overflow: 'hidden' }}>
        {confetti.map((c) => (
          <i key={c.id} style={{
            position: 'absolute', width: 10, height: 14, top: -20,
            left: `${c.left}%`, background: c.color,
            borderRadius: c.circle ? '50%' : 2,
            boxShadow: `0 0 6px ${c.color}`,
            animation: `lp-fall ${c.dur}s cubic-bezier(.3,.6,.7,1) ${c.delay}s forwards`,
            opacity: 0,
            display: 'block',
          }} />
        ))}
      </div>

      {/* Jackpot */}
      {jackpot && (
        <div style={{
          position: 'fixed', top: '18%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 65, pointerEvents: 'none',
          fontSize: 72, fontWeight: 900, letterSpacing: '0.1em',
          background: 'linear-gradient(90deg, #ffce5e, #ff006e, #00f0ff, #ffce5e)',
          backgroundSize: '300% 100%',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          animation: 'lp-jackpot 1.4s ease-out, lp-rainbow 1.4s linear',
        }}>
          ¡JACKPOT!
        </div>
      )}

      <style>{`
        @keyframes lp-twinkle { 0%,100%{opacity:.4;transform:scale(.8) rotate(0)} 50%{opacity:1;transform:scale(1.2) rotate(20deg)} }
        @keyframes lp-dot     { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes lp-flicker { 0%,100%{opacity:1} 50%{opacity:.6} }
        @keyframes lp-cab-win { 0%,100%{transform:scale(1)} 30%{transform:scale(1.04)} 60%{transform:scale(.99)} }
        @keyframes lp-fall    { 0%{opacity:1;transform:translateY(0) rotate(0)} 100%{opacity:0;transform:translateY(110vh) rotate(720deg)} }
        @keyframes lp-jackpot { 0%{opacity:0;transform:translate(-50%,20px) scale(.6)} 25%{opacity:1;transform:translate(-50%,-20px) scale(1.1)} 80%{opacity:1;transform:translate(-50%,-20px) scale(1)} 100%{opacity:0;transform:translate(-50%,-60px) scale(1)} }
        @keyframes lp-rainbow { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
      `}</style>
    </div>
  );
}

function ReelCell({ game, systems }: { game: GameInfo; systems: SystemInfo[] }) {
  const sysName = systems.find((s) => s.id === game.system_id)?.name ?? game.system_id;
  return (
    <div style={{ height: CELL_H, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12 }}>
      <div style={{ fontSize: 54, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.6))' }}>
        {genreEmoji(game.genre)}
      </div>
      <div style={{
        fontSize: 15, fontWeight: 700, color: '#cdbff0', textAlign: 'center', lineHeight: 1.2,
        maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {game.title}
      </div>
      <div style={{ fontSize: 10, color: '#6a6a85', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' }}>
        {sysName}{game.year ? ` · ${game.year}` : ''}
      </div>
    </div>
  );
}

function Chip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
      border: `1px solid ${active ? 'transparent' : 'rgba(124,58,237,.3)'}`,
      background: active
        ? 'linear-gradient(135deg, #7c3aed, #b026ff)'
        : 'rgba(124,58,237,.06)',
      color: active ? '#fff' : '#a78bda',
      boxShadow: active ? '0 0 16px rgba(124,58,237,.6)' : undefined,
      transition: 'all .15s',
      whiteSpace: 'nowrap',
    }}>
      {label}
      <span style={{ opacity: 0.6, fontSize: 11, marginLeft: 3 }}>{fmtNum(count)}</span>
    </button>
  );
}

function TagEl({ children, meta }: { children: React.ReactNode; meta?: boolean }) {
  return (
    <span style={{
      padding: '6px 16px', borderRadius: 999, fontSize: meta ? 12 : 14, fontWeight: meta ? 500 : 700,
      background: meta ? 'rgba(255,255,255,.04)' : 'rgba(124,58,237,.18)',
      border: `1px solid ${meta ? 'rgba(255,255,255,.1)' : 'rgba(124,58,237,.5)'}`,
      color: meta ? '#9a9ab0' : '#c4a8ff',
      fontFamily: meta ? 'ui-monospace, monospace' : undefined,
    }}>
      {children}
    </span>
  );
}

function BtnPlay({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      position: 'relative', fontFamily: 'inherit', fontSize: 19, fontWeight: 800,
      letterSpacing: '0.14em', textTransform: 'uppercase', padding: '20px 44px',
      borderRadius: 999, cursor: disabled ? 'not-allowed' : 'pointer',
      border: '2px solid #00f0ff', background: 'rgba(0,240,255,.08)', color: '#00f0ff',
      boxShadow: '0 0 20px rgba(0,240,255,.4), inset 0 0 20px rgba(0,240,255,.06)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 14,
      opacity: disabled ? 0.4 : 1,
      transition: 'all .18s',
    }}>
      {children}
    </button>
  );
}

function BtnReroll({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      position: 'relative', fontFamily: 'inherit', fontSize: 19, fontWeight: 800,
      letterSpacing: '0.14em', textTransform: 'uppercase', padding: '20px 44px',
      borderRadius: 999, cursor: disabled ? 'not-allowed' : 'pointer',
      border: '2px solid #ff006e', background: 'rgba(255,0,110,.08)', color: '#ff006e',
      boxShadow: '0 0 20px rgba(255,0,110,.4), inset 0 0 20px rgba(255,0,110,.06)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 14,
      opacity: disabled ? 0.4 : 1,
      transition: 'all .18s',
    }}>
      {children}
    </button>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{
        fontSize: 26, fontWeight: 900, fontFamily: 'ui-monospace, monospace',
        color: color ?? '#fff',
        textShadow: color ? `0 0 12px ${color}80` : undefined,
      }}>
        {fmtNum(value)}
      </span>
      <span style={{ fontSize: 10, color: '#6a6a85', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
      borderRadius: 4, padding: '1px 7px', color: '#aaa',
    }}>
      {children}
    </kbd>
  );
}
