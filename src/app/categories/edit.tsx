import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Pressable } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppStore } from '@/stores/app-store';
import { CATEGORY_ICON_OPTIONS } from '@/utils/constants';

const PRESET_COLORS = [
  '#E53935',
  '#8E24AA',
  '#795548',
  '#1E88E5',
  '#FB8C00',
  '#43A047',
  '#757575',
  '#00BCD4',
  '#FF5722',
  '#3F51B5',
  '#009688',
  '#FFEB3B',
];

export default function CategoryEditScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const categories = useAppStore((s) => s.categories);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);

  const existing = useMemo(
    () => (id ? categories.find((c) => c.id === id) : undefined),
    [id, categories]
  );

  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState(existing?.color ?? PRESET_COLORS[0]);
  const [icon, setIcon] = useState(existing?.icon ?? CATEGORY_ICON_OPTIONS[0]);
  const [customEmoji, setCustomEmoji] = useState('');

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Champ requis', 'Le nom de la catégorie est obligatoire.');
      return;
    }
    if (!color) {
      Alert.alert('Champ requis', 'Choisissez une couleur.');
      return;
    }
    if (!icon) {
      Alert.alert('Champ requis', 'Choisissez une icône.');
      return;
    }

    try {
      if (existing) {
        await updateCategory(existing.id, { name: trimmedName, color, icon });
      } else {
        await addCategory({
          name: trimmedName,
          color,
          icon,
          sortOrder: categories.length,
        });
      }
      router.back();
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    }
  }, [name, color, icon, existing, updateCategory, addCategory, categories.length, router]);

  const handleSelectEmoji = useCallback(() => {
    const trimmed = customEmoji.trim();
    if (trimmed) {
      setIcon(trimmed);
    }
  }, [customEmoji]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <TextInput
        label="Nom"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
      />

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Couleur
      </Text>
      <View style={styles.grid}>
        {PRESET_COLORS.map((c) => (
          <Pressable key={c} onPress={() => setColor(c)} style={styles.colorWrapper}>
            <View
              style={[
                styles.colorCircle,
                { backgroundColor: c },
                color === c && styles.colorSelected,
              ]}
            >
              {color === c && (
                <MaterialCommunityIcons name="check" size={18} color="#fff" />
              )}
            </View>
          </Pressable>
        ))}
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Icône
      </Text>

      <View style={styles.emojiRow}>
        <TextInput
          label="Emoji personnalisé"
          value={customEmoji}
          onChangeText={setCustomEmoji}
          mode="outlined"
          style={styles.emojiInput}
          dense
        />
        <Button mode="outlined" onPress={handleSelectEmoji} style={styles.emojiButton}>
          Utiliser
        </Button>
      </View>

      <View style={styles.grid}>
        {CATEGORY_ICON_OPTIONS.map((iconName) => (
          <Pressable
            key={iconName}
            onPress={() => setIcon(iconName)}
            style={[
              styles.iconWrapper,
              icon === iconName && { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name={iconName as keyof typeof MaterialCommunityIcons.glyphMap}
              size={24}
              color={
                icon === iconName
                  ? theme.colors.onPrimaryContainer
                  : theme.colors.onSurfaceVariant
              }
            />
          </Pressable>
        ))}
      </View>

      <Button mode="contained" onPress={handleSave} style={styles.saveButton}>
        {existing ? 'Enregistrer' : 'Créer'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  input: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  colorWrapper: {
    padding: 2,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emojiInput: {
    flex: 1,
  },
  emojiButton: {
    marginTop: 6,
  },
  saveButton: {
    marginTop: 16,
  },
});
