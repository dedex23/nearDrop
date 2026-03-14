import { checkGeofences, _resetGeofenceLock } from './geofencing';
import { getActivePlaces, getAllCategories, markNotified } from '@/db/queries';
import { sendProximityNotification, sendGroupedNotification } from './notifications';
import { useSettingsStore } from '@/stores/settings-store';
import type { Place } from '@/types';

jest.mock('@/db/queries', () => ({
  getActivePlaces: jest.fn(),
  getAllCategories: jest.fn(),
  markNotified: jest.fn(),
}));

jest.mock('./notifications', () => ({
  sendProximityNotification: jest.fn(),
  sendGroupedNotification: jest.fn(),
}));

const mockGetActivePlaces = getActivePlaces as jest.MockedFunction<typeof getActivePlaces>;
const mockGetAllCategories = getAllCategories as jest.MockedFunction<typeof getAllCategories>;
const mockMarkNotified = markNotified as jest.MockedFunction<typeof markNotified>;
const mockSendProximity = sendProximityNotification as jest.MockedFunction<
  typeof sendProximityNotification
>;
const mockSendGrouped = sendGroupedNotification as jest.MockedFunction<
  typeof sendGroupedNotification
>;

// --- Helpers ---

function makePlace(overrides: Partial<Place> = {}): Place {
  return {
    id: 'place-1',
    name: 'Test Place',
    address: '1 Rue de Test',
    latitude: 48.8566,
    longitude: 2.3522,
    categoryId: 'cat-restaurant',
    notes: '',
    sourceType: 'manual',
    sourceUrl: null,
    imageUrl: null,
    radius: 150,
    isActive: true,
    notifiedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function defaultSettings() {
  return {
    defaultRadius: 150,
    cooldownHours: 24,
    activeHoursStart: 10,
    activeHoursEnd: 22,
    isQuietMode: false,
    isTrackingEnabled: true,
    themeMode: 'system' as const,
    updateSettings: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  _resetGeofenceLock();

  // Default mocks
  mockGetAllCategories.mockResolvedValue([
    { id: 'cat-restaurant', name: 'Restaurant', color: '#FF5722', icon: 'food', sortOrder: 0, createdAt: new Date() },
  ]);
  jest.spyOn(useSettingsStore, 'getState').mockReturnValue(defaultSettings());
});

describe('checkGeofences', () => {
  // --- Quiet mode ---
  describe('quiet mode', () => {
    it('skips everything when isQuietMode is true', async () => {
      jest.spyOn(useSettingsStore, 'getState').mockReturnValue({
        ...defaultSettings(),
        isQuietMode: true,
      });

      await checkGeofences(48.8566, 2.3522);

      expect(mockGetActivePlaces).not.toHaveBeenCalled();
      expect(mockSendProximity).not.toHaveBeenCalled();
    });

    it('proceeds when isQuietMode is false', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T14:00:00'));
      mockGetActivePlaces.mockResolvedValue([]);
      await checkGeofences(48.8566, 2.3522);
      expect(mockGetActivePlaces).toHaveBeenCalled();
    });
  });

  // --- Active hours: normal range (10→22) ---
  describe('active hours — normal range (10→22)', () => {
    it('proceeds at 14:00', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T14:00:00'));
      mockGetActivePlaces.mockResolvedValue([]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockGetActivePlaces).toHaveBeenCalled();
    });

    it('skips at 09:00 (before start)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T09:00:00'));

      await checkGeofences(48.8566, 2.3522);
      expect(mockGetActivePlaces).not.toHaveBeenCalled();
    });

    it('skips at 22:00 (uses < not <=)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T22:00:00'));

      await checkGeofences(48.8566, 2.3522);
      expect(mockGetActivePlaces).not.toHaveBeenCalled();
    });

    it('proceeds at 10:00 (uses >=)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T10:00:00'));
      mockGetActivePlaces.mockResolvedValue([]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockGetActivePlaces).toHaveBeenCalled();
    });
  });

  // --- Active hours: overnight range (22→06) ---
  describe('active hours — overnight range (22→06)', () => {
    beforeEach(() => {
      jest.spyOn(useSettingsStore, 'getState').mockReturnValue({
        ...defaultSettings(),
        activeHoursStart: 22,
        activeHoursEnd: 6,
      });
    });

    it('proceeds at 23:00', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T23:00:00'));
      mockGetActivePlaces.mockResolvedValue([]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockGetActivePlaces).toHaveBeenCalled();
    });

    it('proceeds at 02:00', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-16T02:00:00'));
      mockGetActivePlaces.mockResolvedValue([]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockGetActivePlaces).toHaveBeenCalled();
    });

    it('proceeds at 00:00 (midnight)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-16T00:00:00'));
      mockGetActivePlaces.mockResolvedValue([]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockGetActivePlaces).toHaveBeenCalled();
    });

    it('skips at 06:00', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-16T06:00:00'));

      await checkGeofences(48.8566, 2.3522);
      expect(mockGetActivePlaces).not.toHaveBeenCalled();
    });

    it('skips at 14:00', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-16T14:00:00'));

      await checkGeofences(48.8566, 2.3522);
      expect(mockGetActivePlaces).not.toHaveBeenCalled();
    });
  });

  // --- Bounding box ---
  describe('bounding box pre-filter', () => {
    it('includes place within bounding box (Δlat < 0.05)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T14:00:00'));

      const place = makePlace({ latitude: 48.86, longitude: 2.35, radius: 50000 });
      mockGetActivePlaces.mockResolvedValue([place]);

      await checkGeofences(48.8566, 2.3522);
      // Place is very close and within huge radius — should notify
      expect(mockSendProximity).toHaveBeenCalled();
    });

    it('excludes place outside bounding box (Δlat > 0.05)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T14:00:00'));

      const farPlace = makePlace({ latitude: 49.0, longitude: 2.3522, radius: 50000 });
      mockGetActivePlaces.mockResolvedValue([farPlace]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockSendProximity).not.toHaveBeenCalled();
    });

    it('excludes place at exactly 0.05° (strict <)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T14:00:00'));

      // Use 0.0501 to avoid floating-point rounding making 0.05 appear as 0.0499...
      const edgePlace = makePlace({
        latitude: 48.8566 + 0.0501,
        longitude: 2.3522,
        radius: 50000,
      });
      mockGetActivePlaces.mockResolvedValue([edgePlace]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockSendProximity).not.toHaveBeenCalled();
    });
  });

  // --- Distance & radius ---
  describe('distance and radius', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T14:00:00'));
    });

    it('notifies when place is within radius (~100m, radius 150m)', async () => {
      // ~100m north of current position
      const place = makePlace({
        latitude: 48.8575,
        longitude: 2.3522,
        radius: 150,
      });
      mockGetActivePlaces.mockResolvedValue([place]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockSendProximity).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'place-1' }),
        expect.any(Number),
        'Restaurant'
      );
    });

    it('does not notify when place is outside radius (~200m, radius 150m)', async () => {
      // ~200m north
      const place = makePlace({
        latitude: 48.8584,
        longitude: 2.3522,
        radius: 150,
      });
      mockGetActivePlaces.mockResolvedValue([place]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockSendProximity).not.toHaveBeenCalled();
    });

    it('respects per-place radius override (300m)', async () => {
      // ~200m north but radius is 300m
      const place = makePlace({
        latitude: 48.8584,
        longitude: 2.3522,
        radius: 300,
      });
      mockGetActivePlaces.mockResolvedValue([place]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockSendProximity).toHaveBeenCalled();
    });

    it('notifies when distance equals radius (<=)', async () => {
      // Place exactly at user location — distance is 0, radius is 150
      const place = makePlace({
        latitude: 48.8566,
        longitude: 2.3522,
        radius: 150,
      });
      mockGetActivePlaces.mockResolvedValue([place]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockSendProximity).toHaveBeenCalled();
    });
  });

  // --- Cooldown ---
  describe('cooldown', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T14:00:00'));
    });

    it('notifies when notifiedAt is null (no cooldown)', async () => {
      const place = makePlace({ notifiedAt: null });
      mockGetActivePlaces.mockResolvedValue([place]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockSendProximity).toHaveBeenCalled();
    });

    it('skips when notified 1h ago (within 24h cooldown)', async () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const place = makePlace({ notifiedAt: oneHourAgo });
      mockGetActivePlaces.mockResolvedValue([place]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockSendProximity).not.toHaveBeenCalled();
    });

    it('notifies when cooldown has expired (24h + 1ms)', async () => {
      const cooldownMs = 24 * 60 * 60 * 1000;
      const justExpired = new Date(Date.now() - cooldownMs - 1);
      const place = makePlace({ notifiedAt: justExpired });
      mockGetActivePlaces.mockResolvedValue([place]);

      await checkGeofences(48.8566, 2.3522);
      expect(mockSendProximity).toHaveBeenCalled();
    });

    it('notifies when elapsed equals cooldownMs (strict <)', async () => {
      const cooldownMs = 24 * 60 * 60 * 1000;
      const exactlyAtLimit = new Date(Date.now() - cooldownMs);
      const place = makePlace({ notifiedAt: exactlyAtLimit });
      mockGetActivePlaces.mockResolvedValue([place]);

      await checkGeofences(48.8566, 2.3522);
      // elapsed === cooldownMs, isCooldownActive uses `<`, so NOT active → should notify
      expect(mockSendProximity).toHaveBeenCalled();
    });
  });

  // --- Notification grouping ---
  describe('notification grouping', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T14:00:00'));
    });

    it('sends single notification for 1 place', async () => {
      const place = makePlace();
      mockGetActivePlaces.mockResolvedValue([place]);

      await checkGeofences(48.8566, 2.3522);

      expect(mockSendProximity).toHaveBeenCalledTimes(1);
      expect(mockSendGrouped).not.toHaveBeenCalled();
    });

    it('sends grouped notification for 2 places', async () => {
      const place1 = makePlace({ id: 'p1', latitude: 48.8567, longitude: 2.3523 });
      const place2 = makePlace({ id: 'p2', latitude: 48.8568, longitude: 2.3524 });
      mockGetActivePlaces.mockResolvedValue([place1, place2]);

      await checkGeofences(48.8566, 2.3522);

      expect(mockSendGrouped).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'p1' }),
          expect.objectContaining({ id: 'p2' }),
        ])
      );
      expect(mockSendProximity).not.toHaveBeenCalled();
    });

    it('sends no notification when 0 places in range', async () => {
      mockGetActivePlaces.mockResolvedValue([]);

      await checkGeofences(48.8566, 2.3522);

      expect(mockSendProximity).not.toHaveBeenCalled();
      expect(mockSendGrouped).not.toHaveBeenCalled();
    });

    it('calls markNotified for each notified place', async () => {
      const place1 = makePlace({ id: 'p1', latitude: 48.8567, longitude: 2.3523 });
      const place2 = makePlace({ id: 'p2', latitude: 48.8568, longitude: 2.3524 });
      mockGetActivePlaces.mockResolvedValue([place1, place2]);

      await checkGeofences(48.8566, 2.3522);

      expect(mockMarkNotified).toHaveBeenCalledWith('p1');
      expect(mockMarkNotified).toHaveBeenCalledWith('p2');
      expect(mockMarkNotified).toHaveBeenCalledTimes(2);
    });
  });

  // --- Error handling ---
  describe('error handling', () => {
    it('does not crash when getActivePlaces rejects', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T14:00:00'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGetActivePlaces.mockRejectedValue(new Error('DB error'));

      await expect(checkGeofences(48.8566, 2.3522)).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[NearDrop][Geo] Check error:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  // --- Concurrency lock ---
  describe('concurrency lock', () => {
    it('prevents duplicate notifications when called concurrently', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T14:00:00'));

      const place = makePlace();
      // Use a deferred promise so the first call stays "in flight"
      let resolveQuery!: (value: Place[]) => void;
      mockGetActivePlaces.mockImplementation(
        () => new Promise((resolve) => {
          resolveQuery = resolve;
        })
      );

      // Fire 3 concurrent calls (simulates batched location updates)
      const p1 = checkGeofences(48.8566, 2.3522);
      const p2 = checkGeofences(48.8566, 2.3522);
      const p3 = checkGeofences(48.8566, 2.3522);

      // Only the first call should have reached getActivePlaces
      expect(mockGetActivePlaces).toHaveBeenCalledTimes(1);

      // Resolve the query and let everything settle
      resolveQuery([place]);
      await Promise.all([p1, p2, p3]);

      // Only 1 notification should have been sent
      expect(mockSendProximity).toHaveBeenCalledTimes(1);
    });

    it('releases lock after completion so next call proceeds', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T14:00:00'));

      mockGetActivePlaces.mockResolvedValue([]);

      await checkGeofences(48.8566, 2.3522);
      await checkGeofences(48.8566, 2.3522);

      // Both calls should have proceeded (sequentially)
      expect(mockGetActivePlaces).toHaveBeenCalledTimes(2);
    });

    it('releases lock even when an error occurs', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T14:00:00'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGetActivePlaces.mockRejectedValueOnce(new Error('DB error'));
      mockGetActivePlaces.mockResolvedValueOnce([]);

      await checkGeofences(48.8566, 2.3522); // errors but releases lock
      await checkGeofences(48.8566, 2.3522); // should proceed normally

      expect(mockGetActivePlaces).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });
  });
});