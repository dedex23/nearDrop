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
    const place = await addPlace(data);
    // Navigate to map tab centered on the new place
    router.replace({
      pathname: '/(tabs)/map',
      params: { lat: place.latitude, lng: place.longitude },
    } as never);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Ajouter un lieu' }} />
      <PlaceForm
        initialValues={{ radius: defaultRadius }}
        onSubmit={handleSubmit}
        submitLabel="Ajouter le lieu"
      />
    </>
  );
}
