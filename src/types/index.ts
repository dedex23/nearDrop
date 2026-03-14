export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: Date;
}

export type CategoryInsert = Omit<Category, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: Date;
};

export const SOURCE_TYPES = [
  'manual',
  'share_intent',
  'instagram',
  'facebook',
  'google_maps',
  'csv',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  categoryId: string;
  notes: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  imageUrl: string | null;
  radius: number;
  isActive: boolean;
  notifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PlaceInsert = Omit<Place, 'id' | 'createdAt' | 'updatedAt' | 'notifiedAt'> & {
  id?: string;
};

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  defaultRadius: number;
  cooldownHours: number;
  activeHoursStart: number;
  activeHoursEnd: number;
  isQuietMode: boolean;
  isTrackingEnabled: boolean;
  themeMode: ThemeMode;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultRadius: 150,
  cooldownHours: 24,
  activeHoursStart: 10,
  activeHoursEnd: 22,
  isQuietMode: false,
  isTrackingEnabled: false,
  themeMode: 'system',
};

export const MAX_CATEGORIES = 30;
