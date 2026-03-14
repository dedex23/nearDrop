import type { Category } from '@/types';

export const CATEGORY_CONFIG: Record<Category, { color: string; icon: string; label: string }> = {
  restaurant: { color: '#E53935', icon: 'silverware-fork-knife', label: 'Restaurant' },
  bar: { color: '#8E24AA', icon: 'glass-cocktail', label: 'Bar' },
  cafe: { color: '#795548', icon: 'coffee', label: 'Café' },
  shop: { color: '#1E88E5', icon: 'shopping', label: 'Boutique' },
  culture: { color: '#FB8C00', icon: 'palette', label: 'Culture' },
  sport: { color: '#43A047', icon: 'run', label: 'Sport' },
  other: { color: '#757575', icon: 'map-marker', label: 'Autre' },
};

export const SURVEILLANCE_RADIUS_M = 5000; // 5km active surveillance zone
export const MAX_GEOFENCES = 80; // Stay under Android's ~100 limit
export const ROUGH_FILTER_DEGREES = 0.05; // ~5.5km bounding box pre-filter
