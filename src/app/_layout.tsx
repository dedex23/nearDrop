import React, { useEffect, useMemo, useState } from 'react';
import { useColorScheme, View, Text as RNText, ScrollView as SV } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

SplashScreen.preventAutoHideAsync().catch(() => {});

// Silence ExpoKeepAwake errors when the JS bundle runs in the background
// without an Android Activity (e.g. after OS kills the app and the background
// location task restarts the process).
const _origHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  if (!isFatal && String(error).includes('ExpoKeepAwake')) {
    if (__DEV__)
      console.warn('[NearDrop] ExpoKeepAwake suppressed (sync):', (error as Error)?.stack ?? error);
    return;
  }
  _origHandler(error, isFatal);
});
// Also catch unhandled promise rejections from ExpoKeepAwake
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _g = global as any;
const _origRejection = _g.onunhandledrejection;
_g.onunhandledrejection = (e: { reason?: unknown; preventDefault?: () => void }) => {
  if (String(e?.reason).includes('ExpoKeepAwake')) {
    if (__DEV__)
      console.warn('[NearDrop] ExpoKeepAwake suppressed (promise):', (e?.reason as Error)?.stack ?? e?.reason);
    e?.preventDefault?.();
    return;
  }
  _origRejection?.(e);
};

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
        SplashScreen.hideAsync().catch(() => {});
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

  // Handle notification tap → navigate to map centered on the place
  const lastNotification = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!lastNotification) return;
    const data = lastNotification.notification.request.content.data;
    const lat = data?.lat as number | undefined;
    const lng = data?.lng as number | undefined;
    if (lat !== undefined && lng !== undefined) {
      router.navigate({
        pathname: '/(tabs)/map',
        params: { lat, lng, t: Date.now() },
      } as never);
    } else {
      router.navigate('/(tabs)/map' as never);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastNotification]); // router is a stable Expo Router singleton

  // Handle share intent → navigate to share screen (push, not replace, to keep tabs mounted)
  useEffect(() => {
    if (hasShareIntent) {
      router.push('/share-intent');
    }
  }, [hasShareIntent, router]);

  if (error) {
    console.error('[NearDrop] Database migration error:', error);
    // Show error on screen so we can diagnose
    SplashScreen.hideAsync().catch(() => {});
    return (
      <View style={{ flex: 1, padding: 40, backgroundColor: '#B00020', justifyContent: 'center' }}>
        <RNText style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
          Migration Error
        </RNText>
        <SV>
          <RNText style={{ color: '#fff', fontSize: 14 }}>{String(error)}</RNText>
        </SV>
      </View>
    );
  }

  if (!isReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="place" />
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

  const isDark = activeTheme.dark;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ShareIntentProvider>
        <PaperProvider theme={activeTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <RootLayoutInner />
        </PaperProvider>
      </ShareIntentProvider>
    </GestureHandlerRootView>
  );
}
