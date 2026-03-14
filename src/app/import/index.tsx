import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, List } from 'react-native-paper';
import { Stack } from 'expo-router';

export default function ImportScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Importer des lieux' }} />
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>
          Importer des lieux
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Importez des lieux depuis différentes sources. Disponible dans une future mise à jour.
        </Text>

        <List.Section>
          <List.Item
            title="Export Instagram (RGPD)"
            description="Importer les publications sauvegardées depuis l'export Instagram"
            left={(props) => <List.Icon {...props} icon="instagram" />}
            disabled
          />
          <List.Item
            title="Export Facebook (RGPD)"
            description="Importer les lieux sauvegardés depuis l'export Facebook"
            left={(props) => <List.Icon {...props} icon="facebook" />}
            disabled
          />
          <List.Item
            title="Listes Google Maps"
            description="Importer depuis l'export CSV Google Maps"
            left={(props) => <List.Icon {...props} icon="google-maps" />}
            disabled
          />
          <List.Item
            title="Fichier CSV / JSON"
            description="Importer depuis un fichier CSV ou JSON générique"
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
