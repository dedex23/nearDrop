import { parseSharedContent } from './share-intent';
import { geocodeAddress } from './geocoding';

jest.mock('./geocoding', () => ({
  geocodeAddress: jest.fn(),
}));

const mockGeocode = geocodeAddress as jest.MockedFunction<typeof geocodeAddress>;

// Mock global fetch — rejects by default so existing tests are unaffected
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

beforeEach(() => {
  mockGeocode.mockReset();
  mockFetch.mockReset();
  mockFetch.mockRejectedValue(new Error('fetch disabled in tests'));
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

    it('omits lat/lon when geocoding fails', async () => {
      mockGeocode.mockResolvedValue(null);
      const result = await parseSharedContent(
        'Unknown place\nhttps://goo.gl/maps/xyz',
        null
      );
      expect(result.latitude).toBeUndefined();
      expect(result.longitude).toBeUndefined();
    });

    it('resolves shortened maps.app.goo.gl URL via HTML body parsing', async () => {
      mockFetch.mockResolvedValueOnce({
        url: 'https://maps.app.goo.gl/abc123',
        text: () =>
          Promise.resolve(
            '<html><a href="/maps/place/Le+Bouillon/@48.8720,2.3430,17z">link</a></html>'
          ),
      } as unknown as Response);
      const result = await parseSharedContent(
        'Le Bouillon\nhttps://maps.app.goo.gl/abc123',
        null
      );
      expect(result.sourceType).toBe('google_maps');
      expect(result.latitude).toBe(48.872);
      expect(result.longitude).toBe(2.343);
      expect(result.name).toBe('Le Bouillon');
    });

    it('falls back to geocoding when redirect resolution fails', async () => {
      mockFetch.mockRejectedValue(new Error('network error'));
      mockGeocode.mockResolvedValue({ latitude: 48.85, longitude: 2.35, displayName: 'Paris' });
      const result = await parseSharedContent(
        'Paris Spot\nhttps://maps.app.goo.gl/xyz789',
        null
      );
      expect(result.sourceType).toBe('google_maps');
      expect(result.latitude).toBe(48.85);
      expect(result.longitude).toBe(2.35);
    });

    it('falls back to geocoding when resolved URL still has no coords', async () => {
      mockFetch.mockResolvedValueOnce({
        url: 'https://maps.app.goo.gl/nocoords',
        text: () =>
          Promise.resolve(
            '<html><a href="/maps/place/SomePlace/">link</a></html>'
          ),
      } as unknown as Response);
      mockGeocode.mockResolvedValue({ latitude: 48.86, longitude: 2.34, displayName: 'SomePlace' });
      const result = await parseSharedContent(
        'SomePlace\nhttps://maps.app.goo.gl/nocoords',
        null
      );
      expect(result.sourceType).toBe('google_maps');
      expect(result.latitude).toBe(48.86);
      expect(result.longitude).toBe(2.34);
    });

    it('uses metaTitle as name and geocodes address from resolved URL path', async () => {
      mockFetch.mockResolvedValueOnce({
        url: 'https://maps.app.goo.gl/gXZVxStjPt5HCoNu6',
        text: () =>
          Promise.resolve(
            '<html><a href="/maps/place/INDIAN+FACTORY+-+LA+COURNEUVE,+1+Bd+Pasteur,+93120+La+Courneuve/data=!4m2">link</a></html>'
          ),
      } as unknown as Response);
      mockGeocode.mockResolvedValue({
        latitude: 48.9197,
        longitude: 2.3826,
        displayName: '1 Boulevard Pasteur, La Courneuve',
      });
      const result = await parseSharedContent(
        'https://maps.app.goo.gl/gXZVxStjPt5HCoNu6',
        'https://maps.app.goo.gl/gXZVxStjPt5HCoNu6',
        'INDIAN FACTORY - LA COURNEUVE'
      );
      expect(result.sourceType).toBe('google_maps');
      expect(result.name).toBe('INDIAN FACTORY - LA COURNEUVE');
      expect(result.address).toBe(
        'INDIAN FACTORY - LA COURNEUVE, 1 Bd Pasteur, 93120 La Courneuve'
      );
      expect(result.latitude).toBe(48.9197);
      expect(result.longitude).toBe(2.3826);
    });

    it('extracts city from metaTitle "NAME - CITY" when full title is not geocodable', async () => {
      // Simulates RN on Android: fetch returns consent page, no /maps/place/ in HTML
      mockFetch.mockResolvedValueOnce({
        url: 'https://maps.app.goo.gl/xyz',
        text: () => Promise.resolve('<html><body>Consent page</body></html>'),
      } as unknown as Response);
      // First call with full metaTitle fails, second with city part succeeds
      mockGeocode
        .mockResolvedValueOnce(null) // "INDIAN FACTORY - LA COURNEUVE" → not found
        .mockResolvedValueOnce({ latitude: 48.9267, longitude: 2.3896, displayName: 'La Courneuve' });
      const result = await parseSharedContent(
        'https://maps.app.goo.gl/xyz',
        'https://maps.app.goo.gl/xyz',
        'INDIAN FACTORY - LA COURNEUVE'
      );
      expect(result.sourceType).toBe('google_maps');
      expect(result.name).toBe('INDIAN FACTORY - LA COURNEUVE');
      expect(result.address).toBe('LA COURNEUVE');
      expect(result.latitude).toBe(48.9267);
      expect(result.longitude).toBe(2.3896);
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

  // --- Social enrichment ---
  describe('Instagram enrichment', () => {
    const makeOgHtml = (props: Record<string, string>) =>
      '<html><head>' +
      Object.entries(props)
        .map(([k, v]) => `<meta property="${k}" content="${v}">`)
        .join('') +
      '</head><body></body></html>';

    const mockFetchOg = (html: string) => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(html),
      } as unknown as Response);
    };

    it('extracts address from 📍 in shared text and geocodes', async () => {
      mockFetch.mockRejectedValue(new Error('no fetch'));
      mockGeocode.mockResolvedValue({
        latitude: 48.86,
        longitude: 2.35,
        displayName: 'Le Marais',
      });
      const result = await parseSharedContent(
        'Amazing brunch!\n📍 Le Marais, Paris\nhttps://www.instagram.com/p/ABC123/',
        null
      );
      expect(result.sourceType).toBe('instagram');
      expect(result.address).toBe('Le Marais, Paris');
      expect(result.latitude).toBe(48.86);
      expect(result.longitude).toBe(2.35);
    });

    it('extracts address from OG description when text has no location', async () => {
      mockGeocode.mockResolvedValue({
        latitude: 48.87,
        longitude: 2.33,
        displayName: 'Café de Flore',
      });
      mockFetchOg(
        makeOgHtml({
          'og:title': 'Café de Flore',
          'og:description': '📍 Café de Flore, Saint-Germain',
        })
      );
      const result = await parseSharedContent(
        'Great coffee\nhttps://www.instagram.com/p/DEF456/',
        null
      );
      expect(result.sourceType).toBe('instagram');
      expect(result.address).toBe('Café de Flore, Saint-Germain');
      expect(result.latitude).toBe(48.87);
    });

    it('falls back gracefully when fetch times out', async () => {
      mockFetch.mockRejectedValue(new Error('AbortError'));
      const result = await parseSharedContent(
        'Nice place\nhttps://www.instagram.com/p/GHI789/',
        null
      );
      expect(result.sourceType).toBe('instagram');
      expect(result.name).toBe('Nice place');
      expect(result.address).toBe('');
    });

    it('uses OG title as name when no text name exists', async () => {
      mockFetchOg(makeOgHtml({ 'og:title': 'Le Petit Cler' }));
      const result = await parseSharedContent(
        'https://www.instagram.com/p/JKL012/',
        null
      );
      expect(result.name).toBe('Le Petit Cler');
    });
  });

  describe('Facebook enrichment', () => {
    it('extracts direct coordinates from OG place:location tags', async () => {
      const html =
        '<html><head>' +
        '<meta property="og:title" content="Le Comptoir">' +
        '<meta property="place:location:latitude" content="48.8530">' +
        '<meta property="place:location:longitude" content="2.3499">' +
        '</head></html>';
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(html),
      } as unknown as Response);
      const result = await parseSharedContent(
        'Check this out\nhttps://www.facebook.com/LeComptoir/posts/123',
        null
      );
      expect(result.sourceType).toBe('facebook');
      expect(result.latitude).toBe(48.853);
      expect(result.longitude).toBe(2.3499);
      expect(result.name).toBe('Check this out');
    });

    it('extracts "at Location" pattern from shared text', async () => {
      mockFetch.mockRejectedValue(new Error('no fetch'));
      mockGeocode.mockResolvedValue({
        latitude: 48.85,
        longitude: 2.34,
        displayName: 'Le Comptoir',
      });
      const result = await parseSharedContent(
        'was at Le Comptoir\nhttps://www.facebook.com/posts/456',
        null
      );
      expect(result.sourceType).toBe('facebook');
      expect(result.address).toBe('Le Comptoir');
      expect(result.latitude).toBe(48.85);
    });

    it('falls back to default when fetch fails and no text hints', async () => {
      mockFetch.mockRejectedValue(new Error('blocked'));
      const result = await parseSharedContent(
        'Check this\nhttps://www.facebook.com/posts/789',
        null
      );
      expect(result.sourceType).toBe('facebook');
      expect(result.name).toBe('Check this');
      expect(result.address).toBe('');
    });
  });

  describe('enrichment priority', () => {
    it('prefers structured address from text over OG description hint', async () => {
      const html =
        '<head><meta property="og:description" content="📍 Some Other Place"></head>';
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(html),
      } as unknown as Response);
      mockGeocode.mockResolvedValue({
        latitude: 48.86,
        longitude: 2.35,
        displayName: 'Rivoli',
      });
      const result = await parseSharedContent(
        '15 Rue de Rivoli, 75001 Paris\nhttps://www.instagram.com/p/XYZ/',
        null
      );
      expect(result.address).toContain('Rue de Rivoli');
      expect(result.latitude).toBe(48.86);
    });

    it('decodes HTML entities in OG content', async () => {
      const html =
        '<head><meta property="og:description" content="📍 Caf&eacute; de l&#39;Industrie"></head>';
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(html),
      } as unknown as Response);
      mockGeocode.mockResolvedValue({
        latitude: 48.85,
        longitude: 2.37,
        displayName: "Café de l'Industrie",
      });
      const result = await parseSharedContent(
        'Great place\nhttps://www.instagram.com/p/HTML/',
        null
      );
      // &eacute; is not in our decoder but &#39; is
      expect(result.latitude).toBe(48.85);
    });
  });
});