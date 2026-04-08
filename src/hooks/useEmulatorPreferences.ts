import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SystemEmulatorChoice } from '../types/emulator';

export function useEmulatorPreferences() {
  const [systems, setSystems] = useState<SystemEmulatorChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all systems with available emulators
  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<SystemEmulatorChoice[]>(
        'get_all_systems_with_emulators'
      );
      setSystems(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Set emulator preference for a system
  const setPreference = useCallback(
    async (systemId: string, emulatorName: string) => {
      try {
        setError(null);
        await invoke('set_emulator_preference', {
          systemId: systemId,
          emulatorName: emulatorName,
        });

        // Update local state
        setSystems((prev) =>
          prev.map((sys) =>
            sys.system_id === systemId
              ? { ...sys, selected_emulator: emulatorName }
              : sys
          )
        );

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        console.error('Failed to set emulator preference:', message);
        return false;
      }
    },
    []
  );

  return {
    systems,
    loading,
    error,
    fetchPreferences,
    setPreference,
  };
}
