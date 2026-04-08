import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
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

  // Fetch emulator data on mount or when systemId changes
  useEffect(() => {
    const fetchEmulators = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await invoke<SystemEmulatorChoice>(
          'get_available_emulators_for_system',
          { systemId: systemId }
        );
        setData(result);
        setSelectedEmulator(result.selected_emulator ?? null);
        setFocusedIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchEmulators();
  }, [systemId]);

  // Handle emulator selection
  const handleSelect = useCallback((emulatorName: string) => {
    if (!disabled) {
      setSelectedEmulator(emulatorName);
      onSelectionChange?.(emulatorName);
    }
  }, [disabled, onSelectionChange]);

  // Handle keyboard navigation
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
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data || data.available_emulators.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400">
          No hay emuladores registrados para {systemName}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0}>
      <h3 className="text-lg font-semibold text-white">
        Emuladores disponibles para {systemName}
      </h3>

      <div className="space-y-2">
        {data.available_emulators.map((emulator, index) => (
          <button
            key={emulator.emulator_name}
            onClick={() => handleSelect(emulator.emulator_name)}
            disabled={disabled}
            className={`w-full p-4 rounded-lg border-2 transition text-left ${
              selectedEmulator === emulator.emulator_name
                ? 'border-blue-500 bg-blue-900/30'
                : focusedIndex === index
                  ? 'border-gray-500 bg-gray-800/50'
                  : 'border-gray-700 bg-gray-900/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 cursor-pointer'}`}
            aria-selected={selectedEmulator === emulator.emulator_name}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">
                  {emulator.emulator_name}
                </p>
                {emulator.detected_path && (
                  <p className="text-sm text-gray-400">{emulator.detected_path}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {emulator.is_installed ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                    ✓ Instalado
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                    No instalado
                  </span>
                )}
                {selectedEmulator === emulator.emulator_name && (
                  <span className="text-blue-400 text-lg">✓</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
