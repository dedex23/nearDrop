import { getActivePlaces, markNotified } from '@/db/queries';
import { haversineDistance } from '@/utils/distance';
import { ROUGH_FILTER_DEGREES } from '@/utils/constants';
import { sendProximityNotification, sendGroupedNotification } from './notifications';
import type { Place } from '@/types';

// Default cooldown: 24 hours (can be overridden by settings)
const DEFAULT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Main geofencing check. Called on every background location update.
 * 1. Load active places
 * 2. Pre-filter by bounding box (fast)
 * 3. Calculate exact Haversine distance for candidates
 * 4. Trigger notifications for places within radius (with cooldown)
 */
export async function checkGeofences(currentLat: number, currentLon: number): Promise<void> {
  try {
    const allPlaces = await getActivePlaces();

    // Fast bounding-box pre-filter (~5.5km)
    const candidates = allPlaces.filter(
      (p) =>
        Math.abs(p.latitude - currentLat) < ROUGH_FILTER_DEGREES &&
        Math.abs(p.longitude - currentLon) < ROUGH_FILTER_DEGREES
    );

    const placesToNotify: Array<{ place: Place; distance: number }> = [];

    for (const place of candidates) {
      const distance = haversineDistance(currentLat, currentLon, place.latitude, place.longitude);

      if (distance <= place.radius) {
        if (!isCooldownActive(place)) {
          placesToNotify.push({ place, distance });
        }
      }
    }

    if (placesToNotify.length === 0) return;

    // Send notifications
    if (placesToNotify.length === 1) {
      const { place, distance } = placesToNotify[0];
      await sendProximityNotification(place, distance);
      await markNotified(place.id);
    } else {
      // Group notification for multiple nearby places
      await sendGroupedNotification(placesToNotify.map((p) => p.place));
      for (const { place } of placesToNotify) {
        await markNotified(place.id);
      }
    }
  } catch (error) {
    console.error('[NearDrop] Geofencing check error:', error);
  }
}

function isCooldownActive(place: Place): boolean {
  if (!place.notifiedAt) return false;
  const elapsed = Date.now() - place.notifiedAt.getTime();
  return elapsed < DEFAULT_COOLDOWN_MS;
}
