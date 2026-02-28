import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

export const BACKGROUND_LOCATION_TASK = 'NEARDROP_BACKGROUND_LOCATION';

// Register the background task at module level (required by expo-task-manager)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[NearDrop] Background location error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const latest = locations[locations.length - 1];
      // Use require to avoid circular dependency
      const { checkGeofences } = require('./geofencing');
      await checkGeofences(latest.coords.latitude, latest.coords.longitude);
    }
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
  if (!perms.foreground || !perms.background) return false;

  const isStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(
    () => false
  );
  if (isStarted) return true;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30_000, // 30 seconds
    distanceInterval: 50, // 50 meters
    deferredUpdatesInterval: 60_000, // Batch updates every 60s
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'NearDrop',
      notificationBody: 'Monitoring your proximity to saved places',
      notificationColor: '#6200EE',
    },
  });

  return true;
}

export async function stopBackgroundLocation(): Promise<void> {
  const isStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(
    () => false
  );
  if (isStarted) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
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
