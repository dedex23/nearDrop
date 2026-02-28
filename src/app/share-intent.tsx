import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useShareIntentContext } from 'expo-share-intent';
import { PlaceForm } from '@/components/place-form';
import { parseSharedContent } from '@/services/share-intent';
import { useAppStore } from '@/stores/app-store';
import { useSettingsStore } from '@/stores/settings-store';
import type { PlaceInsert } from '@/types';

export default function ShareIntentScreen() {
  const router = useRouter();
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const addPlace = useAppStore((s) => s.addPlace);
  const defaultRadius = useSettingsStore((s) => s.defaultRadius);
  const [initialValues, setInitialValues] = useState<Partial<PlaceInsert> | null>(null);
  const [isParsing, setIsParsing] = useState(true);

  useEffect(() => {
    (async () => {
      if (!shareIntent?.text && !shareIntent?.webUrl) {
        setIsParsing(false);
        return;
      }

      try {
        const parsed = await parseSharedContent(
          shareIntent.text ?? null,
          shareIntent.webUrl ?? null
        );
        setInitialValues({
          name: parsed.name ?? '',
          address: parsed.address ?? '',
          latitude: parsed.latitude ?? 0,
          longitude: parsed.longitude ?? 0,
          sourceType: parsed.sourceType ?? 'share_intent',
          sourceUrl: parsed.sourceUrl ?? null,
          notes: parsed.notes ?? '',
          radius: defaultRadius,
        });
      } catch (error) {
        console.error('[NearDrop] Share intent parse error:', error);
        setInitialValues({
          name: '',
          address: '',
          sourceType: 'share_intent',
          notes: shareIntent.text ?? '',
          radius: defaultRadius,
        });
      } finally {
        setIsParsing(false);
      }
    })();
  }, [shareIntent, defaultRadius]);

  const handleSubmit = async (data: PlaceInsert) => {
    await addPlace(data);
    resetShareIntent();
    router.replace('/(tabs)/places');
  };

  const handleCancel = () => {
    resetShareIntent();
    router.replace('/(tabs)/places');
  };

  if (isParsing) {
    return (
      <>
        <Stack.Screen options={{ title: 'Shared Place' }} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#6200EE" />
          <Text style={styles.loadingText}>Analyzing shared content...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Shared Place',
          headerLeft: () => (
            <Text onPress={handleCancel} style={styles.cancelButton}>
              Cancel
            </Text>
          ),
        }}
      />
      <PlaceForm
        initialValues={initialValues ?? { radius: defaultRadius }}
        onSubmit={handleSubmit}
        submitLabel="Save Place"
      />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  cancelButton: {
    color: '#6200EE',
    fontSize: 16,
    paddingHorizontal: 8,
  },
});
