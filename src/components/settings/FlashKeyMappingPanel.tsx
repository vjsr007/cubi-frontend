import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/invoke';
import type { FlashKeyMapping, FlashGameConfig, LeftStickMode } from '../../types';

/** All 16 standard gamepad buttons */
const GAMEPAD_BUTTONS = [
  { index: 12, label: 'D-Pad Up' },
  { index: 13, label: 'D-Pad Down' },
  { index: 14, label: 'D-Pad Left' },
  { index: 15, label: 'D-Pad Right' },
  { index: 0,  label: 'A / Cross' },
  { index: 1,  label: 'B / Circle' },
  { index: 2,  label: 'X / Square' },
  { index: 3,  label: 'Y / Triangle' },
  { index: 4,  label: 'LB / L1' },
  { index: 5,  label: 'RB / R1' },
  { index: 6,  label: 'LT / L2' },
  { index: 7,  label: 'RT / R2' },
  { index: 9,  label: 'Start' },
  { index: 8,  label: 'Select' },
  { index: 10, label: 'L3' },
  { index: 11, label: 'R3' },
];

/** Keyboard keys the user can pick from */
const KEY_OPTIONS = [
  { value: '',           label: '— None —' },
  { value: 'ArrowUp',   label: 'Arrow Up' },
  { value: 'ArrowDown', label: 'Arrow Down' },
  { value: 'ArrowLeft', label: 'Arrow Left' },
  { value: 'ArrowRight',label: 'Arrow Right' },
  { value: 'Enter',     label: 'Enter' },
  { value: 'Escape',    label: 'Escape' },
  { value: 'Space',     label: 'Space' },
  { value: 'Tab',       label: 'Tab' },
  { value: 'Backspace', label: 'Backspace' },
  { value: 'Shift',     label: 'Shift' },
  { value: 'Control',   label: 'Ctrl' },
  { value: 'Alt',       label: 'Alt' },
  ...'abcdefghijklmnopqrstuvwxyz'.split('').map(c => ({ value: c, label: c.toUpperCase() })),
  ...'0123456789'.split('').map(c => ({ value: c, label: c })),
];

const STICK_MODE_OPTIONS: { value: LeftStickMode; label: string }[] = [
  { value: 'disabled', label: 'Disabled' },
  { value: 'wasd',     label: 'WASD' },
  { value: 'arrows',   label: 'Arrow Keys' },
];

interface Props {
  gameId: string;
}

