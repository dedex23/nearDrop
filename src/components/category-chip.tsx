import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { CATEGORIES, type Category } from '@/types';
import { CATEGORY_CONFIG } from '@/utils/constants';

interface CategoryChipsProps {
  selected: Category | null;
  onSelect: (category: Category | null) => void;
}

export function CategoryChips({ selected, onSelect }: CategoryChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {CATEGORIES.map((cat) => {
        const config = CATEGORY_CONFIG[cat];
        const isSelected = selected === cat;
        return (
          <Chip
            key={cat}
            icon={config.icon}
            selected={isSelected}
            onPress={() => onSelect(isSelected ? null : cat)}
            style={[styles.chip, isSelected && { backgroundColor: config.color + '20' }]}
            textStyle={isSelected ? { color: config.color } : undefined}
          >
            {config.label}
          </Chip>
        );
      })}
    </ScrollView>
  );
}

interface CategoryPickerProps {
  value: Category;
  onChange: (category: Category) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {CATEGORIES.map((cat) => {
        const config = CATEGORY_CONFIG[cat];
        const isSelected = value === cat;
        return (
          <Chip
            key={cat}
            icon={config.icon}
            selected={isSelected}
            onPress={() => onChange(cat)}
            style={[styles.chip, isSelected && { backgroundColor: config.color + '30' }]}
            textStyle={isSelected ? { color: config.color, fontWeight: '600' } : undefined}
          >
            {config.label}
          </Chip>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chip: {
    marginRight: 8,
  },
});
