import { create } from 'zustand';
import type { Place, PlaceInsert, Category } from '@/types';
import * as queries from '@/db/queries';

interface AppState {
  // Places
  places: Place[];
  isLoading: boolean;

  // Filters
  searchQuery: string;
  selectedCategory: Category | null;
  sortBy: 'date' | 'name' | 'category';

  // User location
  userLocation: { latitude: number; longitude: number } | null;

  // Actions
  loadPlaces: () => Promise<void>;
  addPlace: (data: PlaceInsert) => Promise<Place>;
  updatePlace: (id: string, data: Partial<PlaceInsert>) => Promise<void>;
  removePlace: (id: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (c: Category | null) => void;
  setSortBy: (s: 'date' | 'name' | 'category') => void;
  setUserLocation: (loc: { latitude: number; longitude: number } | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  places: [],
  isLoading: false,
  searchQuery: '',
  selectedCategory: null,
  sortBy: 'date',
  userLocation: null,

  loadPlaces: async () => {
    set({ isLoading: true });
    try {
      const places = await queries.getAllPlaces();
      set({ places, isLoading: false });
    } catch (error) {
      console.error('[NearDrop] Failed to load places:', error);
      set({ isLoading: false });
    }
  },

  addPlace: async (data) => {
    const place = await queries.insertPlace(data);
    set((s) => ({ places: [place, ...s.places] }));
    return place;
  },

  updatePlace: async (id, data) => {
    await queries.updatePlace(id, data);
    // Re-fetch to ensure consistency
    await get().loadPlaces();
  },

  removePlace: async (id) => {
    await queries.deletePlace(id);
    set((s) => ({ places: s.places.filter((p) => p.id !== id) }));
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSortBy: (sortBy) => set({ sortBy }),
  setUserLocation: (userLocation) => set({ userLocation }),
}));
