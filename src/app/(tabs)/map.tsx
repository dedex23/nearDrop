import React, { useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { FAB, Badge, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/stores/app-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useLocation } from '@/hooks/use-location';
import { CategoryChips } from '@/components/category-chip';
import { CATEGORY_CONFIG } from '@/utils/constants';
import { haversineDistance, formatDistance } from '@/utils/distance';

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
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

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsUserLocation
        showsMyLocationButton
        initialRegion={initialRegion}
      >
        {filteredPlaces.map((place) => {
          const config = CATEGORY_CONFIG[place.category];
          const distance = userLocation
            ? haversineDistance(
                userLocation.latitude,
                userLocation.longitude,
                place.latitude,
                place.longitude
              )
            : null;

          return (
            <React.Fragment key={place.id}>
              <Marker
                coordinate={{ latitude: place.latitude, longitude: place.longitude }}
                title={place.name}
                description={
                  distance !== null
                    ? `${config.label} — ${formatDistance(distance)}`
                    : config.label
                }
                pinColor={config.color}
                onCalloutPress={() => router.push(`/place/${place.id}` as never)}
              />
              {place.isActive && (
                <Circle
                  center={{ latitude: place.latitude, longitude: place.longitude }}
                  radius={place.radius}
                  strokeColor={config.color + '60'}
                  fillColor={config.color + '15'}
                />
              )}
            </React.Fragment>
          );
        })}
      </MapView>

      <FAB icon="plus" style={styles.fab} onPress={() => router.push('/place/add' as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
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
