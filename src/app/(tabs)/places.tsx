import React, { useMemo, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Searchbar, FAB, SegmentedButtons, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/stores/app-store';
import { PlaceCard } from '@/components/place-card';
import { CategoryChips } from '@/components/category-chip';
import type { Place } from '@/types';

export default function PlacesScreen() {
  const router = useRouter();
  const {
    places,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    isLoading,
    loadPlaces,
    updatePlace,
    removePlace,
    categories,
  } = useAppStore();

  const filteredAndSorted = useMemo(() => {
    let result = places;

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q)
      );
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter((p) => p.categoryId === selectedCategory);
    }

    // Sort
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category': {
          const catA = categories.find((c) => c.id === a.categoryId);
          const catB = categories.find((c) => c.id === b.categoryId);
          return (catA?.name ?? '').localeCompare(catB?.name ?? '');
        }
        case 'date':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });
  }, [places, searchQuery, selectedCategory, sortBy, categories]);

  const handleDelete = useCallback(
    (place: Place) => {
      Alert.alert(
        'Supprimer le lieu',
        `Voulez-vous vraiment supprimer "${place.name}" ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => removePlace(place.id),
          },
        ]
      );
    },
    [removePlace]
  );

  const handleToggleActive = useCallback(
    (id: string, active: boolean) => {
      updatePlace(id, { isActive: active });
    },
    [updatePlace]
  );

  const renderItem = useCallback(
    ({ item }: { item: Place }) => (
      <PlaceCard
        place={item}
        onPress={() => router.push(`/place/${item.id}` as never)}
        onDelete={() => handleDelete(item)}
        onToggleActive={(active) => handleToggleActive(item.id, active)}
      />
    ),
    [router, handleDelete, handleToggleActive]
  );

  return (
    <View style={styles.container}>
      <Searchbar
        testID="searchbar"
        placeholder="Rechercher un lieu..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchbar}
      />

      <CategoryChips selected={selectedCategory} onSelect={setSelectedCategory} />

      <SegmentedButtons
        value={sortBy}
        onValueChange={(v) => setSortBy(v as 'date' | 'name' | 'category')}
        buttons={[
          { value: 'date', label: 'Récent' },
          { value: 'name', label: 'Nom' },
          { value: 'category', label: 'Catégorie' },
        ]}
        style={styles.sortButtons}
      />

      <FlatList
        data={filteredAndSorted}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={loadPlaces}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Aucun lieu
            </Text>
            <Text variant="bodySmall" style={styles.emptySubtext}>
              Appuyez sur + pour ajouter votre premier lieu
            </Text>
          </View>
        }
      />

      <FAB
        testID="fab-add-place"
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/place/add' as never)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchbar: {
    margin: 12,
    marginBottom: 0,
  },
  sortButtons: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  list: {
    paddingBottom: 80,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#666',
  },
  emptySubtext: {
    color: '#999',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6200EE',
  },
});
