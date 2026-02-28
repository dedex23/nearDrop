/**
 * Try to extract coordinates from a Google Maps URL.
 * Supports formats like:
 * - https://maps.google.com/?q=48.8566,2.3522
 * - https://www.google.com/maps/@48.8566,2.3522,15z
 * - https://goo.gl/maps/...
 */
export function extractCoordsFromGoogleMapsUrl(
  url: string
): { latitude: number; longitude: number } | null {
  // Pattern: @lat,lon or ?q=lat,lon or /place/lat,lon
  const patterns = [
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const latitude = parseFloat(match[1]);
      const longitude = parseFloat(match[2]);
      if (isValidCoordinate(latitude, longitude)) {
        return { latitude, longitude };
      }
    }
  }

  return null;
}

/**
 * Try to extract an address-like string from free text.
 * Looks for patterns like street numbers followed by street names.
 */
export function extractAddressFromText(text: string): string | null {
  // Common address patterns (French and English)
  const patterns = [
    // "123 Rue de Something, 75001 Paris"
    /\d{1,5}\s+(?:rue|avenue|boulevard|place|allée|impasse|chemin|cours|passage)\s+[^,\n]{3,}(?:,\s*\d{5}\s+\w+)?/i,
    // "123 Main Street, City"
    /\d{1,5}\s+\w+\s+(?:street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|way|place|pl)\b[^,\n]{0,50}/i,
    // Postal code patterns (French)
    /\d{1,5}\s+[^,\n]{5,},\s*\d{5}\s+\w+/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return null;
}

function isValidCoordinate(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}
