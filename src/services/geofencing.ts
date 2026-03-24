import { getActivePlaces, getAllCategories, markNotified } from '@/db/queries';
import { haversineDistance } from '@/utils/distance';
import { ROUGH_FILTER_DEGREES } from '@/utils/constants';
import { sendProximityNotification, sendGroupedNotification } from './notifications';
import { useSettingsStore } from '@/stores/settings-store';
import type { Place } from '@/types';

// In-memory lock to prevent concurrent executions.
// JS is single-threaded so the synchronous flag flip before the first `await`
// is enough to guarantee mutual exclusion.
let isChecking = false;

/** @internal Reset lock — only for tests */
export function _resetGeofenceLock() {
  isChecking = false;
}

/**
 * Main geofencing check. Called on every background location update.
 * 1. Check quiet mode
 * 2. Load active places
 * 3. Pre-filter by bounding box (fast)
 * 4. Calculate exact Haversine distance for candidates
 * 5. Trigger notifications for places within radius (with cooldown)
 */
export async function checkGeofences(currentLat: number, currentLon: number): Promise<void> {
  if (isChecking) {
    console.log('[NearDrop][Geo] Skipped (already checking)');
    return;
  }
  isChecking = true;
  try {
    // Ensure settings are hydrated from AsyncStorage (critical for background cold starts
    // where the React component tree doesn't mount and hydration doesn't happen automatically)
    if (!useSettingsStore.persist.hasHydrated()) {
      await useSettingsStore.persist.rehydrate();
    }
    const settings = useSettingsStore.getState();

    // Skip if quiet mode is on
    if (settings.isQuietMode) {
      console.log('[NearDrop][Geo] Skipped (quiet mode)');
      return;
    }

    const allPlaces = await getActivePlaces();
    const allCategories = await getAllCategories();
    const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]));

    // Fast bounding-box pre-filter (~5.5km)
    const candidates = allPlaces.filter(
      (p) =>
        Math.abs(p.latitude - currentLat) < ROUGH_FILTER_DEGREES &&
        Math.abs(p.longitude - currentLon) < ROUGH_FILTER_DEGREES
    );
    console.log('[NearDrop][Geo] Places:', allPlaces.length, '→ bbox candidates:', candidates.length);

    const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
    const placesToNotify: { place: Place; distance: number }[] = [];

    for (const place of candidates) {
      const distance = haversineDistance(currentLat, currentLon, place.latitude, place.longitude);
      const inRadius = distance <= place.radius;
      const onCooldown = isCooldownActive(place, cooldownMs);
      if (inRadius) {
        console.log('[NearDrop][Geo]', place.name, ':', Math.round(distance), 'm (radius:', place.radius, 'm, cooldown:', onCooldown, ')');
      }
      if (inRadius && !onCooldown) {
        placesToNotify.push({ place, distance });
      }
    }

    if (placesToNotify.length === 0) return;

    console.log('[NearDrop][Geo] Notifying', placesToNotify.length, 'place(s):', placesToNotify.map((p) => p.place.name).join(', '));

    // Send notifications
    if (placesToNotify.length === 1) {
      const { place, distance } = placesToNotify[0];
      await sendProximityNotification(place, distance, categoryMap.get(place.categoryId));
      await markNotified(place.id);
    } else {
      await sendGroupedNotification(placesToNotify.map((p) => p.place));
      for (const { place } of placesToNotify) {
        await markNotified(place.id);
      }
    }
  } catch (error) {
    console.error('[NearDrop][Geo] Check error:', error);
  } finally {
    isChecking = false;
  }
}

function isCooldownActive(place: Place, cooldownMs: number): boolean {
  if (!place.notifiedAt) return false;
  const elapsed = Date.now() - place.notifiedAt.getTime();
  return elapsed < cooldownMs;
}
