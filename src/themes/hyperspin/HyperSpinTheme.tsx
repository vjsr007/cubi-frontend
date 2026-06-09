// ═══════════════════════════════════════════════════════════════
// HyperSpinTheme.tsx — Faithful HyperSpin recreation for Cubi
// Drop in src/themes/hyperspin/HyperSpinTheme.tsx (replace existing)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import './HyperSpin.css';

// ── Types ────────────────────────────────────────────────────────
export interface HSGame {
  id: string;
  title: string;
  systemId: string;
  systemName: string;
  year?: number;
  genre?: string;
  developer?: string;
  publisher?: string;
  players?: string;
  rating?: number;        // 0..5
  playCount?: number;
  description?: string;
  /** PNG/SVG with transparent background — the game's "wheel art" */
  wheelArt?: string;
  /** PNG with transparent background, used as the big "game logo" over video */
  logoArt?: string;
  /** Game video (mp4/webm) path. If null, fanart is shown instead. */
  videoPath?: string;
  /** Static screenshot/fanart used while video loads or if missing */
  fanart?: string;
  /** Special art — themed character/object PNG with transparent bg */
  specialArt?: string;
}

interface Props {
  games: HSGame[];
  initialIndex?: number;
  /** Called when user presses A on the focused game */
  onLaunch?: (game: HSGame) => void;
  /** Called when user holds Y to favorite */
  onFavorite?: (game: HSGame) => void;
  /** Called when user presses START */
  onMenu?: () => void;
  /** Called when user presses Back/B at top of wheel */
  onExit?: () => void;
  /** Sound URLs (web audio) — optional */
  sounds?: {
    tick?: string;
    confirm?: string;
    back?: string;
  };
}

const ANGLE_PER_ITEM = 14;   // degrees between wheel items (HyperSpin uses 12–16)
const VISIBLE_ABOVE  = 9;
const SCROLL_DEBOUNCE = 140; // ms

