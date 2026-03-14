import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import { useAppStore } from '@/stores/app-store';

interface CategoryChipsProps {
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategoryChips({ selected, onSelect }: CategoryChipsProps) {
  const theme = useTheme();
  const categories = useAppStore((s) => s.categories);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {categories.map((cat) => {
        const isSelected = selected === cat.id;
        return (
          <Chip
            key={cat.id}
            icon={cat.icon}
            selected={isSelected}
            onPress={() => onSelect(isSelected ? null : cat.id)}
            style={[styles.chip, { backgroundColor: isSelected ? cat.color + '20' : theme.colors.surfaceVariant }]}
            textStyle={isSelected ? { color: cat.color } : undefined}
          >
            {cat.name}
          </Chip>
        );
      })}
    </ScrollView>
  );
}

interface CategoryPickerProps {
  value: string;
  onChange: (categoryId: string) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const theme = useTheme();
  const categories = useAppStore((s) => s.categories);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {categories.map((cat) => {
        const isSelected = value === cat.id;
        return (
          <Chip
            key={cat.id}
            icon={cat.icon}
            selected={isSelected}
            onPress={() => onChange(cat.id)}
            style={[styles.chip, { backgroundColor: isSelected ? cat.color + '30' : theme.colors.surfaceVariant }]}
            textStyle={isSelected ? { color: cat.color, fontWeight: '600' } : undefined}
          >
            {cat.name}
          </Chip>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  contentContainer: {
    alignItems: 'center',
  },
  chip: {
    marginRight: 8,
  },
});
