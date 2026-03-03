import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Share } from 'react-native';
import { List, Switch, Text, Divider } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useSettingsStore } from '@/stores/settings-store';
import { useAppStore } from '@/stores/app-store';
import { startBackgroundLocation, stopBackgroundLocation } from '@/services/location';
import * as queries from '@/db/queries';

const COOLDOWN_OPTIONS = [
  { label: '1 hour', value: 1 },
  { label: '6 hours', value: 6 },
  { label: '12 hours', value: 12 },
  { label: '24 hours', value: 24 },
  { label: '48 hours', value: 48 },
];

export default function SettingsScreen() {
  const settings = useSettingsStore();
  const places = useAppStore((s) => s.places);
  const [cooldownIndex, setCooldownIndex] = useState(() => {
    const idx = COOLDOWN_OPTIONS.findIndex((o) => o.value === settings.cooldownHours);
    return idx >= 0 ? idx : 3; // default to 24h
  });

  const handleTrackingToggle = async (enabled: boolean) => {
    settings.updateSettings({ isTrackingEnabled: enabled });
    if (enabled) {
      const success = await startBackgroundLocation();
      if (!success) {
        Alert.alert(
          'Permission Required',
          'NearDrop needs background location permission to notify you when you are near saved places.'
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
        title: `NearDrop Export — ${allPlaces.length} places`,
      });
    } catch (error) {
      // Share.share throws if user dismisses the share sheet on iOS; not a real error
      if ((error as Error)?.message !== 'User did not share') {
        Alert.alert('Export Failed', 'An error occurred while exporting data.');
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader>Location Tracking</List.Subheader>

        <List.Item
          title="Background Tracking"
          description={settings.isTrackingEnabled ? 'Active — monitoring nearby places' : 'Paused'}
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
          title="Quiet Mode"
          description="Temporarily silence all notifications"
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
        <List.Subheader>Notification Settings</List.Subheader>

        <View style={styles.sliderSection}>
          <Text variant="bodyMedium" style={styles.sliderLabel}>
            Default Radius: {settings.defaultRadius}m
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
            Cooldown: {COOLDOWN_OPTIONS[cooldownIndex].label}
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
        <List.Subheader>Active Hours</List.Subheader>

        <View style={styles.sliderSection}>
          <Text variant="bodyMedium" style={styles.sliderLabel}>
            Start: {settings.activeHoursStart}:00
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
            End: {settings.activeHoursEnd}:00
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
        <List.Subheader>Data</List.Subheader>

        <List.Item
          title="Export Data"
          description={`Export all ${places.length} places as JSON`}
          left={(props) => <List.Icon {...props} icon="export" />}
          onPress={handleExport}
        />

        <List.Item
          title="Import Data"
          description="Import places from file"
          left={(props) => <List.Icon {...props} icon="import" />}
          onPress={() => {
            // Navigate to import screen (Phase 3)
          }}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>About</List.Subheader>
        <List.Item
          title="NearDrop"
          description="v1.0.0 — Proximity notification app"
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
});
