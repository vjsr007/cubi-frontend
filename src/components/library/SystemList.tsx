import { useLibraryStore } from '../../stores/libraryStore';
import { useI18nStore } from '../../stores/i18nStore';
import { SystemLogo } from '../common/SystemLogo';
import { SYSTEM_LOGOS } from '../../assets/system-logos';

const SYSTEM_COLORS: Record<string, string> = {
  nes: '#e53e3e', snes: '#6b46c1', n64: '#2b6cb0',
  gb: '#276749', gbc: '#2d3748', gba: '#553c9a',
  nds: '#c05621', gamecube: '#6b46c1', wii: '#4a5568',
  wiiu: '#2b6cb0', switch: '#e53e3e',
  ps1: '#1a365d', ps2: '#003087', ps3: '#1a1a2e', psp: '#003087',
  genesis: '#1a365d', mastersystem: '#c05621',
  saturn: '#553c9a', dreamcast: '#e53e3e',
  xbox: '#276749', arcade: '#7b341e',
};

const cardStyle = (active: boolean): React.CSSProperties => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '12px 6px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  background: active ? 'var(--color-primary)' : 'transparent',
  color: active ? '#fff' : 'var(--color-text)',
  marginBottom: 2,
  textAlign: 'center',
  transition: 'background 0.1s',
});

export function SystemList() {
  const { systems, selectedSystemId, selectSystem, isLoadingSystems } = useLibraryStore();
  const { t } = useI18nStore();

  if (isLoadingSystems) {
    return (
      <div style={{ width: 144, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', padding: 8 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 72, borderRadius: 8, background: 'var(--color-surface-2)', marginBottom: 4, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  if (systems.length === 0) {
    return (
      <div style={{
        width: 144, background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', margin: 0, whiteSpace: 'pre-line' }}>
          {t('library.noSystemsScan')}
        </p>
      </div>
    );
  }

  const totalGames = systems.reduce((sum, s) => sum + s.game_count, 0);
  const allActive = selectedSystemId === '__all__';

  return (
    <div style={{
      width: 144, background: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      overflowY: 'auto', flexShrink: 0,
    }}>
      <div style={{ padding: 8 }}>
        {/* ALL virtual system */}
        <button
          onClick={() => selectSystem('__all__')}
          style={cardStyle(allActive)}
          onMouseEnter={(e) => { if (!allActive) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'; }}
          onMouseLeave={(e) => { if (!allActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <span style={{ fontSize: 28, lineHeight: 1 }}>🎮</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: allActive ? 'rgba(255,255,255,0.9)' : 'var(--color-text-muted)' }}>
            {totalGames} {t('library.games')}
          </span>
        </button>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0 6px' }} />

        {systems.map((sys) => {
          const active = selectedSystemId === sys.id;
          return (
            <button
              key={sys.id}
              onClick={() => selectSystem(sys.id)}
              style={cardStyle(active)}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {SYSTEM_LOGOS[sys.id] ? (
                <SystemLogo
                  systemId={sys.id}
                  size={36}
                  style={{
                    filter: active ? 'brightness(1.1)' : 'brightness(0.7)',
                    transition: 'filter 0.15s',
                  }}
                />
              ) : (
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: SYSTEM_COLORS[sys.id] ?? '#555',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff',
                }}>
                  {sys.name.slice(0, 3).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.85)' : 'var(--color-text-muted)', lineHeight: 1.2 }}>
                {sys.game_count} {t('library.games')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
