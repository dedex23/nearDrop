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

  if (finalStatus !== 'granted') {
    console.log('[NearDrop][Notif] Permission denied:', finalStatus);
    return false;
  }

  // Delete legacy channel (Android won't let apps modify existing channels)
  await Notifications.deleteNotificationChannelAsync('proximity').catch(() => {});

  // Create Android notification channel (required on Android 8+)
  // HIGH importance enables sound + heads-up by default — no explicit sound needed
  await Notifications.setNotificationChannelAsync('proximity-v2', {
    name: 'Proximity Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6200EE',
  });

  console.log('[NearDrop][Notif] Setup OK, channel proximity-v2 created');
  return true;
}

export async function sendProximityNotification(
  place: Place,
  distanceMeters?: number
): Promise<void> {
  const distanceText = distanceMeters ? ` (${formatDistance(distanceMeters)})` : '';

  console.log('[NearDrop][Notif] Sending:', place.name, distanceText);
  await Notifications.scheduleNotificationAsync({
    identifier: `proximity-${place.id}`,
    content: {
      title: `Near: ${place.name}`,
      body: `${place.category} — ${place.address}${distanceText}`,
      data: { placeId: place.id },
    },
    trigger: { channelId: 'proximity-v2' },
  });
}

export async function sendGroupedNotification(places: Place[]): Promise<void> {
  if (places.length === 0) return;

  if (places.length === 1) {
    await sendProximityNotification(places[0]);
    return;
  }

  const names = places.map((p) => p.name).join(', ');
  console.log('[NearDrop][Notif] Sending grouped:', names);
  const groupId = places.map((p) => p.id).sort().join('-');
  await Notifications.scheduleNotificationAsync({
    identifier: `proximity-group-${groupId}`,
    content: {
      title: `${places.length} places nearby`,
      body: names,
      data: { placeIds: places.map((p) => p.id) },
    },
    trigger: { channelId: 'proximity-v2' },
  });
}
