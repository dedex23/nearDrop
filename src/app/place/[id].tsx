import React, { useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { Text, Button, Chip, Switch, Divider, IconButton, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useAppStore } from '@/stores/app-store';
import { CategoryIcon } from '@/components/category-icon';
import { PlaceForm } from '@/components/place-form';
import { haversineDistance, formatDistance } from '@/utils/distance';
import type { PlaceInsert } from '@/types';

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const places = useAppStore((s) => s.places);
  const categories = useAppStore((s) => s.categories);
  const updatePlace = useAppStore((s) => s.updatePlace);
  const removePlace = useAppStore((s) => s.removePlace);
  const userLocation = useAppStore((s) => s.userLocation);

  const [isEditing, setIsEditing] = useState(false);
  const isDeleting = useRef(false);

  const place = places.find((p) => p.id === id);

  // After deletion, the store updates and place becomes undefined.
  // Return null to avoid re-rendering with stale navigation state.
  if (isDeleting.current) return null;

  if (!place) {
    return (
      <>
        <Stack.Screen options={{ title: 'Lieu introuvable' }} />
        <View style={styles.centered}>
          <Text variant="bodyLarge">Lieu introuvable</Text>
          <Button onPress={() => router.back()} style={styles.backButton}>
            Retour
          </Button>
        </View>
      </>
    );
  }

  const category = categories.find((c) => c.id === place.categoryId);
  const distance = userLocation
    ? haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        place.latitude,
        place.longitude
      )
    : null;

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    Linking.openURL(url);
  };

  const handleDelete = () => {
    Alert.alert('Supprimer le lieu', `Êtes-vous sûr de vouloir supprimer "${place.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          isDeleting.current = true;
          try {
            await removePlace(place.id);
            router.back();
          } catch (error) {
            isDeleting.current = false;
            console.error('[NearDrop] Delete failed:', error);
          }
        },
      },
    ]);
  };

  const handleToggleActive = async (value: boolean) => {
    await updatePlace(place.id, { isActive: value });
  };

  const handleRadiusChange = async (value: number) => {
    await updatePlace(place.id, { radius: Math.round(value) });
  };

  const handleEditSubmit = async (data: PlaceInsert) => {
    await updatePlace(place.id, data);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <>
        <Stack.Screen
          options={{
            title: `Modifier : ${place.name}`,
            headerRight: () => (
              <IconButton icon="close" onPress={() => setIsEditing(false)} />
            ),
          }}
        />
        <PlaceForm
          initialValues={{
            name: place.name,
            address: place.address,
            categoryId: place.categoryId,
            notes: place.notes,
            radius: place.radius,
            latitude: place.latitude,
            longitude: place.longitude,
            sourceType: place.sourceType,
            sourceUrl: place.sourceUrl,
            imageUrl: place.imageUrl,
            isActive: place.isActive,
          }}
          onSubmit={handleEditSubmit}
          submitLabel="Enregistrer"
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: place.name,
          headerRight: () => (
            <IconButton testID="btn-edit-place" icon="pencil" onPress={() => setIsEditing(true)} />
          ),
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text variant="headlineMedium">{place.name}</Text>
          {category && (
            <Chip
              icon={({ size }) => (
                <CategoryIcon
                  icon={category.icon}
                  size={size}
                  color={category.color}
                />
              )}
              style={[styles.categoryChip, { backgroundColor: category.color + '20' }]}
              textStyle={{ color: category.color }}
            >
              {category.name}
            </Chip>
          )}
        </View>

        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
          {place.address}
        </Text>

        {distance !== null && (
          <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginBottom: 12 }}>
            à {formatDistance(distance)}
          </Text>
        )}

        <View style={styles.actions}>
          <Button mode="contained" icon="navigation" onPress={handleNavigate} style={[styles.navButton, { backgroundColor: theme.colors.primary }]}>
            Itinéraire
          </Button>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.row}>
            <Text variant="bodyMedium">Actif</Text>
            <Switch
              testID="switch-active"
              value={place.isActive}
              onValueChange={handleToggleActive}
              color={theme.colors.primary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="labelLarge">Rayon de notification : {place.radius}m</Text>
          <Slider
            value={place.radius}
            onSlidingComplete={handleRadiusChange}
            minimumValue={50}
            maximumValue={500}
            step={10}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.surfaceVariant}
            thumbTintColor={theme.colors.primary}
          />
        </View>

        {place.notes ? (
          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.sectionTitle}>
              Notes
            </Text>
            <Text variant="bodyMedium" selectable>{place.notes}</Text>
          </View>
        ) : null}

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            Infos
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>
            Source : {place.sourceType}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>
            Coordonnées : {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>
            Ajouté le : {place.createdAt.toLocaleDateString()}
          </Text>
          {place.notifiedAt && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>
              Dernière notification : {place.notifiedAt.toLocaleDateString()}
            </Text>
          )}
        </View>

        <Button
          testID="btn-delete-place"
          mode="outlined"
          icon="delete"
          onPress={handleDelete}
          textColor={theme.colors.error}
          style={[styles.deleteButton, { borderColor: theme.colors.error }]}
        >
          Supprimer le lieu
        </Button>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  categoryChip: {
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  navButton: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteButton: {
    marginTop: 8,
    marginBottom: 32,
  },
});
