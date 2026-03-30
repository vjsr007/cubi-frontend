import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useUiStore } from '../stores/uiStore';
import { useConfigStore } from '../stores/configStore';
import { api } from '../lib/invoke';
import type { SystemEmulatorInfo, EmulatorOverride } from '../types';

// ── Styles ────────────────────────────────────────────────────────────────

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

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  color: 'rgba(255,255,255,0.7)',
  padding: '5px 12px',
  cursor: 'pointer',
  fontSize: 12,
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const badgeStyle = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 10,
  padding: '2px 8px',
  borderRadius: 10,
  fontWeight: 600,
  background: active ? 'rgba(16,124,16,0.25)' : 'rgba(255,255,255,0.06)',
  color: active ? '#52b043' : 'rgba(255,255,255,0.35)',
  border: `1px solid ${active ? 'rgba(16,124,16,0.4)' : 'transparent'}`,
});

// ── Emulator-name → theme colour ─────────────────────────────────────────
const EMULATOR_COLORS: Record<string, string> = {
  Dolphin:    '#7ec8e3',
  PCSX2:      '#0070d1',
  PPSSPP:     '#ffa500',
  DuckStation:'#00aaff',
  RPCS3:      '#003087',
  xemu:       '#52b043',
  Ryujinx:    '#e11f29',
  RetroArch:  '#9c27b0',
};

// ── Row component ─────────────────────────────────────────────────────────

interface RowProps {
  info: SystemEmulatorInfo;
  override: EmulatorOverride;
  onChange: (next: EmulatorOverride) => void;
}

