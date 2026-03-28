import { useLibraryStore } from '../../stores/libraryStore';

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

export function SystemList() {
  const { systems, selectedSystemId, selectSystem, isLoadingSystems } = useLibraryStore();

  if (isLoadingSystems) {
    return (
      <div style={{ width: 192, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', padding: 8 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 44, borderRadius: 8, background: 'var(--color-surface-2)', marginBottom: 4, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  if (systems.length === 0) {
    return (
      <div style={{
        width: 192, background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', margin: 0 }}>
          No systems found.<br />Scan your ROMs in Settings.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      width: 192, background: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      overflowY: 'auto', flexShrink: 0,
    }}>
      <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid var(--color-border)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0, padding: '4px 8px' }}>
          Systems
        </p>
      </div>
      <div style={{ padding: 8 }}>
        {systems.map((sys) => {
          const active = selectedSystemId === sys.id;
          return (
            <button
              key={sys.id}
              onClick={() => selectSystem(sys.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: active ? 'var(--color-primary)' : 'transparent',
                color: active ? '#fff' : 'var(--color-text)',
                marginBottom: 2,
                textAlign: 'left',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)';
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: SYSTEM_COLORS[sys.id] ?? '#888',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sys.name}
                </p>
                <p style={{ fontSize: 11, margin: 0, color: active ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)' }}>
                  {sys.game_count} games
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
