import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Settings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

interface SettingsState extends Settings {
  updateSettings: (partial: Partial<Settings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      updateSettings: (partial) => set(partial),
    }),
    {
      name: 'neardrop-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
