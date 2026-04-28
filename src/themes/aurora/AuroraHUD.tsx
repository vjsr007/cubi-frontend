import type { SystemInfo } from '../../types';

interface AuroraHUDProps {
  systems: SystemInfo[];
  systemIndex: number;
  totalGames: number;
  playCount: number;
  userName?: string;
}

/** Simple geometric avatar */
function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #ff6b35 0%, #cc2244 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        fontWeight: 900,
        color: 'white',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        border: '2px solid rgba(255,255,255,0.2)',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {initial}
    </div>
  );
}

/** Xbox 360 "G" gamerscore icon */
function GScore() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#52b043" strokeWidth="2" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="#52b043"
        fontSize="11"
        fontWeight="bold"
        fontFamily="Arial"
      >
        G
      </text>
    </svg>
  );
}

export function AuroraHUD({
  systems,
  systemIndex,
  totalGames,
  playCount,
  userName = 'Player 1',
}: AuroraHUDProps) {
  const system = systems[systemIndex];

  return (
    <>
      {/* ── Top-Left: User Info ── */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 20,
        }}
      >
        <Avatar name={userName} />
        <div>
          <div
            style={{
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'Arial, sans-serif',
              letterSpacing: '0.02em',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}
          >
            {userName}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 2,
            }}
          >
            <GScore />
            <span
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: 11,
                fontFamily: 'Arial, sans-serif',
                textShadow: '0 1px 3px rgba(0,0,0,0.7)',
              }}
            >
              {playCount} / {totalGames}
            </span>
          </div>
        </div>
      </div>

      {/* ── Top-Right: System Name ── */}
      {system && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 20,
          }}
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Arial, sans-serif',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}
          >
            {system.full_name ?? system.name}
          </span>
          {/* System count badge */}
          <span
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              padding: '1px 7px',
              fontSize: 10,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {system.game_count ?? totalGames}
          </span>
        </div>
      )}
    </>
  );
}

// ── System Selector (LB/RB) ──────────────────────────────────
interface AuroraSystemSelectorProps {
  systems: SystemInfo[];
  systemIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

export function AuroraSystemSelector({
  systems,
  systemIndex,
  onPrev,
  onNext,
}: AuroraSystemSelectorProps) {
  const system = systems[systemIndex];
  if (!system) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        zIndex: 20,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        padding: '0 4px',
      }}
    >
      <button
        onClick={onPrev}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.6)',
          fontSize: 18,
          cursor: 'pointer',
          padding: '6px 10px',
          lineHeight: 1,
        }}
      >
        ‹
      </button>
      <span
        style={{
          color: 'white',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '8px 8px',
          minWidth: 140,
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
        }}
      >
        {system.full_name ?? system.name}
      </span>
      <button
        onClick={onNext}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.6)',
          fontSize: 18,
          cursor: 'pointer',
          padding: '6px 10px',
          lineHeight: 1,
        }}
      >
        ›
      </button>
    </div>
  );
}

// ── Bottom Info Bar ───────────────────────────────────────────
interface AuroraInfoBarProps {
  title: string;
  current: number;
  total: number;
}

export function AuroraInfoBar({ title, current, total }: AuroraInfoBarProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 36,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        zIndex: 20,
        pointerEvents: 'none',
      }}
    >
      <h2
        style={{
          color: 'white',
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          fontFamily: 'Arial, sans-serif',
          textShadow: '0 2px 12px rgba(0,0,0,0.9), var(--text-glow-green)',
          letterSpacing: '0.02em',
        }}
      >
        {title}
      </h2>
      <span
        style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: 12,
          fontFamily: 'Arial, sans-serif',
          letterSpacing: '0.04em',
        }}
      >
        {current} de {total}
      </span>
    </div>
  );
}

// ── Bottom Ticker ─────────────────────────────────────────────
export function AuroraTicker({ systemName }: { systemName: string }) {
  const text = `▌ ${systemName}  ◀ LB / RB ▶  ←/→ Navigate   A Launch   Start Settings ▐`;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 26,
        background: 'rgba(0,0,0,0.7)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          whiteSpace: 'nowrap',
          color: 'rgba(200,200,200,0.7)',
          fontSize: 10,
          fontFamily: 'Arial, sans-serif',
          letterSpacing: '0.05em',
          animation: 'aurora-ticker 30s linear infinite',
          paddingLeft: '100%',
        }}
      >
        {text} &nbsp;&nbsp;&nbsp; {text} &nbsp;&nbsp;&nbsp; {text}
      </div>
    </div>
  );
}
