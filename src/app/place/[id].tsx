import React, { useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { Text, Button, Chip, Switch, Divider, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useAppStore } from '@/stores/app-store';
import { PlaceForm } from '@/components/place-form';
import { CATEGORY_CONFIG } from '@/utils/constants';
import { haversineDistance, formatDistance } from '@/utils/distance';
import type { PlaceInsert } from '@/types';

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const places = useAppStore((s) => s.places);
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

  const config = CATEGORY_CONFIG[place.category];
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
            category: place.category,
            tags: place.tags,
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
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineMedium">{place.name}</Text>
          <Chip
            icon={config.icon}
            style={[styles.categoryChip, { backgroundColor: config.color + '20' }]}
            textStyle={{ color: config.color }}
          >
            {config.label}
          </Chip>
        </View>

        <Text variant="bodyLarge" style={styles.address}>
          {place.address}
        </Text>

        {distance !== null && (
          <Text variant="bodyMedium" style={styles.distance}>
            à {formatDistance(distance)}
          </Text>
        )}

        <View style={styles.actions}>
          <Button mode="contained" icon="navigation" onPress={handleNavigate} style={styles.navButton}>
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
              color="#6200EE"
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
            minimumTrackTintColor="#6200EE"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#6200EE"
          />
        </View>

        {place.tags.length > 0 && (
          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.sectionTitle}>
              Tags
            </Text>
            <View style={styles.tagsRow}>
              {place.tags.map((tag) => (
                <Chip key={tag} compact style={styles.tag}>
                  {tag}
                </Chip>
              ))}
            </View>
          </View>
        )}

        {place.notes ? (
          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.sectionTitle}>
              Notes
            </Text>
            <Text variant="bodyMedium">{place.notes}</Text>
          </View>
        ) : null}

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            Infos
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            Source : {place.sourceType}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            Coordonnées : {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            Ajouté le : {place.createdAt.toLocaleDateString()}
          </Text>
          {place.notifiedAt && (
            <Text variant="bodySmall" style={styles.meta}>
              Dernière notification : {place.notifiedAt.toLocaleDateString()}
            </Text>
          )}
        </View>

        <Button
          testID="btn-delete-place"
          mode="outlined"
          icon="delete"
          onPress={handleDelete}
          textColor="#B00020"
          style={styles.deleteButton}
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
    backgroundColor: '#F5F5F5',
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
  address: {
    color: '#444',
    marginBottom: 4,
  },
  distance: {
    color: '#6200EE',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#6200EE',
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
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E8DEF8',
  },
  meta: {
    color: '#888',
    marginBottom: 2,
  },
  deleteButton: {
    marginTop: 8,
    marginBottom: 32,
    borderColor: '#B00020',
  },
});
