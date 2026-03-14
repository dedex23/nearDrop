import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { List, Switch, Text, Divider, SegmentedButtons, useTheme } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/stores/settings-store';
import { useAppStore } from '@/stores/app-store';
import { startBackgroundLocation, stopBackgroundLocation } from '@/services/location';
import { getLastBackupDate, getBackupList, restoreBackup } from '@/services/backup';
import type { ThemeMode } from '@/types';

const COOLDOWN_OPTIONS = [
  { label: '1 heure', value: 1 },
  { label: '6 heures', value: 6 },
  { label: '12 heures', value: 12 },
  { label: '24 heures', value: 24 },
  { label: '48 heures', value: 48 },
];

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const isTrackingEnabled = useSettingsStore((s) => s.isTrackingEnabled);
  const isQuietMode = useSettingsStore((s) => s.isQuietMode);
  const defaultRadius = useSettingsStore((s) => s.defaultRadius);
  const cooldownHours = useSettingsStore((s) => s.cooldownHours);
  const activeHoursStart = useSettingsStore((s) => s.activeHoursStart);
  const activeHoursEnd = useSettingsStore((s) => s.activeHoursEnd);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const loadPlaces = useAppStore((s) => s.loadPlaces);
  const categories = useAppStore((s) => s.categories);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [cooldownIndex, setCooldownIndex] = useState(() => {
    const idx = COOLDOWN_OPTIONS.findIndex((o) => o.value === cooldownHours);
    return idx >= 0 ? idx : 3; // default to 24h
  });

  useEffect(() => {
    setLastBackup(getLastBackupDate());
  }, []);

  const handleRestore = async () => {
    const backups = getBackupList();
    if (backups.length === 0) {
      Alert.alert('Aucune sauvegarde disponible');
      return;
    }

    const buttons = backups.map((b) => ({
      text: b.date.toLocaleString(),
      onPress: async () => {
        const success = restoreBackup(b.name);
        if (success) {
          Alert.alert('Restauration réussie', 'Les données ont été restaurées. Rechargement...');
          await loadPlaces();
        } else {
          Alert.alert('Échec', 'La restauration a échoué.');
        }
      },
    }));
    buttons.push({ text: 'Annuler', onPress: async () => {} });

    Alert.alert('Restaurer une sauvegarde', 'Choisissez une sauvegarde :', buttons);
  };

  const handleTrackingToggle = async (enabled: boolean) => {
    updateSettings({ isTrackingEnabled: enabled });
    if (enabled) {
      const success = await startBackgroundLocation();
      if (!success) {
        Alert.alert(
          'Permission requise',
          'NearDrop a besoin de la permission de localisation en arrière-plan pour vous notifier à proximité de vos lieux sauvegardés.'
        );
        updateSettings({ isTrackingEnabled: false });
      }
    } else {
      await stopBackgroundLocation();
    }
  };

  const handleCooldownChange = (value: number) => {
    const index = Math.round(value);
    setCooldownIndex(index);
    updateSettings({ cooldownHours: COOLDOWN_OPTIONS[index].value });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <List.Section>
        <List.Subheader>Suivi de position</List.Subheader>

        <List.Item
          title="Suivi en arrière-plan"
          description={isTrackingEnabled ? 'Actif — surveillance des lieux à proximité' : 'En pause'}
          left={(props) => <List.Icon {...props} icon="crosshairs-gps" />}
          right={() => (
            <Switch
              testID="switch-tracking"
              value={isTrackingEnabled}
              onValueChange={handleTrackingToggle}
              color={theme.colors.primary}
            />
          )}
        />

        <List.Item
          title="Mode silencieux"
          description="Désactiver temporairement toutes les notifications"
          left={(props) => <List.Icon {...props} icon="bell-off" />}
          right={() => (
            <Switch
              testID="switch-quiet-mode"
              value={isQuietMode}
              onValueChange={(v) => updateSettings({ isQuietMode: v })}
              color={theme.colors.primary}
            />
          )}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Paramètres de notification</List.Subheader>

        <View style={styles.sliderSection}>
          <Text variant="bodyMedium" style={styles.sliderLabel}>
            Rayon par défaut : {defaultRadius}m
          </Text>
          <Slider
            value={defaultRadius}
            onSlidingComplete={(v: number) =>
              updateSettings({ defaultRadius: Math.round(v) })
            }
            minimumValue={50}
            maximumValue={500}
            step={10}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.surfaceVariant}
            thumbTintColor={theme.colors.primary}
            style={styles.slider}
          />
        </View>

        <View style={styles.sliderSection}>
          <Text variant="bodyMedium" style={styles.sliderLabel}>
            Intervalle : {COOLDOWN_OPTIONS[cooldownIndex].label}
          </Text>
          <Slider
            value={cooldownIndex}
            onSlidingComplete={handleCooldownChange}
            minimumValue={0}
            maximumValue={COOLDOWN_OPTIONS.length - 1}
            step={1}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.surfaceVariant}
            thumbTintColor={theme.colors.primary}
            style={styles.slider}
          />
        </View>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Heures actives</List.Subheader>

        <View style={styles.sliderSection}>
          <Text variant="bodyMedium" style={styles.sliderLabel}>
            Début : {activeHoursStart}:00
          </Text>
          <Slider
            value={activeHoursStart}
            onSlidingComplete={(v: number) =>
              updateSettings({ activeHoursStart: Math.round(v) })
            }
            minimumValue={0}
            maximumValue={23}
            step={1}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.surfaceVariant}
            thumbTintColor={theme.colors.primary}
            style={styles.slider}
          />
        </View>

        <View style={styles.sliderSection}>
          <Text variant="bodyMedium" style={styles.sliderLabel}>
            Fin : {activeHoursEnd}:00
          </Text>
          <Slider
            value={activeHoursEnd}
            onSlidingComplete={(v: number) =>
              updateSettings({ activeHoursEnd: Math.round(v) })
            }
            minimumValue={0}
            maximumValue={23}
            step={1}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.surfaceVariant}
            thumbTintColor={theme.colors.primary}
            style={styles.slider}
          />
        </View>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Catégories</List.Subheader>
        <List.Item
          title="Gérer les catégories"
          description={`${categories.length} catégories`}
          left={(props) => <List.Icon {...props} icon="shape" />}
          onPress={() => router.push('/categories' as never)}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Apparence</List.Subheader>
        <View style={styles.themeButtons}>
          <SegmentedButtons
            value={themeMode}
            onValueChange={(v) => updateSettings({ themeMode: v as ThemeMode })}
            buttons={[
              { value: 'system', label: 'Auto' },
              { value: 'light', label: 'Clair' },
              { value: 'dark', label: 'Sombre' },
            ]}
          />
        </View>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Données</List.Subheader>

        <List.Item
          title="Sauvegarde automatique"
          description={lastBackup ? `Dernière : ${lastBackup.toLocaleString()}` : 'Aucune sauvegarde'}
          left={(props) => <List.Icon {...props} icon="backup-restore" />}
        />

        <List.Item
          title="Restaurer une sauvegarde"
          description="Restaurer à partir d'une sauvegarde locale"
          left={(props) => <List.Icon {...props} icon="history" />}
          onPress={handleRestore}
        />

      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>À propos</List.Subheader>
        <List.Item
          title="NearDrop"
          description="v1.0.0 — Application de notification de proximité"
          left={(props) => <List.Icon {...props} icon="information" />}
        />
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sliderSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sliderLabel: {
    marginBottom: 4,
  },
  slider: {
    marginHorizontal: 0,
  },
  themeButtons: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
