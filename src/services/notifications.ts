import * as Notifications from 'expo-notifications';
import type { Place } from '@/types';
import { formatDistance } from '@/utils/distance';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  // Create Android notification channel (required on Android 8+)
  await Notifications.setNotificationChannelAsync('proximity', {
    name: 'Proximity Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6200EE',
    sound: 'default',
  });

  return true;
}

export async function sendProximityNotification(
  place: Place,
  distanceMeters?: number
): Promise<void> {
  const distanceText = distanceMeters ? ` (${formatDistance(distanceMeters)})` : '';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Near: ${place.name}`,
      body: `${place.category} — ${place.address}${distanceText}`,
      data: { placeId: place.id },
      sound: 'default',
    },
    trigger: null, // Send immediately
  });
}

export async function sendGroupedNotification(places: Place[]): Promise<void> {
  if (places.length === 0) return;

  if (places.length === 1) {
    await sendProximityNotification(places[0]);
    return;
  }

  const names = places.map((p) => p.name).join(', ');
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${places.length} places nearby`,
      body: names,
      data: { placeIds: places.map((p) => p.id) },
      sound: 'default',
    },
    trigger: null,
  });
}
