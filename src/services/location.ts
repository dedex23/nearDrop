import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

export const BACKGROUND_LOCATION_TASK = 'NEARDROP_BACKGROUND_LOCATION';

interface LocationTaskData {
  locations: Location.LocationObject[];
}

function isLocationTaskData(data: unknown): data is LocationTaskData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'locations' in (data as object) &&
    Array.isArray((data as LocationTaskData).locations)
  );
}

// Register the background task at module level (required by expo-task-manager)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[NearDrop][Location] Background task error:', error);
    return;
  }

  if (isLocationTaskData(data)) {
    const { locations } = data;
    console.log('[NearDrop][Location] Task fired, locations:', locations.length);
    if (locations.length > 0) {
      const latest = locations[locations.length - 1];
      console.log('[NearDrop][Location] Latest:', latest.coords.latitude.toFixed(5), latest.coords.longitude.toFixed(5), 'accuracy:', Math.round(latest.coords.accuracy ?? 0), 'm');
      // Use require to avoid circular dependency
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { checkGeofences } = require('./geofencing');
      await checkGeofences(latest.coords.latitude, latest.coords.longitude);
    }
  } else {
    console.warn('[NearDrop][Location] Task fired with unexpected data:', JSON.stringify(data));
  }
});

export async function requestLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    return { foreground: false, background: false };
  }

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  return { foreground: true, background: bgStatus === 'granted' };
}

export async function startBackgroundLocation(): Promise<boolean> {
  const perms = await requestLocationPermissions();
  if (!perms.foreground || !perms.background) {
    console.log('[NearDrop][Location] Permissions denied — fg:', perms.foreground, 'bg:', perms.background);
    return false;
  }

  const isStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(
    () => false
  );
  if (isStarted) {
    console.log('[NearDrop][Location] Already started, skipping');
    return true;
  }

  const opts = {
    accuracy: Location.Accuracy.High,
    timeInterval: 30_000,
    distanceInterval: 50,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'NearDrop',
      notificationBody: 'Surveillance de votre proximité avec vos lieux sauvegardés',
      notificationColor: '#6200EE',
    },
  };

  // Retry once after a short delay — SharedPreferences can NPE during dev hot reload
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      console.log('[NearDrop][Location] Starting background updates (attempt', attempt + 1, ')');
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, opts);
      console.log('[NearDrop][Location] Background updates started');
      return true;
    } catch (error) {
      console.error('[NearDrop][Location] Failed to start updates:', error);
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  return false;
}

export async function stopBackgroundLocation(): Promise<void> {
  try {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isStarted) {
      console.log('[NearDrop][Location] Stopping background updates');
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch {
    // Task not registered yet, nothing to stop
  }
}

export async function getCurrentPosition(): Promise<Location.LocationObject | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    return null;
  }
}
