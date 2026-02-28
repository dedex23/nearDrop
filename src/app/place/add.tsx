import React from 'react';
import { useRouter, Stack } from 'expo-router';
import { PlaceForm } from '@/components/place-form';
import { useAppStore } from '@/stores/app-store';
import { useSettingsStore } from '@/stores/settings-store';
import type { PlaceInsert } from '@/types';

export default function AddPlaceScreen() {
  const router = useRouter();
  const addPlace = useAppStore((s) => s.addPlace);
  const defaultRadius = useSettingsStore((s) => s.defaultRadius);

  const handleSubmit = async (data: PlaceInsert) => {
    await addPlace(data);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Place' }} />
      <PlaceForm
        initialValues={{ radius: defaultRadius }}
        onSubmit={handleSubmit}
        submitLabel="Add Place"
      />
    </>
  );
}
