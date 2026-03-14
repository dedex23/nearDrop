import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useShareIntentContext } from 'expo-share-intent';
import { PlaceForm } from '@/components/place-form';
import { parseSharedContent } from '@/services/share-intent';
import { useAppStore } from '@/stores/app-store';
import { useSettingsStore } from '@/stores/settings-store';
import type { PlaceInsert } from '@/types';

export default function ShareIntentScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const addPlace = useAppStore((s) => s.addPlace);
  const defaultRadius = useSettingsStore((s) => s.defaultRadius);
  const [initialValues, setInitialValues] = useState<Partial<PlaceInsert> | null>(null);
  const [isParsing, setIsParsing] = useState(true);
  const hasStartedParsing = useRef(false);

  useEffect(() => {
    console.log('[NearDrop] shareIntent:', JSON.stringify(shareIntent));

    // Ignore empty updates — the lib may reset shareIntent after the initial delivery
    if (!shareIntent?.text && !shareIntent?.webUrl) return;

    // Lock: only process the first valid shareIntent delivery
    if (hasStartedParsing.current) return;
    hasStartedParsing.current = true;

    (async () => {
      try {
        const parsed = await parseSharedContent(
          shareIntent.text ?? null,
          shareIntent.webUrl ?? null,
          shareIntent.meta?.title ?? null
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

  // Safety net: stop spinner after 5s if no data arrives
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isParsing) setIsParsing(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isParsing]);

  const handleSubmit = async (data: PlaceInsert) => {
    const place = await addPlace(data);
    resetShareIntent();
    router.back();
  };

  const handleCancel = () => {
    resetShareIntent();
    router.back();
  };

  if (isParsing) {
    return (
      <>
        <Stack.Screen options={{ title: 'Lieu partagé' }} />
        <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>Analyse du contenu partagé...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Ajouter un lieu partagé',
          headerLeft: () => (
            <Text onPress={handleCancel} style={{ color: theme.colors.primary, fontSize: 16, paddingHorizontal: 8 }}>
              Annuler
            </Text>
          ),
        }}
      />
      <PlaceForm
        key={initialValues ? 'filled' : 'empty'}
        initialValues={initialValues ?? { radius: defaultRadius }}
        onSubmit={handleSubmit}
        submitLabel="Enregistrer le lieu"
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
});
