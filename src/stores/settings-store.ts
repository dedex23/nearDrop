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
        if (validated.activeHoursStart !== undefined) {
          validated.activeHoursStart = Math.max(0, Math.min(23, Math.round(validated.activeHoursStart)));
        }
        if (validated.activeHoursEnd !== undefined) {
          validated.activeHoursEnd = Math.max(0, Math.min(23, Math.round(validated.activeHoursEnd)));
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
