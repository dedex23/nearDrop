import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { FAB, IconButton, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import DraggableFlatList, { type RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { useAppStore } from '@/stores/app-store';
import { MAX_CATEGORIES } from '@/types';
import type { Category } from '@/types';
import { countPlacesByAllCategories } from '@/db/queries';

export default function CategoriesListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const categories = useAppStore((s) => s.categories);
  const loadCategories = useAppStore((s) => s.loadCategories);
  const removeCategory = useAppStore((s) => s.removeCategory);
  const reorderCategories = useAppStore((s) => s.reorderCategories);

  const [placeCounts, setPlaceCounts] = useState<Record<string, number>>({});

  const loadCounts = useCallback(async () => {
    const counts = await countPlacesByAllCategories();
    setPlaceCounts(counts);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const sorted = useMemo(() => [...categories].sort((a, b) => a.sortOrder - b.sortOrder), [categories]);
  const [localData, setLocalData] = useState(sorted);

  useEffect(() => {
    setLocalData(sorted);
  }, [sorted]);

  const handleDelete = useCallback(
    async (cat: Category) => {
      const count = placeCounts[cat.id] ?? 0;
      if (count > 0) {
        Alert.alert(
          'Suppression impossible',
          `${count} lieu(x) utilisent encore la catégorie "${cat.name}". Réassignez-les d'abord.`
        );
        return;
      }
      Alert.alert('Supprimer la catégorie', `Supprimer "${cat.name}" ?`, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeCategory(cat.id);
            } catch (e) {
              Alert.alert('Erreur', (e as Error).message);
            }
          },
        },
      ]);
    },
    [placeCounts, removeCategory]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: Category[] }) => {
      setLocalData(data);
      reorderCategories(data.map((c) => c.id));
    },
    [reorderCategories]
  );

  const handleAdd = useCallback(() => {
    if (categories.length >= MAX_CATEGORIES) {
      Alert.alert('Limite atteinte', `Vous ne pouvez pas dépasser ${MAX_CATEGORIES} catégories.`);
      return;
    }
    router.push('/categories/edit' as never);
  }, [categories.length, router]);

  const renderItem = useCallback(
    ({ item, drag }: RenderItemParams<Category>) => {
      const count = placeCounts[item.id] ?? 0;
      return (
        <ScaleDecorator>
          <TouchableOpacity
            activeOpacity={0.7}
            onLongPress={drag}
            style={[styles.row, { backgroundColor: theme.colors.surface }]}
          >
            <MaterialCommunityIcons name="drag" size={20} color={theme.colors.onSurfaceVariant} />
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <View style={styles.info}>
              <Text variant="bodyLarge">{item.name}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {count} lieu{count !== 1 ? 'x' : ''}
              </Text>
            </View>
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => router.push(`/categories/edit?id=${item.id}` as never)}
            />
            <IconButton
              icon="delete"
              size={20}
              iconColor={count > 0 ? theme.colors.outline : theme.colors.error}
              onPress={() => handleDelete(item)}
            />
          </TouchableOpacity>
        </ScaleDecorator>
      );
    },
    [placeCounts, theme, handleDelete, router]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DraggableFlatList
        data={localData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        contentContainerStyle={styles.list}
      />
      <FAB
        testID="fab-add-category"
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={handleAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 8,
    paddingBottom: 80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 4,
    borderRadius: 8,
    elevation: 1,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
