import React, { forwardRef, useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text, Button, Chip, Divider, useTheme } from 'react-native-paper';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/stores/app-store';
import { CategoryIcon } from '@/components/category-icon';
import { haversineDistance, formatDistance } from '@/utils/distance';
import type { Place } from '@/types';

interface PlaceBottomSheetProps {
  place: Place | null;
  onDismiss: () => void;
  onDelete?: () => void;
}

export const PlaceBottomSheet = forwardRef<BottomSheet, PlaceBottomSheetProps>(
  function PlaceBottomSheet({ place, onDismiss, onDelete }, ref) {
    const router = useRouter();
    const theme = useTheme();
    const categories = useAppStore((s) => s.categories);
    const removePlace = useAppStore((s) => s.removePlace);
    const userLocation = useAppStore((s) => s.userLocation);
    const snapPoints = useMemo(() => ['35%', '60%'], []);

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
              icon={({ size }) => (
                <CategoryIcon icon={category.icon} size={size} color={category.color} />
              )}
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
          {place && (
            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={() => {
                  onDismiss();
                  router.push(`/place/${place.id}` as never);
                }}
                style={styles.actionButton}
              >
                Voir le détail
              </Button>
              <Button
                mode="outlined"
                textColor={theme.colors.error}
                onPress={() => {
                  Alert.alert('Supprimer', `Supprimer « ${place.name} » ?`, [
                    { text: 'Annuler', style: 'cancel' },
                    {
                      text: 'Supprimer',
                      style: 'destructive',
                      onPress: async () => {
                        onDismiss();
                        await removePlace(place.id);
                        onDelete?.();
                      },
                    },
                  ]);
                }}
                style={[styles.actionButton, { borderColor: theme.colors.error }]}
              >
                Supprimer
              </Button>
            </View>
          )}
          {place?.notes ? (
            <>
              <Divider style={styles.divider} />
              <Text variant="labelLarge">Notes</Text>
              <Text variant="bodyMedium" selectable>
                {place.notes}
              </Text>
            </>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  content: { padding: 16 },
  chip: { alignSelf: 'flex-start', marginTop: 8 },
  divider: { marginVertical: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionButton: { flex: 1 },
});
