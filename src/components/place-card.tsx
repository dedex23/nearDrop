import { useMemo, useCallback, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Card, Chip, Text, IconButton, useTheme } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import type { Place } from '@/types';
import { haversineDistance, formatDistance } from '@/utils/distance';
import { useAppStore } from '@/stores/app-store';

interface PlaceCardProps {
  place: Place;
  onPress: () => void;
  onDelete?: () => void;
  onToggleActive?: (active: boolean) => void;
}

export function PlaceCard({ place, onPress, onDelete, onToggleActive }: PlaceCardProps) {
  const theme = useTheme();
  const userLocation = useAppStore((s) => s.userLocation);
  const categories = useAppStore((s) => s.categories);
  const swipeableRef = useRef<Swipeable>(null);

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

  const renderRightActions = useCallback(
    (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const scale = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [1, 0.5],
        extrapolate: 'clamp',
      });
      return (
        <View style={styles.swipeRight}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <IconButton
              icon="delete"
              iconColor="#fff"
              size={24}
              onPress={() => {
                swipeableRef.current?.close();
                onDelete?.();
              }}
            />
          </Animated.View>
        </View>
      );
    },
    [onDelete]
  );

  const renderLeftActions = useCallback(
    (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const scale = dragX.interpolate({
        inputRange: [0, 80],
        outputRange: [0.5, 1],
        extrapolate: 'clamp',
      });
      return (
        <View style={[styles.swipeLeft, place.isActive ? styles.swipeLeftPause : styles.swipeLeftResume]}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <IconButton
              icon={place.isActive ? 'eye-off' : 'eye'}
              iconColor="#fff"
              size={24}
              onPress={() => {
                swipeableRef.current?.close();
                onToggleActive?.(!place.isActive);
              }}
            />
          </Animated.View>
        </View>
      );
    },
    [place.isActive, onToggleActive]
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={onDelete ? renderRightActions : undefined}
      renderLeftActions={onToggleActive ? renderLeftActions : undefined}
      overshootRight={false}
      overshootLeft={false}
    >
      <Card testID="place-card" style={[styles.card, !place.isActive && styles.inactive]} onPress={onPress}>
        <Card.Content>
          <Text variant="titleMedium" numberOfLines={1}>
            {place.name}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {place.address}
          </Text>
          {place.notes ? (
            <Text variant="bodySmall" numberOfLines={2} style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, fontStyle: 'italic' }}>
              {place.notes}
            </Text>
          ) : null}
          <View style={styles.row}>
            <Chip
              icon={category?.icon ?? 'map-marker'}
              compact
              style={[styles.categoryChip, { backgroundColor: (category?.color ?? '#757575') + '20' }]}
              textStyle={{ color: category?.color ?? '#757575', fontSize: 12 }}
            >
              {category?.name ?? ''}
            </Chip>
            {distance !== null && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatDistance(distance)}
              </Text>
            )}
            {place.notifiedAt && (
              <Chip compact icon="check" style={[styles.visitedChip, { backgroundColor: theme.colors.secondaryContainer }]} textStyle={{ fontSize: 11 }}>
                Visité
              </Chip>
            )}
            {!place.isActive && (
              <Text variant="bodySmall" style={styles.inactiveLabel}>
                En pause
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </Swipeable>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 0,
    gap: 8,
  },
  categoryChip: {},
  visitedChip: {},
  inactiveLabel: {
    color: '#E65100',
    fontStyle: 'italic',
  },
  swipeRight: {
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    marginVertical: 4,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  swipeLeft: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    marginVertical: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  swipeLeftPause: {
    backgroundColor: '#757575',
  },
  swipeLeftResume: {
    backgroundColor: '#1976D2',
  },
});
