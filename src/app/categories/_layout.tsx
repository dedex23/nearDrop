import { Stack } from 'expo-router';

export default function CategoriesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Gérer les catégories' }} />
      <Stack.Screen name="edit" options={{ title: 'Catégorie' }} />
    </Stack>
  );
}
