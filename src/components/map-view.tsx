import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { CATEGORY_CONFIG } from '@/utils/constants';
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

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      showsUserLocation
      showsMyLocationButton
      initialRegion={initialRegion}
    >
      {places.map((place) => {
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
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});