import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { FAB, Badge, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/stores/app-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useLocation } from '@/hooks/use-location';
import { CategoryChips } from '@/components/category-chip';
import MapViewComponent from '@/components/map-view';

export default function MapScreen() {
  const router = useRouter();
  const { location } = useLocation();
  const places = useAppStore((s) => s.places);
  const selectedCategory = useAppStore((s) => s.selectedCategory);
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory);
  const userLocation = useAppStore((s) => s.userLocation);
  const isTrackingEnabled = useSettingsStore((s) => s.isTrackingEnabled);

  const filteredPlaces = useMemo(() => {
    if (!selectedCategory) return places;
    return places.filter((p) => p.category === selectedCategory);
  }, [places, selectedCategory]);

  const initialRegion = location
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

  return (
    <View style={styles.container}>
      <CategoryChips selected={selectedCategory} onSelect={setSelectedCategory} />

      <View style={styles.statusBar}>
        <Badge
          style={[styles.badge, isTrackingEnabled ? styles.badgeActive : styles.badgeInactive]}
        >
          {isTrackingEnabled ? 'Tracking' : 'Paused'}
        </Badge>
        <Text variant="bodySmall" style={styles.countText}>
          {filteredPlaces.length} places
        </Text>
      </View>

      <MapViewComponent
        places={filteredPlaces}
        userLocation={userLocation}
        initialRegion={initialRegion}
      />

      <FAB
        testID="fab-add-place"
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/place/add' as never)}
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
  countText: {
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6200EE',
  },
});