function EmulatorRow({ info, override, onChange }: RowProps) {
  const hasOverride =
    !!(override.exe_path || override.extra_args || override.core);

  const browseExe = async () => {
    const selected = await open({
      title: `Select ${info.emulator_name} executable`,
      filters: [{ name: 'Executable', extensions: ['exe', 'bat', 'cmd', ''] }],
      multiple: false,
    });
    if (typeof selected === 'string' && selected) {
      onChange({ ...override, exe_path: selected });
    }
  };

  const color = EMULATOR_COLORS[info.emulator_name] ?? 'rgba(255,255,255,0.5)';

  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 10,
        background: 'var(--color-surface-2, #1a1a2e)',
        border: `1px solid ${hasOverride ? 'rgba(16,124,16,0.3)' : 'var(--color-border, rgba(255,255,255,0.07))'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--color-text, #fff)', fontWeight: 700, fontSize: 14, minWidth: 140 }}>
          {info.system_name}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 10px',
            borderRadius: 8,
            background: `${color}22`,
            color,
            border: `1px solid ${color}44`,
            flexShrink: 0,
          }}
        >
          {info.emulator_name}
        </span>
        {hasOverride && (
          <span style={badgeStyle(true)}>● customized</span>
        )}
        {info.detected_path && !override.exe_path && (
          <span
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.25)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
            title={info.detected_path}
          >
            Auto: {info.detected_path}
          </span>
        )}
        {!info.detected_path && !override.exe_path && (
          <span style={{ fontSize: 11, color: 'rgba(255,80,80,0.7)' }}>⚠ not detected</span>
        )}
      </div>

      {/* Exe path override */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 90, flexShrink: 0 }}>
          Exe path
        </span>
        <input
          type="text"
          value={override.exe_path ?? ''}
          onChange={(e) => onChange({ ...override, exe_path: e.target.value || undefined })}
          placeholder={info.detected_path ?? 'Path to executable…'}
          style={inputStyle}
        />
        <button onClick={browseExe} style={btnStyle} type="button">Browse</button>
        {override.exe_path && (
          <button
            type="button"
            onClick={() => onChange({ ...override, exe_path: undefined })}
            style={{ ...btnStyle, color: 'rgba(255,80,80,0.7)' }}
            title="Clear override"
          >
            ✕
          </button>
        )}
      </div>

      {/* Launch args override */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 90, flexShrink: 0 }}>
          Launch args
        </span>
        <input
          type="text"
          value={override.extra_args ?? ''}
          onChange={(e) => onChange({ ...override, extra_args: e.target.value || undefined })}
          placeholder={`{rom} placeholder is replaced with the ROM path`}
          style={inputStyle}
        />
        {override.extra_args && (
          <button
            type="button"
            onClick={() => onChange({ ...override, extra_args: undefined })}
            style={{ ...btnStyle, color: 'rgba(255,80,80,0.7)' }}
            title="Clear override"
          >
            ✕
          </button>
        )}
      </div>

      {/* RetroArch core override */}
      {info.is_retroarch && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 90, flexShrink: 0 }}>
            RA core
          </span>
          <input
            type="text"
            value={override.core ?? ''}
            onChange={(e) => onChange({ ...override, core: e.target.value || undefined })}
            placeholder={info.default_core ?? 'core_libretro (without .dll)'}
            style={inputStyle}
          />
          {override.core && (
            <button
              type="button"
              onClick={() => onChange({ ...override, core: undefined })}
              style={{ ...btnStyle, color: 'rgba(255,80,80,0.7)' }}
              title="Reset to default core"
            >
              ✕
            </button>
          )}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
            default: {info.default_core}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export function EmulatorConfigPage() {
  const { navigateTo, showToast } = useUiStore();
  const { config, saveConfig } = useConfigStore();

  const [systems, setSystems] = useState<SystemEmulatorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Local overrides map — keyed by system_id
  const [overrides, setOverrides] = useState<Record<string, EmulatorOverride>>({});

  useEffect(() => {
    api.getAllEmulatorInfo().then((data) => {
      setSystems(data);
      // Seed local state from current config
      const initial: Record<string, EmulatorOverride> = {};
      for (const info of data) {
        const cfg = config?.emulators?.[info.system_id];
        if (cfg) initial[info.system_id] = { ...cfg };
      }
      setOverrides(initial);
      setLoading(false);
    }).catch((e) => {
      showToast(`Failed to load emulator info: ${e}`, 'error');
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setOverride = (systemId: string, next: EmulatorOverride) => {
    setOverrides((prev) => ({ ...prev, [systemId]: next }));
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      // Strip empty overrides to keep config clean
      const cleaned: Record<string, EmulatorOverride> = {};
      for (const [sysId, ov] of Object.entries(overrides)) {
        if (ov.exe_path || ov.extra_args || ov.core) {
          cleaned[sysId] = ov;
        }
      }
      await saveConfig({ ...config, emulators: cleaned });
      showToast('Emulator settings saved', 'success');
    } catch (e) {
      showToast(`Save failed: ${e}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    setOverrides({});
    showToast('All overrides cleared (save to apply)', 'info');
  };

  const filtered = search
    ? systems.filter(
        (s) =>
          s.system_name.toLowerCase().includes(search.toLowerCase()) ||
          s.emulator_name.toLowerCase().includes(search.toLowerCase()) ||
          s.system_id.toLowerCase().includes(search.toLowerCase()),
      )
    : systems;

  // Group by emulator
  const groups: Record<string, SystemEmulatorInfo[]> = {};
  for (const s of filtered) {
    if (!groups[s.emulator_name]) groups[s.emulator_name] = [];
    groups[s.emulator_name].push(s);
  }

  const customizedCount = Object.values(overrides).filter(
    (o) => o.exe_path || o.extra_args || o.core,
  ).length;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-background, #0d0d0d)',
        color: 'var(--color-text, #fff)',
        fontFamily: 'var(--font-family, system-ui)',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: '12px 20px',
          background: 'rgba(0,0,0,0.5)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          rowGap: 8,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => navigateTo('settings')}
          style={{ ...btnStyle, background: 'rgba(16,124,16,0.15)', borderColor: 'rgba(16,124,16,0.4)', color: '#52b043' }}
        >
          ← Back
        </button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>🎮 Emulator Settings</span>
        {customizedCount > 0 && (
          <span style={badgeStyle(true)}>{customizedCount} customized</span>
        )}
        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search systems…"
          style={{ ...inputStyle, flex: '0 0 180px', marginLeft: 'auto' }}
        />
        <button
          type="button"
          onClick={handleResetAll}
          style={{ ...btnStyle, color: 'rgba(255,80,80,0.7)', borderColor: 'rgba(255,80,80,0.3)' }}
          title="Clear all custom overrides"
        >
          Reset all
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            ...btnStyle,
            background: 'rgba(16,124,16,0.4)',
            borderColor: 'rgba(16,124,16,0.6)',
            color: '#52b043',
            fontWeight: 700,
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Info banner */}
      <div
        style={{
          padding: '8px 20px',
          background: 'rgba(0,0,0,0.3)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.35)',
          flexShrink: 0,
        }}
      >
        Override the executable path, launch arguments, or RetroArch core for any system.
        Leave a field blank to use the auto-detected default.
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            Loading emulator info…
          </div>
        ) : (
          Object.entries(groups).map(([emulatorName, sysList]) => (
            <div key={emulatorName} style={{ marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: EMULATOR_COLORS[emulatorName] ?? 'rgba(255,255,255,0.5)',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 3,
                    height: 16,
                    borderRadius: 2,
                    background: EMULATOR_COLORS[emulatorName] ?? '#555',
                  }}
                />
                {emulatorName}
                <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                  ({sysList.length} {sysList.length === 1 ? 'system' : 'systems'})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sysList.map((info) => (
                  <EmulatorRow
                    key={info.system_id}
                    info={info}
                    override={overrides[info.system_id] ?? {}}
                    onChange={(next) => setOverride(info.system_id, next)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
