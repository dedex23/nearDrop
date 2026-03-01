import { parseSharedContent } from './share-intent';
import { geocodeAddress } from './geocoding';

jest.mock('./geocoding', () => ({
  geocodeAddress: jest.fn(),
}));

const mockGeocode = geocodeAddress as jest.MockedFunction<typeof geocodeAddress>;

beforeEach(() => {
  mockGeocode.mockReset();
});

describe('parseSharedContent', () => {
  // --- Google Maps ---
  describe('Google Maps URLs', () => {
    it('extracts coords from @lat,lon URL', async () => {
      const result = await parseSharedContent(
        'Le Bouillon Chartier\nhttps://www.google.com/maps/@48.8566,2.3522,15z',
        null
      );
      expect(result.latitude).toBe(48.8566);
      expect(result.longitude).toBe(2.3522);
      expect(result.sourceType).toBe('google_maps');
      expect(result.name).toBe('Le Bouillon Chartier');
    });

    it('prioritizes webUrl over URL in text', async () => {
      const result = await parseSharedContent(
        'Some text https://maps.google.com/?q=1,1',
        'https://www.google.com/maps/@48.8566,2.3522,15z'
      );
      expect(result.latitude).toBe(48.8566);
      expect(result.longitude).toBe(2.3522);
    });

    it('uses "Shared place" when no text before URL', async () => {
      const result = await parseSharedContent(
        'https://www.google.com/maps/@48.8566,2.3522,15z',
        null
      );
      expect(result.name).toBe('Shared place');
    });

    it('falls back to geocoding when URL has no coords (goo.gl)', async () => {
      mockGeocode.mockResolvedValue({ latitude: 48.8, longitude: 2.3, displayName: 'Le Marais' });
      const result = await parseSharedContent(
        'Le Marais\nhttps://goo.gl/maps/abc123',
        null
      );
      expect(result.sourceType).toBe('google_maps');
      expect(result.latitude).toBe(48.8);
      expect(result.longitude).toBe(2.3);
    });

    it('sets lat/lon to 0 when geocoding fails', async () => {
      mockGeocode.mockResolvedValue(null);
      const result = await parseSharedContent(
        'Unknown place\nhttps://goo.gl/maps/xyz',
        null
      );
      expect(result.latitude).toBe(0);
      expect(result.longitude).toBe(0);
    });
  });

  // --- Instagram ---
  describe('Instagram URLs', () => {
    it('detects instagram.com', async () => {
      const result = await parseSharedContent(
        'Cool spot\nhttps://www.instagram.com/p/ABC123/',
        null
      );
      expect(result.sourceType).toBe('instagram');
      expect(result.name).toBe('Cool spot');
    });

    it('detects instagr.am', async () => {
      const result = await parseSharedContent(
        'Nice\nhttps://instagr.am/p/ABC123/',
        null
      );
      expect(result.sourceType).toBe('instagram');
    });

    it('uses fallback name "Instagram place"', async () => {
      const result = await parseSharedContent(
        'https://www.instagram.com/p/ABC123/',
        null
      );
      expect(result.name).toBe('Instagram place');
    });

    it('removes URL from notes', async () => {
      const url = 'https://www.instagram.com/p/ABC123/';
      const result = await parseSharedContent(`Great food\n${url}`, null);
      expect(result.notes).not.toContain(url);
      expect(result.notes).toContain('Great food');
    });
  });

  // --- Facebook ---
  describe('Facebook URLs', () => {
    it('detects facebook.com', async () => {
      const result = await parseSharedContent(
        'Check this\nhttps://www.facebook.com/place/123',
        null
      );
      expect(result.sourceType).toBe('facebook');
    });

    it('detects fb.com', async () => {
      const result = await parseSharedContent(
        'Here\nhttps://fb.com/events/456',
        null
      );
      expect(result.sourceType).toBe('facebook');
    });

    it('detects fb.me', async () => {
      const result = await parseSharedContent(null, 'https://fb.me/xyz');
      expect(result.sourceType).toBe('facebook');
    });
  });

  // --- Generic URL ---
  describe('generic URL', () => {
    it('returns share_intent for non-social URL', async () => {
      const result = await parseSharedContent(
        'Cool place\nhttps://www.tripadvisor.com/restaurant/123',
        null
      );
      expect(result.sourceType).toBe('share_intent');
      expect(result.name).toBe('Cool place');
    });
  });

  // --- Plain text ---
  describe('plain text', () => {
    it('geocodes when address is found', async () => {
      mockGeocode.mockResolvedValue({ latitude: 48.86, longitude: 2.35, displayName: 'Rue de Rivoli' });
      const result = await parseSharedContent('15 Rue de Rivoli, 75001 Paris', null);
      expect(mockGeocode).toHaveBeenCalled();
      expect(result.latitude).toBe(48.86);
      expect(result.longitude).toBe(2.35);
      expect(result.sourceType).toBe('share_intent');
    });

    it('truncates name to 60 chars', async () => {
      mockGeocode.mockResolvedValue({ latitude: 1, longitude: 1, displayName: 'Somewhere' });
      const longText =
        'A'.repeat(70) + '\n15 Rue de Rivoli, 75001 Paris';
      const result = await parseSharedContent(longText, null);
      expect(result.name!.length).toBeLessThanOrEqual(60);
    });

    it('puts text in name/notes when no address found', async () => {
      const result = await parseSharedContent('Just a nice spot to visit', null);
      expect(result.name).toBe('Just a nice spot to visit');
      expect(result.sourceType).toBe('share_intent');
    });

    it('puts long text without address into notes', async () => {
      const longText = 'A'.repeat(100);
      const result = await parseSharedContent(longText, null);
      expect(result.notes).toBe(longText);
    });
  });

  // --- Edge cases ---
  describe('edge cases', () => {
    it('handles both text and webUrl being null', async () => {
      const result = await parseSharedContent(null, null);
      expect(result.name).toBe('Shared place');
    });

    it('handles empty string', async () => {
      const result = await parseSharedContent('', null);
      expect(result.name).toBe('Shared place');
    });

    it('extracts name from last non-empty line before URL', async () => {
      const result = await parseSharedContent(
        'Intro line\nActual Name\nhttps://www.google.com/maps/@48.8566,2.3522,15z',
        null
      );
      expect(result.name).toBe('Actual Name');
    });

    it('truncates extracted name to 80 chars', async () => {
      const longName = 'B'.repeat(100);
      const result = await parseSharedContent(
        `${longName}\nhttps://www.google.com/maps/@48.8566,2.3522,15z`,
        null
      );
      expect(result.name!.length).toBeLessThanOrEqual(80);
    });
  });
});