export const HyperSpinTheme: React.FC<Props> = ({
  games,
  initialIndex = 0,
  onLaunch,
  onFavorite,
  onMenu,
  onExit,
  sounds,
}) => {
  const [focusIdx, setFocusIdx] = useState(initialIndex);
  const [videoReady, setVideoReady] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const lastKeyAt = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);
  const tickBuf = useRef<AudioBuffer | null>(null);

  const game = games[focusIdx];

  // ── Audio: pre-decode tick sound (or synthesize on the fly) ──
  useEffect(() => {
    if (typeof AudioContext === 'undefined') return;
    audioCtx.current = new AudioContext();
    if (sounds?.tick) {
      fetch(sounds.tick)
        .then(r => r.arrayBuffer())
        .then(b => audioCtx.current!.decodeAudioData(b))
        .then(buf => (tickBuf.current = buf))
        .catch(() => {});
    }
    return () => { audioCtx.current?.close(); };
  }, [sounds?.tick]);

  const playTick = useCallback(() => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    if (tickBuf.current) {
      const src = ctx.createBufferSource();
      src.buffer = tickBuf.current;
      src.connect(ctx.destination);
      src.start();
    } else {
      // Synthesize a quick blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    }
  }, []);

  const playConfirm = useCallback(() => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  }, []);

  // ── Scroll handlers ──────────────────────────────────────────
  const move = useCallback((delta: number) => {
    setTransitioning(true);
    setFocusIdx(i => {
      const n = (i + delta + games.length) % games.length;
      return n;
    });
    setVideoReady(false);
    playTick();
    setTimeout(() => setTransitioning(false), 380);
  }, [games.length, playTick]);

  // Letter jump (LB/RB)
  const jumpLetter = useCallback((dir: 1 | -1) => {
    const cur = games[focusIdx];
    const curLetter = (cur.title[0] || '').toUpperCase();
    let i = focusIdx;
    if (dir > 0) {
      do { i = (i + 1) % games.length; } while (games[i].title[0]?.toUpperCase() === curLetter && i !== focusIdx);
    } else {
      do { i = (i - 1 + games.length) % games.length; } while (games[i].title[0]?.toUpperCase() === curLetter && i !== focusIdx);
    }
    setFocusIdx(i);
    setVideoReady(false);
    playTick();
  }, [focusIdx, games, playTick]);

  // ── Keyboard + Gamepad ────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKeyAt.current < SCROLL_DEBOUNCE) return;
      lastKeyAt.current = now;
      switch (e.key) {
        case 'ArrowUp':   e.preventDefault(); move(-1); break;
        case 'ArrowDown': e.preventDefault(); move(1);  break;
        case 'ArrowLeft': e.preventDefault(); jumpLetter(-1); break;
        case 'ArrowRight':e.preventDefault(); jumpLetter(1); break;
        case 'Enter': case ' ':
          e.preventDefault(); playConfirm(); onLaunch?.(game); break;
        case 'Escape': case 'Backspace':
          e.preventDefault(); onExit?.(); break;
        case 'f': case 'F':
          onFavorite?.(game); break;
        case 'Tab':
          e.preventDefault(); onMenu?.(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, jumpLetter, game, onLaunch, onExit, onFavorite, onMenu, playConfirm]);

  // Gamepad polling
  useEffect(() => {
    let raf = 0; let running = true;
    const poll = () => {
      if (!running) return;
      const gp = navigator.getGamepads?.()[0];
      const now = Date.now();
      if (gp && now - lastKeyAt.current > SCROLL_DEBOUNCE) {
        const ay = gp.axes[1] ?? 0;
        const ax = gp.axes[0] ?? 0;
        if (gp.buttons[12]?.pressed || ay < -0.5) { lastKeyAt.current = now; move(-1); }
        else if (gp.buttons[13]?.pressed || ay > 0.5) { lastKeyAt.current = now; move(1); }
        else if (gp.buttons[14]?.pressed || ax < -0.5) { lastKeyAt.current = now; jumpLetter(-1); }
        else if (gp.buttons[15]?.pressed || ax > 0.5) { lastKeyAt.current = now; jumpLetter(1); }
        else if (gp.buttons[4]?.pressed) { lastKeyAt.current = now; jumpLetter(-1); }
        else if (gp.buttons[5]?.pressed) { lastKeyAt.current = now; jumpLetter(1); }
        else if (gp.buttons[0]?.pressed) { lastKeyAt.current = now + 200; playConfirm(); onLaunch?.(game); }
        else if (gp.buttons[1]?.pressed) { lastKeyAt.current = now + 200; onExit?.(); }
        else if (gp.buttons[3]?.pressed) { lastKeyAt.current = now + 200; onFavorite?.(game); }
        else if (gp.buttons[9]?.pressed) { lastKeyAt.current = now + 200; onMenu?.(); }
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => { running = false; cancelAnimationFrame(raf); };
  }, [move, jumpLetter, game, onLaunch, onExit, onFavorite, onMenu, playConfirm]);

  // ── Visible wheel items ──────────────────────────────────────
  const wheelItems = useMemo(() => {
    const items: { game: HSGame; idx: number; offset: number }[] = [];
    for (let d = -VISIBLE_ABOVE; d <= VISIBLE_ABOVE; d++) {
      const i = (focusIdx + d + games.length) % games.length;
      items.push({ game: games[i], idx: i, offset: d });
    }
    return items;
  }, [focusIdx, games]);

  // Letter index ----------------------------------------------------
  const letters = useMemo(() => {
    const has = new Set<string>();
    for (const g of games) has.add((g.title[0] || '#').toUpperCase());
    const cur = (game?.title[0] || '#').toUpperCase();
    return '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => ({
      letter: c,
      has: has.has(c),
      current: c === cur,
    }));
  }, [games, game]);

  if (!game) return null;

  return (
    <div className={`hs-stage ${transitioning ? 'hs-transitioning' : ''}`}>
      {/* Background layers */}
      <div className="hs-bg" style={game.fanart ? { backgroundImage: `url(${game.fanart})` } : undefined} />
      <div className="hs-bg-overlay" />
      <div className="hs-stars" aria-hidden>
        {Array.from({ length: 60 }).map((_, i) => (
          <i key={i} style={{ left: `${(i*17)%100}%`, top: `${(i*31)%100}%`, animationDelay: `${(i%5)*0.7}s` }}/>
        ))}
      </div>

      {/* Special art (themed character) */}
      {game.specialArt && (
        <div className="hs-special" key={game.id /* re-trigger anim on change */}>
          <img src={game.specialArt} alt="" />
        </div>
      )}

      {/* Video / fanart preview */}
      <div className="hs-video-wrap" key={game.id + '-video'}>
        {game.videoPath ? (
          <video
            className="hs-video"
            src={game.videoPath}
            autoPlay loop muted playsInline
            onCanPlay={() => setVideoReady(true)}
            style={{ opacity: videoReady ? 1 : 0 }}
          />
        ) : null}
        {game.fanart && (
          <img className="hs-video-fanart" src={game.fanart} alt="" style={{ opacity: videoReady ? 0 : 1 }}/>
        )}
        <div className="hs-video-scanlines" />
        <div className="hs-video-vignette" />
      </div>

      {/* Game logo (PNG over video) */}
      {game.logoArt ? (
        <img className="hs-gamelogo" src={game.logoArt} alt={game.title} />
      ) : (
        <div className="hs-gamelogo hs-gamelogo--text">{game.title}</div>
      )}

      {/* Marquee top */}
      <div className="hs-marquee">
        <div className="hs-marquee-system">
          <span className="hs-marquee-system-name">▌ {game.systemName} ▐</span>
        </div>
        <div className="hs-marquee-clock">
          {new Date().toLocaleString('en', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).toUpperCase()} · {games.length} GAMES
        </div>
      </div>

      {/* Letter index */}
      <div className="hs-letters">
        {letters.map(l => (
          <div key={l.letter} className={`hs-ltr ${l.current ? 'cur' : l.has ? 'has' : ''}`}>
            {l.letter}
          </div>
        ))}
      </div>

      {/* Wheel selector */}
      <div className="hs-wheel-selector"><span className="line"/><span className="arrow"/></div>

      {/* The curved wheel */}
      <div className="hs-wheel" aria-hidden>
        <div className="hs-wheel-mask"/>
        <div className="hs-wheel-center">
          {wheelItems.map(({ game: g, idx, offset }) => {
            const rot = offset * ANGLE_PER_ITEM;
            const cls = offset === 0 ? 'focus' : Math.abs(offset) <= 2 ? 'near' : '';
            const opacity = offset === 0 ? 1 : Math.max(.15, 1 - Math.abs(offset)*0.15);
            const blur = Math.min(Math.abs(offset) * 0.3, 2);
            return (
              <div
                key={idx}
                className={`hs-wheel-item ${cls}`}
                style={{
                  transform: `rotate(${rot}deg)`,
                  opacity,
                  filter: blur ? `blur(${blur}px)` : 'none',
                  ['--rot' as any]: `${rot}deg`,
                }}
              >
                {g.wheelArt ? (
                  <div className="hs-wheel-art">
                    <img src={g.wheelArt} alt={g.title} />
                  </div>
                ) : (
                  <div className="hs-wheel-badge">
                    <span>{g.title}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="hs-info-bar">
        <div className="hs-info-row1">
          <span className="hs-info-system">▶ {game.systemName}</span>
          {game.genre && <span className="hs-info-genre">{game.genre}</span>}
          {typeof game.rating === 'number' && (
            <span className="hs-info-stars">{'★'.repeat(Math.round(game.rating))}{'☆'.repeat(5 - Math.round(game.rating))}</span>
          )}
          <div className="hs-info-meta">
            {game.year      && <span>YEAR <b>{game.year}</b></span>}
            {game.developer && <span>DEV <b>{game.developer.toUpperCase()}</b></span>}
            {game.players   && <span><b>{game.players}</b> PLAYERS</span>}
            {typeof game.playCount === 'number' && game.playCount > 0 && <span>PLAYED <b>{game.playCount}×</b></span>}
          </div>
        </div>
        <div className="hs-info-row2">
          <div>
            <div className="hs-info-title">{game.title}</div>
            {game.description && <div className="hs-info-desc">{game.description}</div>}
          </div>
        </div>
      </div>

      {/* HUD button hints */}
      <div className="hs-hud">
        <div><span>SELECT</span><span className="hs-hud-btn a">A</span></div>
        <div><span>BACK</span><span className="hs-hud-btn b">B</span></div>
        <div><span>FAVORITE</span><span className="hs-hud-btn y">Y</span></div>
        <div><span>EXIT</span><span className="hs-hud-btn x">X</span></div>
        <div><span>MENU</span><span className="hs-hud-btn start">START</span></div>
      </div>

      {/* Press start (visible during idle) */}
      <div className="hs-press">◂ Press Start ▸</div>

      {/* CRT overlay */}
      <div className="hs-crt"/>
    </div>
  );
};

export default HyperSpinTheme;
