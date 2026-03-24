import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FAB, Badge, Text, Snackbar, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const theme = useTheme();
  const { location } = useLocation();
  const places = useAppStore((s) => s.places);
  const selectedCategory = useAppStore((s) => s.selectedCategory);
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory);
  const userLocation = useAppStore((s) => s.userLocation);
  const isTrackingEnabled = useSettingsStore((s) => s.isTrackingEnabled);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const prevPlacesCount = useRef(0);
  const isInitialLoad = useRef(true);

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

  const initialRegion = useMemo(() => {
    return location
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
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only compute once on mount

  // Animate to coordinates when navigated from add/share-intent
  const focusRegion = useMemo(() => {
    if (params.lat && params.lng) {
      return {
        latitude: parseFloat(params.lat),
        longitude: parseFloat(params.lng),
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return null;
  }, [params.lat, params.lng]);

  // Show snackbar when a new place is added (skip initial load from DB)
  useEffect(() => {
    if (isInitialLoad.current) {
      if (places.length > 0) {
        isInitialLoad.current = false;
      }
    } else if (places.length > prevPlacesCount.current) {
      setSnackbarVisible(true);
    }
    prevPlacesCount.current = places.length;
  }, [places.length]);

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
        focusRegion={focusRegion}
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

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        Lieu enregistré avec succès
      </Snackbar>
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
  snackbar: {
    marginBottom: 80,
  },
});