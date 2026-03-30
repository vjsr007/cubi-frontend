import { useState, useEffect, useCallback } from 'react';
import { useUiStore } from '../stores/uiStore';
import { api } from '../lib/invoke';
import type { SettingDefinition, EmulatorSettingValue, ConfigWriterInfo, SettingCategory } from '../types';

// ── Styles ────────────────────────────────────────────────────────────────

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

const EMULATOR_COLORS: Record<string, string> = {
  RetroArch:   '#9c27b0',
  Dolphin:     '#7ec8e3',
  PCSX2:       '#0070d1',
  DuckStation: '#00aaff',
  PPSSPP:      '#ffa500',
  RPCS3:       '#003087',
  xemu:        '#52b043',
  Ryujinx:     '#e11f29',
};

const CATEGORY_LABELS: Record<SettingCategory, string> = {
  video: '🖥️ Video',
  audio: '🔊 Audio',
  system: '🌐 System',
  performance: '⚡ Performance',
};

const CATEGORY_ORDER: SettingCategory[] = ['video', 'system', 'audio', 'performance'];

// ── Setting Control ───────────────────────────────────────────────────────

interface SettingControlProps {
  def: SettingDefinition;
  value: string;
  onChange: (key: string, value: string) => void;
}

function SettingControl({ def, value, onChange }: SettingControlProps) {
  const isLocked = def.locked;
  const display = isLocked ? def.default_value : value;

  if (def.setting_type === 'bool') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          border: isLocked ? '1px solid rgba(255,80,80,0.2)' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            {def.display_name}
            {isLocked && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'rgba(255,80,80,0.15)', color: 'rgba(255,80,80,0.8)', fontWeight: 600 }}>
                🔒 LOCKED
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{def.description}</div>
        </div>
        <button
          onClick={() => !isLocked && onChange(def.key, display === 'true' ? 'false' : 'true')}
          disabled={isLocked}
          style={{
            width: 48,
            height: 26,
            borderRadius: 13,
            border: 'none',
            background: display === 'true' ? 'var(--color-primary, #6366f1)' : 'rgba(255,255,255,0.1)',
            position: 'relative',
            cursor: isLocked ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            flexShrink: 0,
            marginLeft: 16,
            opacity: isLocked ? 0.5 : 1,
          }}
        >
          <span style={{
            position: 'absolute',
            top: 3,
            left: display === 'true' ? 24 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </button>
      </div>
    );
  }

  if (def.setting_type === 'select' && def.options) {
    return (
      <div
        style={{
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
          {def.display_name}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{def.description}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {def.options.map((opt) => {
            const active = display === opt;
            return (
              <button
                key={opt}
                onClick={() => onChange(def.key, opt)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: active ? '2px solid var(--color-primary, #6366f1)' : '1px solid rgba(255,255,255,0.12)',
                  background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
                  color: active ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (def.setting_type === 'range') {
    const min = def.range_min ?? 0;
    const max = def.range_max ?? 100;
    const numVal = parseInt(display) || min;

    return (
      <div
        style={{
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
              {def.display_name}
            </span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary, #6366f1)', minWidth: 40, textAlign: 'right' }}>
            {numVal}%
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{def.description}</div>
        <input
          type="range"
          min={min}
          max={max}
          value={numVal}
          onChange={(e) => onChange(def.key, e.target.value)}
          style={{ width: '100%', accentColor: 'var(--color-primary, #6366f1)' }}
        />
      </div>
    );
  }

  return null;
}

// ── Preview Modal ─────────────────────────────────────────────────────────

interface PreviewModalProps {
  emulatorName: string;
  configFormat: string;
  content: string;
  onClose: () => void;
}

function PreviewModal({ emulatorName, configFormat, content, onClose }: PreviewModalProps) {
  const color = EMULATOR_COLORS[emulatorName] ?? '#888';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface, #1a1a2e)',
          borderRadius: 14,
          border: `1px solid ${color}44`,
          padding: 24,
          width: 600,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
              Config Preview
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: `${color}22`, color, border: `1px solid ${color}44` }}>
              {emulatorName}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              .{configFormat}
            </span>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(content)}
            style={{ ...btnStyle, background: 'rgba(16,124,16,0.15)', borderColor: 'rgba(16,124,16,0.4)', color: '#52b043' }}
          >
            📋 Copy
          </button>
        </div>
        <pre
          style={{
            flex: 1,
            overflow: 'auto',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: 8,
            padding: 14,
            fontSize: 12,
            fontFamily: '"Cascadia Code", "Fira Code", monospace',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5,
            margin: 0,
            whiteSpace: 'pre-wrap',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {content}
        </pre>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={btnStyle}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export function EmulatorSettingsPage() {
  const { navigateTo, showToast } = useUiStore();

  const [definitions, setDefinitions] = useState<SettingDefinition[]>([]);
  const [writers, setWriters] = useState<ConfigWriterInfo[]>([]);
  const [allValues, setAllValues] = useState<EmulatorSettingValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  // Local edits — keyed by "emulatorName::settingKey"
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [defs, wrs, vals] = await Promise.all([
        api.getSettingDefinitions(),
        api.getConfigWritersInfo(),
        api.getAllEmulatorSettings(),
      ]);
      setDefinitions(defs);
      setWriters(wrs);
      setAllValues(vals);
      if (wrs.length > 0 && !activeTab) {
        setActiveTab(wrs[0].emulator_name);
      }
    } catch (e) {
      showToast(`Failed to load: ${e}`, 'error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const getSettingValue = (emulatorName: string, key: string): string => {
    const editKey = `${emulatorName}::${key}`;
    if (editKey in localEdits) return localEdits[editKey];
    const stored = allValues.find((v) => v.emulator_name === emulatorName && v.setting_key === key);
    if (stored) return stored.value;
    const def = definitions.find((d) => d.key === key);
    return def?.default_value ?? '';
  };

  const handleChange = (emulatorName: string, key: string, value: string) => {
    setLocalEdits((prev) => ({ ...prev, [`${emulatorName}::${key}`]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(localEdits);
      for (const [compositeKey, value] of entries) {
        const [emulatorName, settingKey] = compositeKey.split('::');
        await api.setEmulatorSetting(emulatorName, settingKey, value);
      }
      setLocalEdits({});
      setDirty(false);
      // Reload from DB
      const vals = await api.getAllEmulatorSettings();
      setAllValues(vals);
      showToast(`${entries.length} setting${entries.length === 1 ? '' : 's'} saved`, 'success');
    } catch (e) {
      showToast(`Save failed: ${e}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!activeTab) return;
    try {
      await api.resetEmulatorSettings(activeTab);
      setLocalEdits((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (k.startsWith(`${activeTab}::`)) delete next[k];
        }
        return next;
      });
      const vals = await api.getAllEmulatorSettings();
      setAllValues(vals);
      showToast(`${activeTab} settings reset to defaults`, 'info');
    } catch (e) {
      showToast(`Reset failed: ${e}`, 'error');
    }
  };

  const handlePreview = async () => {
    if (!activeTab) return;
    // First save any pending local edits for this emulator
    const pending = Object.entries(localEdits).filter(([k]) => k.startsWith(`${activeTab}::`));
    if (pending.length > 0) {
      for (const [compositeKey, value] of pending) {
        const [emulatorName, settingKey] = compositeKey.split('::');
        await api.setEmulatorSetting(emulatorName, settingKey, value);
      }
    }
    try {
      const content = await api.previewEmulatorConfig(activeTab);
      setPreviewContent(content);
    } catch (e) {
      showToast(`Preview failed: ${e}`, 'error');
    }
  };

  const activeWriter = writers.find((w) => w.emulator_name === activeTab);

  // Group definitions by category, filtered to supported settings
  const groupedSettings: Record<SettingCategory, SettingDefinition[]> = {
    video: [], audio: [], system: [], performance: [],
  };
  if (activeWriter) {
    for (const def of definitions) {
      if (activeWriter.supported_settings.includes(def.key)) {
        const bucket = groupedSettings[def.category as SettingCategory];
        if (bucket) bucket.push(def);
      }
    }
  }

  const customizedCount = allValues.length;

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
        <span style={{ fontWeight: 700, fontSize: 16 }}>⚙️ Emulator General Settings</span>
        {customizedCount > 0 && (
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
            background: 'rgba(16,124,16,0.25)', color: '#52b043',
            border: '1px solid rgba(16,124,16,0.4)',
          }}>
            {customizedCount} customized
          </span>
        )}
        <div style={{ flex: 1 }} />
        {dirty && (
          <span style={{ fontSize: 11, color: 'rgba(255,200,50,0.7)', fontWeight: 600 }}>
            ● unsaved changes
          </span>
        )}
        <button
          type="button"
          onClick={handlePreview}
          disabled={!activeTab}
          style={{ ...btnStyle, background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.4)', color: '#a5b4fc' }}
        >
          👁️ Preview Config
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={!activeTab}
          style={{ ...btnStyle, color: 'rgba(255,80,80,0.7)', borderColor: 'rgba(255,80,80,0.3)' }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          style={{
            ...btnStyle,
            background: 'rgba(16,124,16,0.4)',
            borderColor: 'rgba(16,124,16,0.6)',
            color: '#52b043',
            fontWeight: 700,
            opacity: saving || !dirty ? 0.5 : 1,
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
        Configure shared emulator settings (resolution, language, V-Sync, etc.). Each emulator maps these to its native config format.
        <span style={{ color: 'rgba(255,80,80,0.6)', marginLeft: 8 }}>
          🔒 V-Sync is always OFF to prevent input lag.
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Emulator Tabs (sidebar) */}
        <div
          style={{
            width: 180,
            borderRight: '1px solid rgba(255,255,255,0.06)',
            overflowY: 'auto',
            padding: '12px 0',
            flexShrink: 0,
          }}
        >
          {writers.map((w) => {
            const active = activeTab === w.emulator_name;
            const color = EMULATOR_COLORS[w.emulator_name] ?? '#888';
            const storedCount = allValues.filter((v) => v.emulator_name === w.emulator_name).length;
            return (
              <button
                key={w.emulator_name}
                onClick={() => setActiveTab(w.emulator_name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  background: active ? `${color}18` : 'transparent',
                  borderLeft: active ? `3px solid ${color}` : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span style={{
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? color : 'rgba(255,255,255,0.5)',
                  textAlign: 'left',
                }}>
                  {w.emulator_name}
                </span>
                {storedCount > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 8,
                    background: 'rgba(16,124,16,0.2)',
                    color: '#52b043',
                  }}>
                    {storedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Settings content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
              Loading settings…
            </div>
          ) : !activeWriter ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
              Select an emulator from the sidebar.
            </div>
          ) : (
            <>
              {/* Emulator header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{
                  fontSize: 18, fontWeight: 700,
                  color: EMULATOR_COLORS[activeWriter.emulator_name] ?? '#fff',
                }}>
                  {activeWriter.emulator_name}
                </span>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.35)',
                }}>
                  .{activeWriter.config_format} format
                </span>
                <span style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.2)',
                }}>
                  {activeWriter.supported_settings.length} settings supported
                </span>
                {activeWriter.default_config_path && (
                  <span
                    style={{
                      fontSize: 10, color: 'rgba(255,255,255,0.2)',
                      marginLeft: 'auto',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: 300,
                    }}
                    title={activeWriter.default_config_path}
                  >
                    📁 {activeWriter.default_config_path}
                  </span>
                )}
              </div>

              {/* Settings grouped by category */}
              {CATEGORY_ORDER.map((cat) => {
                const settings = groupedSettings[cat];
                if (settings.length === 0) return null;
                return (
                  <div key={cat} style={{ marginBottom: 24 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 10,
                    }}>
                      {CATEGORY_LABELS[cat]}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {settings.map((def) => (
                        <SettingControl
                          key={def.key}
                          def={def}
                          value={getSettingValue(activeTab, def.key)}
                          onChange={(key, val) => handleChange(activeTab, key, val)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {previewContent !== null && activeWriter && (
        <PreviewModal
          emulatorName={activeWriter.emulator_name}
          configFormat={activeWriter.config_format}
          content={previewContent}
          onClose={() => setPreviewContent(null)}
        />
      )}
    </div>
  );
}
