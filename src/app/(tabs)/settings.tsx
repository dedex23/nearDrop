import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Share } from 'react-native';
import { List, Switch, Text, Divider, SegmentedButtons } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/stores/settings-store';
import { useAppStore } from '@/stores/app-store';
import { startBackgroundLocation, stopBackgroundLocation } from '@/services/location';
import { getLastBackupDate, getBackupList, restoreBackup } from '@/services/backup';
import * as queries from '@/db/queries';
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
  const settings = useSettingsStore();
  const places = useAppStore((s) => s.places);
  const loadPlaces = useAppStore((s) => s.loadPlaces);
  const categories = useAppStore((s) => s.categories);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [cooldownIndex, setCooldownIndex] = useState(() => {
    const idx = COOLDOWN_OPTIONS.findIndex((o) => o.value === settings.cooldownHours);
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
    settings.updateSettings({ isTrackingEnabled: enabled });
    if (enabled) {
      const success = await startBackgroundLocation();
      if (!success) {
        Alert.alert(
          'Permission requise',
          'NearDrop a besoin de la permission de localisation en arrière-plan pour vous notifier à proximité de vos lieux sauvegardés.'
        );
        settings.updateSettings({ isTrackingEnabled: false });
      }
    } else {
      await stopBackgroundLocation();
    }
  };

  const handleCooldownChange = (value: number) => {
    const index = Math.round(value);
    setCooldownIndex(index);
    settings.updateSettings({ cooldownHours: COOLDOWN_OPTIONS[index].value });
  };

  const handleExport = async () => {
    try {
      const allPlaces = await queries.getAllPlaces();
      const jsonString = JSON.stringify(
        {
          exportDate: new Date().toISOString(),
          version: '1.0',
          places: allPlaces,
        },
        null,
        2
      );
      await Share.share({
        message: jsonString,
        title: `NearDrop Export — ${allPlaces.length} lieux`,
      });
    } catch (error) {
      // Share.share throws if user dismisses the share sheet on iOS; not a real error
      if ((error as Error)?.message !== 'User did not share') {
        Alert.alert('Échec de l\'export', 'Une erreur est survenue lors de l\'export des données.');
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader>Suivi de position</List.Subheader>

        <List.Item
          title="Suivi en arrière-plan"
          description={settings.isTrackingEnabled ? 'Actif — surveillance des lieux à proximité' : 'En pause'}
          left={(props) => <List.Icon {...props} icon="crosshairs-gps" />}
          right={() => (
            <Switch
              testID="switch-tracking"
              value={settings.isTrackingEnabled}
              onValueChange={handleTrackingToggle}
              color="#6200EE"
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
              value={settings.isQuietMode}
              onValueChange={(v) => settings.updateSettings({ isQuietMode: v })}
              color="#6200EE"
            />
          )}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Paramètres de notification</List.Subheader>

        <View style={styles.sliderSection}>
          <Text variant="bodyMedium" style={styles.sliderLabel}>
            Rayon par défaut : {settings.defaultRadius}m
          </Text>
          <Slider
            value={settings.defaultRadius}
            onSlidingComplete={(v: number) =>
              settings.updateSettings({ defaultRadius: Math.round(v) })
            }
            minimumValue={50}
            maximumValue={500}
            step={10}
            minimumTrackTintColor="#6200EE"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#6200EE"
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
            minimumTrackTintColor="#6200EE"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#6200EE"
            style={styles.slider}
          />
        </View>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Heures actives</List.Subheader>

        <View style={styles.sliderSection}>
          <Text variant="bodyMedium" style={styles.sliderLabel}>
            Début : {settings.activeHoursStart}:00
          </Text>
          <Slider
            value={settings.activeHoursStart}
            onSlidingComplete={(v: number) =>
              settings.updateSettings({ activeHoursStart: Math.round(v) })
            }
            minimumValue={0}
            maximumValue={23}
            step={1}
            minimumTrackTintColor="#6200EE"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#6200EE"
            style={styles.slider}
          />
        </View>

        <View style={styles.sliderSection}>
          <Text variant="bodyMedium" style={styles.sliderLabel}>
            Fin : {settings.activeHoursEnd}:00
          </Text>
          <Slider
            value={settings.activeHoursEnd}
            onSlidingComplete={(v: number) =>
              settings.updateSettings({ activeHoursEnd: Math.round(v) })
            }
            minimumValue={0}
            maximumValue={23}
            step={1}
            minimumTrackTintColor="#6200EE"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#6200EE"
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
            value={settings.themeMode}
            onValueChange={(v) => settings.updateSettings({ themeMode: v as ThemeMode })}
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

        <List.Item
          title="Exporter les données"
          description={`Exporter les ${places.length} lieux en JSON`}
          left={(props) => <List.Icon {...props} icon="export" />}
          onPress={handleExport}
        />

        <List.Item
          title="Importer des données"
          description="Importer des lieux depuis un fichier"
          left={(props) => <List.Icon {...props} icon="import" />}
          onPress={() => {
            // Navigate to import screen (Phase 3)
          }}
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
    backgroundColor: '#F5F5F5',
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
