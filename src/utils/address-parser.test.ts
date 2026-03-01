import {
  extractCoordsFromGoogleMapsUrl,
  extractAddressFromText,
  extractLocationHintFromText,
} from './address-parser';

describe('extractCoordsFromGoogleMapsUrl', () => {
  it('extracts coords from @lat,lon format', () => {
    const result = extractCoordsFromGoogleMapsUrl(
      'https://www.google.com/maps/@48.8566,2.3522,15z'
    );
    expect(result).toEqual({ latitude: 48.8566, longitude: 2.3522 });
  });

  it('extracts coords from ?q=lat,lon format', () => {
    const result = extractCoordsFromGoogleMapsUrl(
      'https://maps.google.com/?q=48.8566,2.3522'
    );
    expect(result).toEqual({ latitude: 48.8566, longitude: 2.3522 });
  });

  it('extracts coords from /place/lat,lon format', () => {
    const result = extractCoordsFromGoogleMapsUrl(
      'https://www.google.com/maps/place/48.8566,2.3522'
    );
    expect(result).toEqual({ latitude: 48.8566, longitude: 2.3522 });
  });

  it('handles negative coordinates (Sydney)', () => {
    const result = extractCoordsFromGoogleMapsUrl(
      'https://www.google.com/maps/@-33.8688,151.2093,15z'
    );
    expect(result).toEqual({ latitude: -33.8688, longitude: 151.2093 });
  });

  it('handles negative longitude (NYC)', () => {
    const result = extractCoordsFromGoogleMapsUrl(
      'https://maps.google.com/?q=40.7128,-74.0060'
    );
    expect(result).toEqual({ latitude: 40.7128, longitude: -74.006 });
  });

  it('handles &q= parameter (not first)', () => {
    const result = extractCoordsFromGoogleMapsUrl(
      'https://maps.google.com/maps?hl=fr&q=48.8566,2.3522'
    );
    expect(result).toEqual({ latitude: 48.8566, longitude: 2.3522 });
  });

  it('handles integer coordinates without decimals', () => {
    const result = extractCoordsFromGoogleMapsUrl(
      'https://www.google.com/maps/@48,2,15z'
    );
    expect(result).toEqual({ latitude: 48, longitude: 2 });
  });

  it('accepts lat=90, lon=180 (valid boundary)', () => {
    const result = extractCoordsFromGoogleMapsUrl(
      'https://maps.google.com/?q=90,180'
    );
    expect(result).toEqual({ latitude: 90, longitude: 180 });
  });

  it('accepts lat=-90, lon=-180 (valid boundary)', () => {
    const result = extractCoordsFromGoogleMapsUrl(
      'https://maps.google.com/?q=-90,-180'
    );
    expect(result).toEqual({ latitude: -90, longitude: -180 });
  });

  it('rejects lat=91 (out of range)', () => {
    const result = extractCoordsFromGoogleMapsUrl(
      'https://maps.google.com/?q=91,2'
    );
    expect(result).toBeNull();
  });

  it('rejects lon=181 (out of range)', () => {
    const result = extractCoordsFromGoogleMapsUrl(
      'https://maps.google.com/?q=48,181'
    );
    expect(result).toBeNull();
  });

  it('returns null for URL without coordinates', () => {
    const result = extractCoordsFromGoogleMapsUrl(
      'https://goo.gl/maps/abc123'
    );
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractCoordsFromGoogleMapsUrl('')).toBeNull();
  });

  it('returns null for non-maps URL', () => {
    expect(extractCoordsFromGoogleMapsUrl('https://example.com')).toBeNull();
  });
});

describe('extractAddressFromText', () => {
  it('extracts French address with rue', () => {
    const result = extractAddressFromText('Check out 15 Rue de Rivoli, 75001 Paris');
    expect(result).toContain('15 Rue de Rivoli');
  });

  it('extracts French boulevard', () => {
    const result = extractAddressFromText('Located at 42 Boulevard Haussmann near the metro');
    expect(result).toContain('42 Boulevard Haussmann');
  });

  it('extracts English street address', () => {
    const result = extractAddressFromText('Visit us at 123 Main Street, Springfield');
    expect(result).toContain('123 Main Street');
  });

  it('extracts abbreviated street type (Ave)', () => {
    const result = extractAddressFromText('456 Oak Ave is great');
    expect(result).toContain('456 Oak Ave');
  });

  it('extracts address with French postal code', () => {
    const result = extractAddressFromText('Go to 8 Rue du Commerce, 75015 Paris');
    expect(result).toContain('8 Rue du Commerce');
  });

  it('returns null when no address found', () => {
    expect(extractAddressFromText('Just a random text without any address')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractAddressFromText('')).toBeNull();
  });

  it('finds address in multiline text', () => {
    const text = 'Great restaurant!\n42 Boulevard Haussmann\nHighly recommended';
    const result = extractAddressFromText(text);
    expect(result).toContain('42 Boulevard Haussmann');
  });
});

describe('extractLocationHintFromText', () => {
  it('extracts location after pin emoji', () => {
    expect(extractLocationHintFromText('📍 Le Marais, Paris')).toBe('Le Marais, Paris');
  });

  it('extracts location after pin emoji without space', () => {
    expect(extractLocationHintFromText('📍Café de Flore')).toBe('Café de Flore');
  });

  it('extracts "at Location" pattern', () => {
    expect(extractLocationHintFromText('was at Le Comptoir')).toBe('Le Comptoir');
  });

  it('extracts "at" with accented capital letter', () => {
    expect(extractLocationHintFromText('dinner at Élysée Palace')).toBe('Élysée Palace');
  });

  it('extracts pin emoji from multiline text', () => {
    const text = 'Amazing food!\n📍 Le Bouillon Chartier\n#foodie #paris';
    expect(extractLocationHintFromText(text)).toBe('Le Bouillon Chartier');
  });

  it('returns null for text without location hints', () => {
    expect(extractLocationHintFromText('Just a random post about food')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractLocationHintFromText('')).toBeNull();
  });

  it('ignores "at" followed by lowercase (not a proper noun)', () => {
    expect(extractLocationHintFromText('looking at things')).toBeNull();
  });
});