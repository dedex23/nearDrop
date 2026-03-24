import { useSettingsStore } from './settings-store';

describe('settings-store', () => {
  beforeEach(() => {
    useSettingsStore.setState({ ...useSettingsStore.getInitialState() });
  });

  test('validates defaultRadius max', () => {
    useSettingsStore.getState().updateSettings({ defaultRadius: 1000 });
    expect(useSettingsStore.getState().defaultRadius).toBe(500);
  });

  test('validates defaultRadius min', () => {
    useSettingsStore.getState().updateSettings({ defaultRadius: 10 });
    expect(useSettingsStore.getState().defaultRadius).toBe(50);
  });

  test('rejects NaN values', () => {
    useSettingsStore.getState().updateSettings({ defaultRadius: NaN });
    expect(useSettingsStore.getState().defaultRadius).toBe(150);
  });

  test('validates cooldownHours range', () => {
    useSettingsStore.getState().updateSettings({ cooldownHours: 200 });
    expect(useSettingsStore.getState().cooldownHours).toBe(168);
  });

  test('accepts valid themeMode', () => {
    useSettingsStore.getState().updateSettings({ themeMode: 'dark' });
    expect(useSettingsStore.getState().themeMode).toBe('dark');
  });

  test('rejects invalid themeMode', () => {
    useSettingsStore.getState().updateSettings({ themeMode: 'invalid' as any });
    expect(useSettingsStore.getState().themeMode).toBe('system');
  });

  test('accepts light themeMode', () => {
    useSettingsStore.getState().updateSettings({ themeMode: 'light' });
    expect(useSettingsStore.getState().themeMode).toBe('light');
  });

  test('boolean settings work', () => {
    useSettingsStore.getState().updateSettings({ isQuietMode: true });
    expect(useSettingsStore.getState().isQuietMode).toBe(true);
  });
});
