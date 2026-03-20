import { Alert } from 'react-native';
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
    try {
      const place = await addPlace(data);
      // Navigate to map tab centered on the new place
      router.replace({
        pathname: '/(tabs)/map',
        params: { lat: place.latitude, lng: place.longitude },
      } as never);
    } catch (error) {
      console.error('[NearDrop] Failed to add place:', error);
      Alert.alert('Erreur', "Impossible d'ajouter le lieu.");
    }
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
