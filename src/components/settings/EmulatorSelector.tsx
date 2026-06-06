import { useState, useEffect, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { api } from '../../lib/invoke';
import type { SystemEmulatorChoice } from '../../types/emulator';

interface EmulatorSelectorProps {
  systemId: string;
  systemName: string;
  onSelectionChange?: (emulatorName: string) => void;
  disabled?: boolean;
}

export function EmulatorSelector({
  systemId,
  systemName,
  onSelectionChange,
  disabled = false,
}: EmulatorSelectorProps) {
  const [data, setData] = useState<SystemEmulatorChoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmulator, setSelectedEmulator] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Manual emulator form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualExePath, setManualExePath] = useState('');
  const [manualArgs, setManualArgs] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const fetchEmulators = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<SystemEmulatorChoice>(
        'get_available_emulators_for_system',
        { systemId }
      );
      setData(result);
      setSelectedEmulator(result.selected_emulator ?? null);
      setFocusedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [systemId]);

  useEffect(() => { fetchEmulators(); }, [fetchEmulators]);

  const handleSelect = useCallback((emulatorName: string) => {
    if (!disabled) {
      setSelectedEmulator(emulatorName);
      onSelectionChange?.(emulatorName);
    }
  }, [disabled, onSelectionChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled || !data || data.available_emulators.length === 0) return;
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) =>
          Math.min(data.available_emulators.length - 1, prev + 1)
        );
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (data.available_emulators[focusedIndex]) {
          handleSelect(data.available_emulators[focusedIndex].emulator_name);
        }
        break;
    }
  }, [disabled, data, focusedIndex, handleSelect]);

  const browseExe = async () => {
    const selected = await open({
      title: 'Select emulator executable',
      filters: [{ name: 'Executable', extensions: ['exe', 'bat', 'cmd', ''] }],
      multiple: false,
    });
    if (typeof selected === 'string' && selected) {
      setManualExePath(selected);
      if (!manualName) {
        const base = selected.split(/[\\/]/).pop() ?? '';
        setManualName(base.replace(/\.[^.]+$/, ''));
      }
    }
  };

  const handleSaveManual = async () => {
    if (!manualName.trim() || !manualExePath.trim()) {
      setManualError('Name and executable path are required.');
      return;
    }
    setManualError(null);
    setSavingManual(true);
    try {
      await api.setCustomEmulatorForSystem(
        systemId,
        manualName.trim(),
        manualExePath.trim(),
        manualArgs.trim() || undefined,
      );
      setShowManualForm(false);
      setManualName('');
      setManualExePath('');
      setManualArgs('');
      await fetchEmulators();
      // Auto-select the new custom emulator
      onSelectionChange?.(manualName.trim());
    } catch (err) {
      setManualError(String(err));
    } finally {
      setSavingManual(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg text-gray-400">Cargando emuladores...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 py-6">
        <div className="rounded-lg bg-red-900/30 border border-red-700 p-4">
          <p className="text-red-300">Error: {error}</p>
        </div>
        <button
          onClick={fetchEmulators}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 13,
    color: '#fff',
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onKeyDown={handleKeyDown} tabIndex={0}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>
        Emuladores disponibles para {systemName}
      </h3>

      {/* Known emulator list */}
      {(!data || data.available_emulators.length === 0) ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          No hay emuladores registrados para {systemName}.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.available_emulators.map((emulator, index) => {
            const isSelected = selectedEmulator === emulator.emulator_name;
            const isFocused = focusedIndex === index;
            return (
              <button
                key={emulator.emulator_name}
                onClick={() => handleSelect(emulator.emulator_name)}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: isSelected
                    ? '2px solid #6366f1'
                    : isFocused
                      ? '2px solid rgba(255,255,255,0.3)'
                      : '1px solid rgba(255,255,255,0.1)',
                  background: isSelected
                    ? 'rgba(99,102,241,0.15)'
                    : 'rgba(255,255,255,0.03)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
                aria-selected={isSelected}
              >
                <div>
                  <p style={{ fontWeight: 600, color: '#fff', margin: 0, fontSize: 14 }}>
                    {emulator.emulator_name}
                  </p>
                  {emulator.detected_path && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', wordBreak: 'break-all' }}>
                      {emulator.detected_path}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                  {emulator.is_installed ? (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: 'rgba(16,124,16,0.25)', color: '#52b043', border: '1px solid rgba(16,124,16,0.4)' }}>
                      ✓ Instalado
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                      No instalado
                    </span>
                  )}
                  {isSelected && (
                    <span style={{ color: '#6366f1', fontSize: 18, fontWeight: 700 }}>✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Manual emulator section */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
        <button
          onClick={() => setShowManualForm((v) => !v)}
          style={{
            ...btnStyle,
            background: showManualForm ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
            borderColor: showManualForm ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.15)',
            color: showManualForm ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
            fontSize: 13,
            padding: '7px 14px',
          }}
        >
          {showManualForm ? '▲ Cancelar' : '➕ Agregar emulador personalizado'}
        </button>

        {showManualForm && (
          <div style={{
            marginTop: 12,
            padding: 16,
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {/* Name */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
                Nombre del emulador
              </label>
              <input
                style={inputStyle}
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Ej: ZSNES, ePSXe, Mesen..."
              />
            </div>

            {/* Exe path */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
                Ruta del ejecutable
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={inputStyle}
                  value={manualExePath}
                  onChange={(e) => setManualExePath(e.target.value)}
                  placeholder="C:\Emulators\meu_emulador.exe"
                />
                <button onClick={browseExe} style={btnStyle}>
                  📂 Buscar
                </button>
              </div>
            </div>

            {/* Args (optional) */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
                Argumentos de lanzamiento <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional — usa <code>{'{rom}'}</code> como placeholder)</span>
              </label>
              <input
                style={inputStyle}
                value={manualArgs}
                onChange={(e) => setManualArgs(e.target.value)}
                placeholder='{rom}  ó  -fullscreen "{rom}"'
              />
            </div>

            {manualError && (
              <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>⚠ {manualError}</p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={handleSaveManual}
                disabled={savingManual}
                style={{
                  background: savingManual ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.8)',
                  border: '1px solid rgba(99,102,241,0.6)',
                  borderRadius: 8,
                  color: '#fff',
                  padding: '7px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: savingManual ? 'not-allowed' : 'pointer',
                  opacity: savingManual ? 0.7 : 1,
                }}
              >
                {savingManual ? 'Guardando…' : 'Guardar y seleccionar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
