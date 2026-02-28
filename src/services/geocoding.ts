const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'NearDrop/1.0 (private-android-app)';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

let lastRequestTime = 0;

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
}

export async function geocodeAddress(
  address: string
): Promise<{ latitude: number; longitude: number; displayName: string } | null> {
  try {
    const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const res = await throttledFetch(url);
    if (!res.ok) return null;

    const data: NominatimResult[] = await res.json();
    if (data.length === 0) return null;

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    const res = await throttledFetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}
