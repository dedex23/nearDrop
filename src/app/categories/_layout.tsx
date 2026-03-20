import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function CategoriesLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Gérer les catégories' }} />
      <Stack.Screen name="edit" options={{ title: 'Catégorie' }} />
    </Stack>
  );
}
