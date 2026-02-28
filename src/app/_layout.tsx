import '../services/location'; // Register background task at module scope

import React, { useEffect } from 'react';
import { Slot, SplashScreen, useRouter } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import * as Notifications from 'expo-notifications';
import { useDatabase } from '@/hooks/use-database';
import { useAppStore } from '@/stores/app-store';
import { useSettingsStore } from '@/stores/settings-store';
import { setupNotifications } from '@/services/notifications';
import { startBackgroundLocation, stopBackgroundLocation } from '@/services/location';
import { theme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isReady, error } = useDatabase();
  const loadPlaces = useAppStore((s) => s.loadPlaces);
  const isTrackingEnabled = useSettingsStore((s) => s.isTrackingEnabled);
  const router = useRouter();

  // Initialize app when database is ready
  useEffect(() => {
    if (!isReady) return;

    (async () => {
      try {
        await setupNotifications();
        await loadPlaces();
      } finally {
        SplashScreen.hideAsync();
      }
    })();
  }, [isReady, loadPlaces]);

  // Manage background tracking based on settings
  useEffect(() => {
    if (!isReady) return;

    if (isTrackingEnabled) {
      startBackgroundLocation();
    } else {
      stopBackgroundLocation();
    }
  }, [isTrackingEnabled, isReady]);

  // Handle notification tap → navigate to place detail
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const placeId = response.notification.request.content.data?.placeId as string | undefined;
      if (placeId) {
        router.push(`/place/${placeId}` as never);
      }
    });
    return () => subscription.remove();
  }, [router]);

  if (error) {
    console.error('[NearDrop] Database migration error:', error);
  }

  if (!isReady) return null;

  return (
    <PaperProvider theme={theme}>
      <Slot />
    </PaperProvider>
  );
}
