import Constants from 'expo-constants';

const GOOGLE_API_KEY =
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey ??
  Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ??
  '';

const GOOGLE_GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

/**
 * Geocode an address using Google Maps Geocoding API.
 * Optionally biased near a location.
 */
export async function geocodeAddress(
  address: string,
  nearLocation?: { latitude: number; longitude: number } | null
): Promise<GeocodingResult | null> {
  if (__DEV__) console.log('[NearDrop][Geocode] API key:', GOOGLE_API_KEY ? `${GOOGLE_API_KEY.slice(0, 8)}...` : 'MISSING');

  if (!GOOGLE_API_KEY) {
    console.warn('[NearDrop][Geocode] No Google Maps API key configured');
    return null;
  }

  // Try Google Places first (better for business/restaurant names)
  const placeResult = await findPlace(address, nearLocation);
  if (placeResult) return placeResult;

  // Fallback to Google Geocoding (better for street addresses)
  return geocodeWithGoogle(address, nearLocation);
}

/**
 * Find a place by name using Google Places API (Text Search).
 * Best for business/restaurant names.
 */
async function findPlace(
  query: string,
  nearLocation?: { latitude: number; longitude: number } | null
): Promise<GeocodingResult | null> {
  try {
    let url = `${GOOGLE_PLACES_BASE}?input=${encodeURIComponent(query)}&inputtype=textquery&fields=geometry,formatted_address,name&key=${GOOGLE_API_KEY}`;
    if (nearLocation) {
      url += `&locationbias=circle:50000@${nearLocation.latitude},${nearLocation.longitude}`;
    }

    if (__DEV__) console.log('[NearDrop][Geocode] Places URL:', url.replace(GOOGLE_API_KEY, 'KEY'));
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (__DEV__) console.log('[NearDrop][Geocode] Places response:', data.status, data.candidates?.length ?? 0);
    if (data.status !== 'OK' || !data.candidates?.length) return null;

    const candidate = data.candidates[0];
    const loc = candidate.geometry?.location;
    if (!loc) return null;

    return {
      latitude: loc.lat,
      longitude: loc.lng,
      displayName: candidate.formatted_address ?? candidate.name ?? query,
    };
  } catch {
    return null;
  }
}

/**
 * Geocode a street address using Google Geocoding API.
 */
async function geocodeWithGoogle(
  address: string,
  nearLocation?: { latitude: number; longitude: number } | null
): Promise<GeocodingResult | null> {
  try {
    let url = `${GOOGLE_GEOCODE_BASE}?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
    if (nearLocation) {
      // Bias results near user's location
      url += `&bounds=${nearLocation.latitude - 0.5},${nearLocation.longitude - 0.5}|${nearLocation.latitude + 0.5},${nearLocation.longitude + 0.5}`;
    }

    if (__DEV__) console.log('[NearDrop][Geocode] Google URL:', url.replace(GOOGLE_API_KEY, 'KEY'));
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (__DEV__) console.log('[NearDrop][Geocode] Google response:', data.status, data.results?.length ?? 0);
    if (data.status !== 'OK' || !data.results?.length) return null;

    const result = data.results[0];
    const loc = result.geometry?.location;
    if (!loc) return null;

    return {
      latitude: loc.lat,
      longitude: loc.lng,
      displayName: result.formatted_address ?? address,
    };
  } catch {
    return null;
  }
}

/**
 * Reverse geocode coordinates to an address using Google Geocoding API.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  if (!GOOGLE_API_KEY) return null;

  try {
    const url = `${GOOGLE_GEOCODE_BASE}?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;

    return data.results[0].formatted_address ?? null;
  } catch {
    return null;
  }
}
