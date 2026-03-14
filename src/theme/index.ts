import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200EE',
    primaryContainer: '#E8DEF8',
    secondary: '#03DAC6',
    secondaryContainer: '#E8DEF8',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    error: '#B00020',
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#BB86FC',
    primaryContainer: '#3700B3',
    secondary: '#03DAC6',
    secondaryContainer: '#005457',
    background: '#121212',
    surface: '#1E1E1E',
    error: '#CF6679',
  },
};

export const theme = lightTheme;
