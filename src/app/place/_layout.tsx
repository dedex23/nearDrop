import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function PlaceLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
      }}
    />
  );
}
