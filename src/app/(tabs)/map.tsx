import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FAB, Badge, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';
import { useAppStore } from '@/stores/app-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useLocation } from '@/hooks/use-location';
import { CategoryChips } from '@/components/category-chip';
import MapViewComponent from '@/components/map-view';
import { PlaceBottomSheet } from '@/components/place-bottom-sheet';
import type { Place } from '@/types';

export default function MapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { location } = useLocation();
  const places = useAppStore((s) => s.places);
  const selectedCategory = useAppStore((s) => s.selectedCategory);
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory);
  const userLocation = useAppStore((s) => s.userLocation);
  const isTrackingEnabled = useSettingsStore((s) => s.isTrackingEnabled);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleMarkerPress = useCallback((place: Place) => {
    setSelectedPlace(place);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleDismiss = useCallback(() => {
    setSelectedPlace(null);
    bottomSheetRef.current?.close();
  }, []);

  const filteredPlaces = useMemo(() => {
    if (!selectedCategory) return places;
    return places.filter((p) => p.categoryId === selectedCategory);
  }, [places, selectedCategory]);

  const initialRegion = useMemo(
    () =>
      location
        ? {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }
        : {
            latitude: 48.8566,
            longitude: 2.3522,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          },
    [location]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CategoryChips selected={selectedCategory} onSelect={setSelectedCategory} />

      <View style={styles.statusBar}>
        <Badge
          style={[styles.badge, isTrackingEnabled ? styles.badgeActive : styles.badgeInactive]}
        >
          {isTrackingEnabled ? 'Actif' : 'En pause'}
        </Badge>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {filteredPlaces.length} lieux
        </Text>
      </View>

      <MapViewComponent
        places={filteredPlaces}
        userLocation={userLocation}
        initialRegion={initialRegion}
        onMarkerPress={handleMarkerPress}
      />

      <FAB
        testID="fab-add-place-map"
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/place/add' as never)}
      />

      <PlaceBottomSheet
        ref={bottomSheetRef}
        place={selectedPlace}
        onDismiss={handleDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
  },
  badgeActive: {
    backgroundColor: '#43A047',
  },
  badgeInactive: {
    backgroundColor: '#9E9E9E',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});