import { create } from 'zustand';
import type { Place, PlaceInsert, Category, CategoryInsert } from '@/types';
import * as queries from '@/db/queries';
import { scheduleBackup } from '@/services/backup';

interface AppState {
  // Places
  places: Place[];
  isLoading: boolean;

  // Categories
  categories: Category[];

  // Filters
  searchQuery: string;
  selectedCategory: string | null;
  sortBy: 'date' | 'name' | 'category';

  // User location
  userLocation: { latitude: number; longitude: number } | null;

  // Place actions
  loadPlaces: () => Promise<void>;
  addPlace: (data: PlaceInsert) => Promise<Place>;
  updatePlace: (id: string, data: Partial<PlaceInsert>) => Promise<void>;
  removePlace: (id: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (id: string | null) => void;
  setSortBy: (s: 'date' | 'name' | 'category') => void;
  setUserLocation: (loc: { latitude: number; longitude: number } | null) => void;

  // Category actions
  loadCategories: () => Promise<void>;
  addCategory: (data: CategoryInsert) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Omit<CategoryInsert, 'id' | 'createdAt'>>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  reorderCategories: (orderedIds: string[]) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  places: [],
  isLoading: false,
  categories: [],
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
    scheduleBackup();
    return place;
  },

  updatePlace: async (id, data) => {
    // Optimistic local update
    set((s) => ({
      places: s.places.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: new Date() } : p
      ),
    }));
    try {
      await queries.updatePlace(id, data);
      scheduleBackup();
    } catch (error) {
      console.error('[NearDrop] Failed to update place:', error);
      // Rollback: re-fetch from database
      await get().loadPlaces();
    }
  },

  removePlace: async (id) => {
    await queries.deletePlace(id);
    set((s) => ({ places: s.places.filter((p) => p.id !== id) }));
    scheduleBackup();
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSortBy: (sortBy) => set({ sortBy }),
  setUserLocation: (userLocation) => set({ userLocation }),

  // ── Category actions ──────────────────────────────────────────────

  loadCategories: async () => {
    try {
      const categories = await queries.getAllCategories();
      if (__DEV__) console.log('[NearDrop] Loaded categories:', categories.length);
      set({ categories });
    } catch (error) {
      console.error('[NearDrop] Failed to load categories:', error);
    }
  },

  addCategory: async (data) => {
    const category = await queries.insertCategory(data);
    set((s) => ({ categories: [...s.categories, category] }));
    scheduleBackup();
    return category;
  },

  updateCategory: async (id, data) => {
    await queries.updateCategory(id, data);
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
    scheduleBackup();
  },

  removeCategory: async (id) => {
    const count = await queries.countPlacesByCategory(id);
    if (count > 0) {
      throw new Error(
        `Impossible de supprimer cette catégorie : ${count} lieu(x) l'utilisent encore.`
      );
    }
    await queries.deleteCategory(id);
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
    scheduleBackup();
  },

  reorderCategories: async (orderedIds) => {
    await queries.reorderCategories(orderedIds);
    set((s) => ({
      categories: orderedIds
        .map((id, i) => {
          const cat = s.categories.find((c) => c.id === id);
          return cat ? { ...cat, sortOrder: i } : null;
        })
        .filter((c): c is Category => c !== null),
    }));
    scheduleBackup();
  },
}));
