import React, { forwardRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Text, Button, Chip, Divider, useTheme } from 'react-native-paper';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/stores/app-store';
import { haversineDistance, formatDistance } from '@/utils/distance';
import type { Place } from '@/types';

interface PlaceBottomSheetProps {
  place: Place | null;
  onDismiss: () => void;
}

export const PlaceBottomSheet = forwardRef<BottomSheet, PlaceBottomSheetProps>(
  function PlaceBottomSheet({ place, onDismiss }, ref) {
    const router = useRouter();
    const theme = useTheme();
    const categories = useAppStore((s) => s.categories);
    const userLocation = useAppStore((s) => s.userLocation);
    const snapPoints = useMemo(() => ['30%', '60%'], []);

    const category = useMemo(
      () => (place ? categories.find((c) => c.id === place.categoryId) : null),
      [categories, place]
    );

    const distance = useMemo(
      () =>
        place && userLocation
          ? haversineDistance(
              userLocation.latitude,
              userLocation.longitude,
              place.latitude,
              place.longitude
            )
          : null,
      [place, userLocation]
    );

    return (
      <BottomSheet
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onDismiss}
        index={-1}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.onSurfaceVariant }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          <Text variant="headlineSmall">{place?.name}</Text>
          {category && (
            <Chip
              icon={category.icon}
              compact
              style={[styles.chip, { backgroundColor: category.color + '20' }]}
              textStyle={{ color: category.color }}
            >
              {category.name}
            </Chip>
          )}
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            {place?.address}
          </Text>
          {distance !== null && (
            <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: 4 }}>
              à {formatDistance(distance)}
            </Text>
          )}
          {place?.notes ? (
            <>
              <Divider style={styles.divider} />
              <Text variant="labelLarge">Notes</Text>
              <BottomSheetScrollView style={styles.notesScroll} nestedScrollEnabled>
                <Text variant="bodyMedium" selectable>
                  {place.notes}
                </Text>
              </BottomSheetScrollView>
            </>
          ) : null}
          {place && (
            <Button
              mode="contained"
              onPress={() => {
                onDismiss();
                router.push(`/place/${place.id}` as never);
              }}
              style={styles.detailButton}
            >
              Voir le détail
            </Button>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  content: { padding: 16 },
  chip: { alignSelf: 'flex-start', marginTop: 8 },
  divider: { marginVertical: 12 },
  notesScroll: { maxHeight: 120, marginTop: 8 },
  detailButton: { marginTop: 16 },
});
