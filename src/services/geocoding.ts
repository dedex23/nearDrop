const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'NearDrop/1.0 (private-android-app)';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

// Serializes requests so only one is in-flight at a time, guaranteeing
// the 1.1s Nominatim rate limit even under concurrent callers.
let lastRequestDone: Promise<void> = Promise.resolve();
let lastRequestTime = 0;

async function throttledFetch(url: string): Promise<Response> {
  // Wait for any previous request to finish before checking timing
  await lastRequestDone;

  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed));
  }
  lastRequestTime = Date.now();

  const fetchPromise = fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  // Next caller must wait for this fetch to complete before proceeding
  lastRequestDone = fetchPromise.then(() => {}, () => {});

  return fetchPromise;
}

export async function geocodeAddress(
  address: string,
  nearLocation?: { latitude: number; longitude: number } | null
): Promise<{ latitude: number; longitude: number; displayName: string } | null> {
  try {
    let url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    // Bias results near user's location if available
    if (nearLocation) {
      const delta = 0.5; // ~50km bounding box
      const viewbox = `${nearLocation.longitude - delta},${nearLocation.latitude - delta},${nearLocation.longitude + delta},${nearLocation.latitude + delta}`;
      url += `&viewbox=${viewbox}&bounded=0`;
    }
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
