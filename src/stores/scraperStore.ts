import { create } from 'zustand';
import type { ScraperConfig, ScrapeProgress, ScrapeResult } from '../types';
import { api } from '../lib/invoke';

interface ScraperState {
  scrapers: ScraperConfig[];
  loading: boolean;
  jobRunning: boolean;
  progress: ScrapeProgress | null;
  lastResult: ScrapeResult | null;
  error: string | null;

  loadScrapers: () => Promise<void>;
  addScraper: (s: ScraperConfig) => Promise<void>;
  updateScraper: (s: ScraperConfig) => Promise<void>;
  deleteScraper: (id: string) => Promise<void>;
  setProgress: (p: ScrapeProgress | null) => void;
  setJobRunning: (v: boolean) => void;
  setLastResult: (r: ScrapeResult | null) => void;
  setError: (e: string | null) => void;
}

export const useScraperStore = create<ScraperState>((set, get) => ({
  scrapers: [],
  loading: false,
  jobRunning: false,
  progress: null,
  lastResult: null,
  error: null,

  loadScrapers: async () => {
    set({ loading: true, error: null });
    try {
      const scrapers = await api.getScrapers();
      set({ scrapers, loading: false });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  addScraper: async (s) => {
    await api.addScraper(s);
    await get().loadScrapers();
  },

  updateScraper: async (s) => {
    await api.updateScraper(s);
    set((state) => ({
      scrapers: state.scrapers.map((x) => (x.id === s.id ? s : x)),
    }));
  },

  deleteScraper: async (id) => {
    await api.deleteScraper(id);
    set((state) => ({ scrapers: state.scrapers.filter((s) => s.id !== id) }));
  },

  setProgress: (p) => set({ progress: p }),
  setJobRunning: (v) => set({ jobRunning: v }),
  setLastResult: (r) => set({ lastResult: r }),
  setError: (e) => set({ error: e }),
}));
