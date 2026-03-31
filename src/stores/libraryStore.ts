import { create } from 'zustand';
import type { GameInfo, SystemInfo, SortField, SortOrder, ViewMode } from '../types';
import { api } from '../lib/invoke';

interface LibraryState {
  systems: SystemInfo[];
  selectedSystemId: string | null;
  games: GameInfo[];
  focusedGameIndex: number;

  searchQuery: string;
  sortField: SortField;
  sortOrder: SortOrder;
  viewMode: ViewMode;
  gridColumns: number;
  showFavoritesOnly: boolean;

  isLoadingSystems: boolean;
  isLoadingGames: boolean;
  isScanning: boolean;
  launchingGameId: string | null;
  scanProgress: string;
  error: string | null;

  loadSystems: () => Promise<void>;
  selectSystem: (systemId: string) => Promise<void>;
  setFocusedGameIndex: (index: number) => void;
  setSearchQuery: (query: string) => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  setViewMode: (mode: ViewMode) => void;
  setGridColumns: (cols: number) => void;
  toggleFavoritesOnly: () => void;
  toggleFavorite: (gameId: string) => Promise<void>;
  scanLibrary: (dataRoot: string) => Promise<void>;
  launchGame: (gameId: string) => Promise<void>;
  getFilteredGames: () => GameInfo[];
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  systems: [],
  selectedSystemId: null,
  games: [],
  focusedGameIndex: 0,

  searchQuery: '',
  sortField: 'title',
  sortOrder: 'asc',
  viewMode: 'grid',
  gridColumns: 6,
  showFavoritesOnly: false,

  isLoadingSystems: false,
  isLoadingGames: false,
  isScanning: false,
  launchingGameId: null,
  scanProgress: '',
  error: null,

  loadSystems: async () => {
    set({ isLoadingSystems: true, error: null });
    try {
      const systems = await api.getSystems();
      set({ systems, isLoadingSystems: false });
      if (systems.length > 0 && !get().selectedSystemId) {
        await get().selectSystem(systems[0].id);
      }
    } catch (e) {
      set({ isLoadingSystems: false, error: String(e) });
    }
  },

  selectSystem: async (systemId: string) => {
    // Clear previous games immediately so the grid resets at once
    set({ selectedSystemId: systemId, isLoadingGames: true, focusedGameIndex: 0, games: [] });
    try {
      const games = systemId === '__all__'
        ? await api.getAllGames()
        : await api.getGames(systemId);
      // Guard against race conditions: only apply if this is still the active selection
      if (get().selectedSystemId === systemId) {
        set({ games, isLoadingGames: false });
      }
    } catch (e) {
      if (get().selectedSystemId === systemId) {
        set({ isLoadingGames: false, error: String(e) });
      }
    }
  },

  setFocusedGameIndex: (index) => set({ focusedGameIndex: index }),
  setSearchQuery: (query) => set({ searchQuery: query, focusedGameIndex: 0 }),
  setSortField: (field) => set({ sortField: field }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setGridColumns: (cols) => set({ gridColumns: Math.max(3, Math.min(10, cols)) }),
  toggleFavoritesOnly: () => set((s) => ({ showFavoritesOnly: !s.showFavoritesOnly })),

  toggleFavorite: async (gameId: string) => {
    try {
      const newVal = await api.toggleFavorite(gameId);
      set((state) => ({
        games: state.games.map((g) => g.id === gameId ? { ...g, favorite: newVal } : g),
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  scanLibrary: async (dataRoot: string) => {
    set({ isScanning: true, scanProgress: 'Starting scan...', error: null });
    try {
      const result = await api.scanLibrary(dataRoot);
      set({
        isScanning: false,
        scanProgress: `Found ${result.systems_found} systems, ${result.games_found} games`,
      });
      await get().loadSystems();
    } catch (e) {
      set({ isScanning: false, error: String(e) });
      throw e;
    }
  },

  launchGame: async (gameId: string) => {
    if (get().launchingGameId) return;
    set({ launchingGameId: gameId });
    try {
      await api.launchGame(gameId);
      const game = await api.getGame(gameId);
      if (game) {
        set((state) => ({
          games: state.games.map((g) => g.id === gameId ? game : g),
        }));
      }
    } catch (e) {
      set({ error: String(e) });
      throw e;
    } finally {
      set({ launchingGameId: null });
    }
  },

  getFilteredGames: () => {
    const { games, searchQuery, sortField, sortOrder, showFavoritesOnly } = get();
    let filtered = [...games];

    if (showFavoritesOnly) {
      filtered = filtered.filter((g) => g.favorite);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          (g.genre?.toLowerCase().includes(q) ?? false) ||
          (g.developer?.toLowerCase().includes(q) ?? false)
      );
    }

    filtered.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortField) {
        case 'title': aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); break;
        case 'last_played': aVal = a.last_played ?? ''; bVal = b.last_played ?? ''; break;
        case 'play_count': aVal = a.play_count; bVal = b.play_count; break;
        case 'rating': aVal = a.rating; bVal = b.rating; break;
        case 'year': aVal = a.year ?? ''; bVal = b.year ?? ''; break;
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  },
}));
