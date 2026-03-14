import React, { useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Stack, SplashScreen, useRouter } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import * as Notifications from 'expo-notifications';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { useDatabase } from '@/hooks/use-database';
import { useAppStore } from '@/stores/app-store';
import { useSettingsStore } from '@/stores/settings-store';
import { setupNotifications } from '@/services/notifications';
// Side-effect import registers background task at module scope;
// named imports from the same module are merged by the bundler.
// eslint-disable-next-line import/no-duplicates
import '@/services/location';
// eslint-disable-next-line import/no-duplicates
import { startBackgroundLocation, stopBackgroundLocation } from '@/services/location';
import { lightTheme, darkTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { isReady, error } = useDatabase();
  const loadPlaces = useAppStore((s) => s.loadPlaces);
  const loadCategories = useAppStore((s) => s.loadCategories);
  const isTrackingEnabled = useSettingsStore((s) => s.isTrackingEnabled);
  const [hydrated, setHydrated] = useState(useSettingsStore.persist.hasHydrated());
  const router = useRouter();
  const { hasShareIntent } = useShareIntentContext();

  // Initialize app when database is ready
  useEffect(() => {
    if (!isReady) return;

    (async () => {
      try {
        await setupNotifications();
        await loadCategories();
        await loadPlaces();
      } finally {
        SplashScreen.hideAsync();
      }
    })();
  }, [isReady, loadCategories, loadPlaces]);

  // Wait for settings store hydration before acting on persisted values
  useEffect(() => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
    return () => unsub();
  }, []);

  // Manage background tracking based on settings (only after hydration)
  useEffect(() => {
    if (!isReady || !hydrated) return;

    if (isTrackingEnabled) {
      startBackgroundLocation();
    } else {
      stopBackgroundLocation();
    }
  }, [isTrackingEnabled, isReady, hydrated]);

  // Handle notification tap → navigate to place detail
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const placeId = response.notification.request.content.data?.placeId as string | undefined;
      const placeIds = response.notification.request.content.data?.placeIds as
        | string[]
        | undefined;
      const targetId = placeId || placeIds?.[0];
      if (targetId) {
        router.push(`/place/${targetId}`);
      }
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // router is a stable Expo Router singleton

  // Handle share intent → navigate to share screen (push, not replace, to keep tabs mounted)
  useEffect(() => {
    if (hasShareIntent) {
      router.push('/share-intent');
    }
  }, [hasShareIntent, router]);

  if (error) {
    console.error('[NearDrop] Database migration error:', error);
  }

  if (!isReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="place" />
      <Stack.Screen name="import" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="share-intent" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const activeTheme = useMemo(() => {
    if (themeMode === 'light') return lightTheme;
    if (themeMode === 'dark') return darkTheme;
    return colorScheme === 'dark' ? darkTheme : lightTheme;
  }, [themeMode, colorScheme]);

  return (
    <ShareIntentProvider>
      <PaperProvider theme={activeTheme}>
        <RootLayoutInner />
      </PaperProvider>
    </ShareIntentProvider>
  );
}