export function FlashKeyMappingPanel({ gameId }: Props) {
  const [mappings, setMappings] = useState<FlashKeyMapping[]>([]);
  const [config, setConfig] = useState<FlashGameConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, c] = await Promise.all([
        api.getFlashKeyMappings(gameId),
        api.getFlashGameConfig(gameId),
      ]);
      setMappings(m);
      setConfig(c);
    } catch (e) {
      console.error('Failed to load flash config:', e);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const getKeyForButton = (btnIndex: number): string => {
    return mappings.find(m => m.gamepad_button === btnIndex)?.keyboard_key ?? '';
  };

  const handleChange = async (btnIndex: number, keyboardKey: string) => {
    setSaving(btnIndex);
    try {
      if (keyboardKey === '') {
        await api.deleteFlashKeyMapping(gameId, btnIndex);
      } else {
        await api.setFlashKeyMapping(gameId, btnIndex, keyboardKey);
      }
      const m = await api.getFlashKeyMappings(gameId);
      setMappings(m);
    } catch (e) {
      console.error('Failed to save mapping:', e);
    } finally {
      setSaving(null);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const defaults = await api.resetFlashKeyMappings(gameId);
      setMappings(defaults);
    } catch (e) {
      console.error('Failed to reset mappings:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (patch: Partial<FlashGameConfig>) => {
    if (!config) return;
    const updated = { ...config, ...patch };
    setConfig(updated);
    try {
      await api.setFlashGameConfig(
        gameId,
        updated.left_stick_mode,
        updated.right_stick_mouse,
        updated.mouse_sensitivity,
      );
    } catch (e) {
      console.error('Failed to save flash game config:', e);
    }
  };

  if (loading || !config) {
    return (
      <div style={{ padding: 16, color: 'var(--color-text-muted)', fontSize: 13 }}>
        Loading key mappings...
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#ff6a00' }}>
            Gamepad Configuration
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>
            Gamepad-to-keyboard relay starts automatically on launch.
          </p>
        </div>
        <button
          onClick={handleReset}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6, padding: '6px 14px', fontSize: 11, fontWeight: 600,
            color: 'var(--color-text-muted)', cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff6a00'; e.currentTarget.style.color = '#ff6a00'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          Reset Defaults
        </button>
      </div>

      {/* ── Analog Sticks Section ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '16px 20px',
        marginBottom: 16,
      }}>
        <h4 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Analog Sticks
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Left stick */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>
              Left Stick
            </label>
            <select
              value={config.left_stick_mode}
              onChange={e => saveConfig({ left_stick_mode: e.target.value as LeftStickMode })}
              style={selectStyle}
            >
              {STICK_MODE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--color-text-muted)' }}>
              {config.left_stick_mode === 'wasd' && 'W/A/S/D keys'}
              {config.left_stick_mode === 'arrows' && 'Arrow keys'}
              {config.left_stick_mode === 'disabled' && 'Not mapped'}
            </p>
          </div>

          {/* Right stick */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>
              Right Stick
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ToggleSwitch
                checked={config.right_stick_mouse}
                onChange={v => saveConfig({ right_stick_mouse: v })}
              />
              <span style={{ fontSize: 12, color: config.right_stick_mouse ? '#ff6a00' : 'var(--color-text-muted)' }}>
                Mouse Cursor
              </span>
            </div>
            {config.right_stick_mouse && (
              <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--color-text-muted)' }}>
                R3 = Left Click
              </p>
            )}
          </div>
        </div>

        {/* Mouse sensitivity slider */}
        {config.right_stick_mouse && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Mouse Sensitivity
              </label>
              <span style={{ fontSize: 11, color: '#ff6a00', fontWeight: 700 }}>
                {config.mouse_sensitivity}%
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={config.mouse_sensitivity}
              onChange={e => setConfig({ ...config, mouse_sensitivity: Number(e.target.value) })}
              onMouseUp={() => saveConfig({ mouse_sensitivity: config.mouse_sensitivity })}
              onTouchEnd={() => saveConfig({ mouse_sensitivity: config.mouse_sensitivity })}
              style={{
                width: '100%',
                accentColor: '#ff6a00',
                cursor: 'pointer',
              }}
            />
          </div>
        )}
      </div>

      {/* ── Button Mappings Section ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '16px 20px',
      }}>
        <h4 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Button Mappings
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {GAMEPAD_BUTTONS.map(btn => {
            const currentKey = getKeyForButton(btn.index);
            const isSaving = saving === btn.index;
            // Dim R3 row if right stick mouse is on (R3 = right click)
            const isR3Mouse = btn.index === 11 && config.right_stick_mouse;
            return (
              <div
                key={btn.index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '8px 14px',
                  opacity: isSaving || isR3Mouse ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: currentKey ? 'var(--color-text)' : 'var(--color-text-muted)',
                  minWidth: 100,
                }}>
                  {btn.label}
                  {isR3Mouse && <span style={{ fontSize: 9, marginLeft: 4, color: '#ff6a00' }}>(Left Click)</span>}
                </span>
                <select
                  value={isR3Mouse ? '' : currentKey}
                  onChange={e => handleChange(btn.index, e.target.value)}
                  disabled={isSaving || isR3Mouse}
                  style={selectStyle}
                >
                  {KEY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      {mappings.length === 0 && (
        <p style={{ marginTop: 12, fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          No button mappings configured. Click "Reset Defaults" to load a standard preset.
        </p>
      )}
    </div>
  );
}

/* ── Shared styles ── */

const selectStyle: React.CSSProperties = {
  background: 'var(--color-background)',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 12,
  color: 'var(--color-text)',
  cursor: 'pointer',
  minWidth: 120,
  outline: 'none',
};

/* ── Toggle Switch subcomponent ── */

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20,
        borderRadius: 10,
        background: checked ? '#ff6a00' : 'var(--color-border)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 16, height: 16,
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute',
        top: 2,
        left: checked ? 18 : 2,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}
