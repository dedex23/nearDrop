import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Card, Chip, Text } from 'react-native-paper';
import type { Place } from '@/types';
import { haversineDistance, formatDistance } from '@/utils/distance';
import { useAppStore } from '@/stores/app-store';

interface PlaceCardProps {
  place: Place;
  onPress: () => void;
}

export function PlaceCard({ place, onPress }: PlaceCardProps) {
  const userLocation = useAppStore((s) => s.userLocation);
  const categories = useAppStore((s) => s.categories);

  const category = useMemo(
    () => categories.find((c) => c.id === place.categoryId),
    [categories, place.categoryId]
  );

  const distance = useMemo(
    () =>
      userLocation
        ? haversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            place.latitude,
            place.longitude
          )
        : null,
    [userLocation, place.latitude, place.longitude]
  );

  return (
    <Card testID="place-card" style={[styles.card, !place.isActive && styles.inactive]} onPress={onPress}>
      <Card.Content>
        <Text variant="titleMedium" numberOfLines={1}>
          {place.name}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={styles.address}>
          {place.address}
        </Text>
        {place.notes ? (
          <Text variant="bodySmall" numberOfLines={2} style={styles.notes}>
            {place.notes}
          </Text>
        ) : null}
        <Card.Content style={styles.row}>
          <Chip
            icon={category?.icon ?? 'map-marker'}
            compact
            style={[styles.categoryChip, { backgroundColor: (category?.color ?? '#757575') + '20' }]}
            textStyle={{ color: category?.color ?? '#757575', fontSize: 12 }}
          >
            {category?.name ?? ''}
          </Chip>
          {distance !== null && (
            <Text variant="bodySmall" style={styles.distance}>
              {formatDistance(distance)}
            </Text>
          )}
          {place.notifiedAt && (
            <Chip compact icon="check" style={styles.visitedChip} textStyle={{ fontSize: 11 }}>
              Visité
            </Chip>
          )}
          {!place.isActive && (
            <Text variant="bodySmall" style={styles.inactiveLabel}>
              En pause
            </Text>
          )}
        </Card.Content>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 4,
  },
  inactive: {
    opacity: 0.6,
  },
  address: {
    color: '#666',
    marginTop: 2,
  },
  notes: {
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 0,
    gap: 8,
  },
  categoryChip: {
    height: 28,
  },
  visitedChip: {
    height: 28,
    backgroundColor: '#E8F5E9',
  },
  distance: {
    color: '#888',
  },
  inactiveLabel: {
    color: '#E65100',
    fontStyle: 'italic',
  },
});
