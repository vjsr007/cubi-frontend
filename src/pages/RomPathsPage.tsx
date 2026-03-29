import { useState, useEffect, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useUiStore } from '../stores/uiStore';
import { useConfigStore } from '../stores/configStore';
import { api } from '../lib/invoke';
import type { SystemDefInfo, RomPathOverride } from '../types';

// ── Styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--color-surface-2, #1a1a2e)',
  border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  color: 'var(--color-text, #fff)',
  outline: 'none',
  minWidth: 0,
};

const btnSmall: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  color: 'rgba(255,255,255,0.7)',
  padding: '5px 10px',
  cursor: 'pointer',
  fontSize: 11,
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

// ── Row ───────────────────────────────────────────────────────────────

interface SystemRowProps {
  system: SystemDefInfo;
  dataRoot: string;
  override?: string;
  onSet: (systemId: string, path: string) => void;
  onDelete: (systemId: string) => void;
}

function SystemRow({ system, dataRoot, override: customPath, onSet, onDelete }: SystemRowProps) {
  const defaultPath = dataRoot
    ? `${dataRoot}\\roms\\${system.folder_names[0] ?? system.id}`
    : `<data_root>/roms/${system.folder_names[0] ?? system.id}`;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(customPath ?? '');

  useEffect(() => {
    setDraft(customPath ?? '');
  }, [customPath]);

  const browse = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === 'string') {
        setDraft(selected);
        setEditing(true);
      }
    } catch { /* cancelled */ }
  };

  const save = () => {
    if (draft.trim()) {
      onSet(system.id, draft.trim());
      setEditing(false);
    }
  };

  const reset = () => {
    onDelete(system.id);
    setDraft('');
    setEditing(false);
  };

  const hasOverride = !!customPath;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* System name */}
      <div style={{ width: 180, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text, #fff)' }}>
          {system.name}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
          {system.full_name}
        </div>
      </div>

      {/* Status badge */}
      <div style={{ width: 80, flexShrink: 0 }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 10,
            background: hasOverride ? 'rgba(255,165,0,0.2)' : 'rgba(16,124,16,0.2)',
            color: hasOverride ? '#ffa500' : '#52b043',
            border: `1px solid ${hasOverride ? 'rgba(255,165,0,0.35)' : 'rgba(16,124,16,0.35)'}`,
          }}
        >
          {hasOverride ? 'CUSTOM' : 'DEFAULT'}
        </span>
      </div>

      {/* Path display / edit */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={defaultPath}
              style={inputStyle}
            />
            <button onClick={browse} style={btnSmall}>📂</button>
            <button
              onClick={save}
              style={{ ...btnSmall, background: 'rgba(16,124,16,0.25)', color: '#52b043', borderColor: 'rgba(16,124,16,0.4)' }}
            >
              ✓
            </button>
            <button
              onClick={() => { setEditing(false); setDraft(customPath ?? ''); }}
              style={{ ...btnSmall, color: 'rgba(255,255,255,0.5)' }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            style={{
              fontSize: 12,
              color: hasOverride ? 'var(--color-text, #fff)' : 'rgba(255,255,255,0.35)',
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={hasOverride ? customPath : defaultPath}
          >
            {hasOverride ? customPath : defaultPath}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {!editing && (
          <button onClick={() => setEditing(true)} style={btnSmall}>
            ✏️ Edit
          </button>
        )}
        {hasOverride && !editing && (
          <button
            onClick={reset}
            style={{ ...btnSmall, color: 'rgba(255,100,100,0.8)', borderColor: 'rgba(255,100,100,0.3)' }}
            title="Reset to default path"
          >
            ↩ Reset
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export function RomPathsPage() {
  const { showToast, navigateTo } = useUiStore();
  const { config } = useConfigStore();

  const [systems, setSystems] = useState<SystemDefInfo[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const dataRoot = config?.paths.data_root ?? '';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [sysList, ovList] = await Promise.all([
        api.getSystemRegistryList(),
        api.getRomPathOverrides(),
      ]);
      setSystems(sysList);
      const ovMap: Record<string, string> = {};
      for (const o of ovList) ovMap[o.system_id] = o.custom_path;
      setOverrides(ovMap);
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleSet = async (systemId: string, path: string) => {
    try {
      await api.setRomPathOverride(systemId, path);
      setOverrides((prev) => ({ ...prev, [systemId]: path }));
      showToast(`Custom path set for ${systemId}`, 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleDelete = async (systemId: string) => {
    try {
      await api.deleteRomPathOverride(systemId);
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[systemId];
        return next;
      });
      showToast(`${systemId} reset to default path`, 'info');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const filtered = systems.filter((s) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      s.id.includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.full_name.toLowerCase().includes(q)
    );
  });

  const overrideCount = Object.keys(overrides).length;

  return (
    <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => navigateTo('settings')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary, #7c5cfc)',
              cursor: 'pointer',
              fontSize: 14,
              padding: 0,
            }}
          >
            ← Settings
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text, #fff)', margin: 0 }}>
            ROM Paths
          </h1>
        </div>

        {/* Summary + filter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            {systems.length} systems registered
            {overrideCount > 0 && (
              <> · <span style={{ color: '#ffa500' }}>{overrideCount} custom override{overrideCount !== 1 ? 's' : ''}</span></>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <input
            type="text"
            placeholder="Filter systems..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ ...inputStyle, maxWidth: 220 }}
          />
        </div>

        {/* Info box */}
        <div
          style={{
            background: 'rgba(124,92,252,0.08)',
            border: '1px solid rgba(124,92,252,0.25)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: 'var(--color-primary, #7c5cfc)' }}>How it works:</strong>{' '}
          By default, each system's ROMs are loaded from{' '}
          <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 3 }}>
            {dataRoot || '<data_root>'}/roms/{'<system>'}
          </code>{' '}
          following EmulationStation convention. You can override any system's path to load ROMs from
          a different folder (e.g., a separate drive, NAS, or custom layout). Overridden systems
          skip the default folder during scanning.
        </div>

        {/* Table */}
        <div
          style={{
            background: 'var(--color-surface, #141422)',
            borderRadius: 12,
            border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
            overflow: 'hidden',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <div style={{ width: 180, flexShrink: 0 }}>System</div>
            <div style={{ width: 80, flexShrink: 0 }}>Status</div>
            <div style={{ flex: 1 }}>Path</div>
            <div style={{ width: 130, flexShrink: 0, textAlign: 'right' }}>Actions</div>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>
              Loading systems...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>
              No systems match "{filter}"
            </div>
          ) : (
            filtered.map((sys) => (
              <SystemRow
                key={sys.id}
                system={sys}
                dataRoot={dataRoot}
                override={overrides[sys.id]}
                onSet={handleSet}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
