import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Chip, Text } from 'react-native-paper';
import type { Place } from '@/types';
import { CATEGORY_CONFIG } from '@/utils/constants';
import { haversineDistance, formatDistance } from '@/utils/distance';
import { useAppStore } from '@/stores/app-store';

interface PlaceCardProps {
  place: Place;
  onPress: () => void;
}

export function PlaceCard({ place, onPress }: PlaceCardProps) {
  const userLocation = useAppStore((s) => s.userLocation);
  const config = CATEGORY_CONFIG[place.category];

  const distance =
    userLocation
      ? haversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          place.latitude,
          place.longitude
        )
      : null;

  return (
    <Card testID="place-card" style={[styles.card, !place.isActive && styles.inactive]} onPress={onPress}>
      <Card.Content>
        <Text variant="titleMedium" numberOfLines={1}>
          {place.name}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={styles.address}>
          {place.address}
        </Text>
        <Card.Content style={styles.row}>
          <Chip
            icon={config.icon}
            compact
            style={[styles.categoryChip, { backgroundColor: config.color + '20' }]}
            textStyle={{ color: config.color, fontSize: 12 }}
          >
            {config.label}
          </Chip>
          {distance !== null && (
            <Text variant="bodySmall" style={styles.distance}>
              {formatDistance(distance)}
            </Text>
          )}
          {place.notifiedAt && (
            <Chip compact icon="check" style={styles.visitedChip} textStyle={{ fontSize: 11 }}>
              Visited
            </Chip>
          )}
          {!place.isActive && (
            <Text variant="bodySmall" style={styles.inactiveLabel}>
              Paused
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
