import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
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
  onMarkerPress?: (place: Place) => void;
};

export default function MapViewComponent({
  places,
  userLocation,
  initialRegion,
  onMarkerPress,
}: Props) {
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
    <ClusteredMapView
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      showsUserLocation
      showsMyLocationButton
      initialRegion={initialRegion}
      clusterColor="#6200EE"
      radius={50}
      minPoints={2}
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
              onPress={() => onMarkerPress?.(place)}
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
    </ClusteredMapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
