import { create } from 'zustand';
import type { AppConfig } from '../types';
import { api } from '../lib/invoke';

const defaultConfig: AppConfig = {
  general: { version: '0.1.0', theme: 'dark', language: 'en', fullscreen: true },
  paths: { data_root: '', emudeck_path: '' },
  scanner: { auto_scan: false, hash_roms: false },
  emulators: {},
};

interface ConfigState {
  config: AppConfig | null;
  isLoading: boolean;
  error: string | null;

  loadConfig: () => Promise<void>;
  saveConfig: (config: AppConfig) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  isLoading: false,
  error: null,

  loadConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await api.getConfig();
      set({ config, isLoading: false });
    } catch (e) {
      set({ config: defaultConfig, isLoading: false, error: String(e) });
    }
  },

  saveConfig: async (config: AppConfig) => {
    set({ isLoading: true, error: null });
    try {
      await api.setConfig(config);
      set({ config, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: String(e) });
      throw e;
    }
  },
}));
