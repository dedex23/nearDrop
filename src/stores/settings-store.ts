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
      updateSettings: (partial) => {
        const validated: Partial<Settings> = { ...partial };
        if (validated.defaultRadius !== undefined) {
          validated.defaultRadius = Math.max(50, Math.min(500, Math.round(validated.defaultRadius)));
        }
        if (validated.cooldownHours !== undefined) {
          validated.cooldownHours = Math.max(1, Math.min(168, Math.round(validated.cooldownHours)));
        }
        if (
          validated.themeMode !== undefined &&
          !['system', 'light', 'dark'].includes(validated.themeMode)
        ) {
          delete validated.themeMode;
        }
        // Discard any NaN numeric values
        for (const key of Object.keys(validated) as (keyof Settings)[]) {
          if (typeof validated[key] === 'number' && isNaN(validated[key] as number)) {
            delete validated[key];
          }
        }
        set(validated);
      },
    }),
    {
      name: 'neardrop-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
