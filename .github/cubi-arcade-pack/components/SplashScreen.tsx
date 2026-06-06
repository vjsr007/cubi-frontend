// ═══════════════════════════════════════════════════════════════
// SplashScreen.tsx — Cubi boot-up
// Drop-in. Shows for ~3s on app start, then fades out.
// Usage:
//   import SplashScreen from './components/SplashScreen';
//   <SplashScreen onDone={() => setBooted(true)} />
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

interface Props {
  /** Called once the boot sequence finishes. */
  onDone?: () => void;
  /** Total boot duration in ms. Default 3200. */
  duration?: number;
  /** Hide the "Press Start" overlay and auto-advance. Default true. */
  autoAdvance?: boolean;
  /** Optional version tag shown in the top-left HUD. */
  version?: string;
}

const BOOT_STEPS = [
  '◂ DETECTING EMUDECK…',
  '◂ LOADING CORES · MAME · MGBA · MUPEN64',
  '◂ SCANNING ROM LIBRARY…',
  '◂ FOUND 1 247 GAMES ACROSS 41 SYSTEMS',
  '◂ SCRAPING MEDIA · SCREENSCRAPER',
  '◂ INITIALIZING GAMEPAD',
  '◂ READY',
];

export const SplashScreen: React.FC<Props> = ({
  onDone,
  duration = 3200,
  autoAdvance = true,
  version = 'v0.13.1',
}) => {
  const [step, setStep] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => setStep((s) => (s + 1) % BOOT_STEPS.length), 500);
    if (!autoAdvance) return () => clearInterval(tick);
    const fade = setTimeout(() => setFading(true), duration - 400);
    const end = setTimeout(() => onDone?.(), duration);
    return () => { clearInterval(tick); clearTimeout(fade); clearTimeout(end); };
  }, [duration, autoAdvance, onDone]);

  // Stars (generated once)
  const stars = React.useMemo(
    () => Array.from({ length: 60 }, () => ({
      l: Math.random() * 100,
      t: Math.random() * 100,
      d: Math.random() * 3,
    })),
    []
  );

  return (
    <div className={`cubi-splash ${fading ? 'fading' : ''}`}>
      <div className="cubi-splash-stars">
        {stars.map((s, i) => (
          <i key={i} style={{ left: `${s.l}%`, top: `${s.t}%`, animationDelay: `${s.d}s` }} />
        ))}
      </div>
      <div className="cubi-splash-sun" />
      <div className="cubi-splash-floor" />

      <div className="cubi-splash-hud cubi-splash-tl">
        CUBI {version}<br /><b>● READY</b>
      </div>
      <div className="cubi-splash-hud cubi-splash-tr">
        TAURI · WEBVIEW<br /><b>1920×1080 @ 60FPS</b>
      </div>
      <div className="cubi-splash-hud cubi-splash-bl">◂ INSERT COIN</div>
      <div className="cubi-splash-hud cubi-splash-br">
        MEM <b>16384K</b> · CPU <b>68K</b>
      </div>

      <div className="cubi-splash-core">
        <div className="cubi-splash-logo">
          <div className="cubi-splash-mark">C</div>
        </div>
        <div className="cubi-splash-wordmark">CUBI</div>
        <div className="cubi-splash-tagline">· EMULATION FRONTEND ·</div>
        <div className="cubi-splash-track"><div className="cubi-splash-fill" /></div>
        <div className="cubi-splash-status" dangerouslySetInnerHTML={{ __html: BOOT_STEPS[step] }} />
        {!autoAdvance && <div className="cubi-splash-press">Press Start</div>}
      </div>

      <div className="cubi-splash-sweep" />
      <div className="cubi-splash-scan" />
    </div>
  );
};

export default SplashScreen;
