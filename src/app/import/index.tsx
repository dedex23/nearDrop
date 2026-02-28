import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, List } from 'react-native-paper';
import { Stack } from 'expo-router';

export default function ImportScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Import Places' }} />
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>
          Import Places
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Import places from various sources. Coming in a future update.
        </Text>

        <List.Section>
          <List.Item
            title="Instagram Export (RGPD)"
            description="Parse saved posts from Instagram data export"
            left={(props) => <List.Icon {...props} icon="instagram" />}
            disabled
          />
          <List.Item
            title="Facebook Export (RGPD)"
            description="Parse saved places from Facebook data export"
            left={(props) => <List.Icon {...props} icon="facebook" />}
            disabled
          />
          <List.Item
            title="Google Maps Lists"
            description="Import from Google Maps CSV export"
            left={(props) => <List.Icon {...props} icon="google-maps" />}
            disabled
          />
          <List.Item
            title="CSV / JSON File"
            description="Import from a generic CSV or JSON file"
            left={(props) => <List.Icon {...props} icon="file-import" />}
            disabled
          />
        </List.Section>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    marginBottom: 24,
  },
});
