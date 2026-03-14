import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/stores/app-store';
import { haversineDistance, formatDistance } from '@/utils/distance';
import type { Place } from '@/types';

type Props = {
  places: Place[];
  userLocation: { latitude: number; longitude: number } | null;
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
};

export default function MapViewComponent({ places, userLocation, initialRegion }: Props) {
  const router = useRouter();
  const categories = useAppStore((s) => s.categories);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const placesWithDistance = useMemo(
    () =>
      places.map((place) => {
        const category = categoryMap.get(place.categoryId);
        return {
          place,
          distance: userLocation
            ? haversineDistance(
                userLocation.latitude,
                userLocation.longitude,
                place.latitude,
                place.longitude
              )
            : null,
          category,
        };
      }),
    [places, userLocation, categoryMap]
  );

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      showsUserLocation
      showsMyLocationButton
      initialRegion={initialRegion}
    >
      {placesWithDistance.map(({ place, distance, category }) => {
        const color = category?.color ?? '#757575';
        return (
          <React.Fragment key={place.id}>
            <Marker
              coordinate={{ latitude: place.latitude, longitude: place.longitude }}
              title={place.name}
              description={
                distance !== null
                  ? `${category?.name ?? ''} — ${formatDistance(distance)}`
                  : category?.name ?? ''
              }
              pinColor={color}
              onCalloutPress={() => router.push(`/place/${place.id}` as never)}
            />
            {place.isActive && (
              <Circle
                center={{ latitude: place.latitude, longitude: place.longitude }}
                radius={place.radius}
                strokeColor={color + '60'}
                fillColor={color + '15'}
              />
            )}
          </React.Fragment>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
