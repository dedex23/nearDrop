import React, { useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import type MapView from 'react-native-maps';
import { useTheme } from 'react-native-paper';
import { useAppStore } from '@/stores/app-store';
import { haversineDistance, formatDistance } from '@/utils/distance';
import type { Place } from '@/types';
import { CustomMarkerView } from '@/components/custom-marker';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Props = {
  places: Place[];
  userLocation: { latitude: number; longitude: number } | null;
  initialRegion: Region;
  onMarkerPress?: (place: Place) => void;
};

export type MapViewHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
};

const MapViewComponent = React.forwardRef<MapViewHandle, Props>(function MapViewComponent(
  { places, userLocation, initialRegion, onMarkerPress },
  ref,
) {
  const theme = useTheme();
  const totalPlaces = useAppStore((s) => s.places.length);
  const categories = useAppStore((s) => s.categories);
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration = 500) => {
      mapRef.current?.animateToRegion(region, duration);
    },
  }));

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
      key={totalPlaces}
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      showsUserLocation
      showsMyLocationButton
      initialRegion={initialRegion}
      clusterColor={theme.colors.primary}
      radius={50}
      minPoints={2}
      customMapStyle={theme.dark ? darkMapStyle : undefined}
      userInterfaceStyle={theme.dark ? 'dark' : 'light'}
    >
      {/* Markers as direct children for clustering to work */}
      {placesWithDistance.map(({ place, distance, category }) => {
        const color = category?.color ?? '#757575';
        return (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.name}
            description={
              distance !== null
                ? `${category?.name ?? ''} — ${formatDistance(distance)}`
                : category?.name ?? ''
            }
            onPress={() => onMarkerPress?.(place)}
            tracksViewChanges={false}
          >
            <CustomMarkerView color={color} icon={category?.icon ?? 'map-marker'} />
          </Marker>
        );
      })}
      {/* Circles rendered separately — not clusterable */}
      {placesWithDistance.map(({ place, category }) => {
        if (!place.isActive) return null;
        const color = category?.color ?? '#757575';
        return (
          <Circle
            key={`circle-${place.id}`}
            center={{ latitude: place.latitude, longitude: place.longitude }}
            radius={place.radius}
            strokeColor={color + '60'}
            fillColor={color + '15'}
          />
        );
      })}
    </ClusteredMapView>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});

export default React.memo(MapViewComponent);

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
];
