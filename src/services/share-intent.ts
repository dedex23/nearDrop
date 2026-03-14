import {
  extractCoordsFromGoogleMapsUrl,
  extractAddressFromText,
  extractLocationHintFromText,
} from '@/utils/address-parser';
import { geocodeAddress } from './geocoding';
import { useAppStore } from '@/stores/app-store';
import type { SourceType } from '@/types';

interface ParsedShareData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  sourceType: SourceType;
  sourceUrl: string | null;
  notes: string;
}

/**
 * Parse shared text/URL content and extract place information.
 * Handles: Google Maps links, Instagram links, Facebook links, plain text with addresses.
 */
export async function parseSharedContent(
  text: string | null,
  webUrl: string | null,
  metaTitle?: string | null
): Promise<Partial<ParsedShareData>> {
  const url = webUrl || extractUrlFromText(text ?? '');
  const rawText = text ?? '';

  // 1. Google Maps URL → extract coordinates directly
  if (url && isGoogleMapsUrl(url)) {
    return await parseGoogleMapsShare(url, rawText, metaTitle ?? null);
  }

  // 2. Instagram URL
  if (url && isInstagramUrl(url)) {
    return await parseInstagramShare(url, rawText);
  }

  // 3. Facebook URL
  if (url && isFacebookUrl(url)) {
    return await parseFacebookShare(url, rawText);
  }

  // 4. Other URL — save as source
  if (url) {
    return parseGenericUrlShare(url, rawText);
  }

  // 5. Plain text — try to extract an address
  return parsePlainTextShare(rawText);
}

/**
 * Resolve a shortened Google Maps URL to its final destination.
 * RN's fetch on Android follows redirects but doesn't update res.url,
 * so we read the HTML body and extract the /maps/place/ path from it.
 */
async function resolveRedirectUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
    });
    // Try res.url first (works in some environments)
    if (res.url && res.url !== url) {
      return res.url;
    }
    // Fallback: read HTML body and extract the Google Maps URL
    const html = (await res.text()).slice(0, 50_000);
    const match = html.match(/\/maps\/place\/([^"'> ]+)/);
    if (match) {
      return 'https://www.google.com/maps/place/' + decodeURIComponent(match[1]);
    }
    return url;
  } catch {
    return url;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseGoogleMapsShare(
  url: string,
  rawText: string,
  metaTitle: string | null
): Promise<Partial<ParsedShareData>> {
  let coords = extractCoordsFromGoogleMapsUrl(url);

  // Try to extract place name from the text (often "Place Name\nhttps://maps...")
  const nameFromText = extractNameBeforeUrl(rawText, url);
  const name = nameFromText || metaTitle || '';

  // For shortened URLs (maps.app.goo.gl/...), resolve redirect to get the full URL
  let resolvedUrl: string | null = null;
  if (!coords) {
    resolvedUrl = await resolveRedirectUrl(url);
    if (resolvedUrl !== url) {
      coords = extractCoordsFromGoogleMapsUrl(resolvedUrl);
    }
  }

  if (coords) {
    const addressFromPath = resolvedUrl ? extractAddressFromGoogleMapsPath(resolvedUrl) : null;
    const address = addressFromPath || metaTitle || '';
    return {
      name: name || 'Shared place',
      address,
      latitude: coords.latitude,
      longitude: coords.longitude,
      sourceType: 'google_maps',
      sourceUrl: url,
      notes: '',
    };
  }

  // If no coords in URL, try to geocode from the best available source
  const addressFromResolvedUrl = resolvedUrl ? extractAddressFromGoogleMapsPath(resolvedUrl) : null;

  // Strip business name from Google Maps path: "Business, 86 Av. X, 75008 Paris" → "86 Av. X, 75008 Paris"
  // Nominatim can't geocode addresses prefixed with a commercial name
  const streetFromResolvedUrl =
    addressFromResolvedUrl?.includes(',')
      ? addressFromResolvedUrl.split(',').slice(1).join(',').trim()
      : null;

  // Build geocoding candidates in priority order
  const candidates = [
    addressFromResolvedUrl,
    streetFromResolvedUrl,
    extractAddressFromText(rawText),
    cleanTextForAddress(rawText, url),
    metaTitle,
    // "NAME - CITY" → try "CITY" alone (Nominatim can't find business names)
    metaTitle?.includes(' - ') ? metaTitle.split(' - ').slice(1).join(' - ') : null,
  ].filter(Boolean) as string[];

  let geocoded = null;
  let address = '';
  for (const candidate of candidates) {
    geocoded = await geocodeAddress(candidate);
    if (geocoded) {
      // If we matched on the stripped street, use the full path address for display
      address = candidate === streetFromResolvedUrl && addressFromResolvedUrl
        ? addressFromResolvedUrl
        : candidate;
      break;
    }
  }

  return {
    name: name || 'Shared place',
    address: address || '',
    ...(geocoded ? { latitude: geocoded.latitude, longitude: geocoded.longitude } : {}),
    sourceType: 'google_maps',
    sourceUrl: url,
    notes: '',
  };
}

async function parseInstagramShare(
  url: string,
  rawText: string
): Promise<Partial<ParsedShareData>> {
  return enrichSocialShare(url, rawText, 'instagram', 'Instagram place');
}

async function parseFacebookShare(
  url: string,
  rawText: string
): Promise<Partial<ParsedShareData>> {
  return enrichSocialShare(url, rawText, 'facebook', 'Facebook place');
}

interface OgMetadata {
  title: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function parseOgTags(html: string): OgMetadata {
  const getContent = (property: string): string | null => {
    const regex = new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`,
      'i'
    );
    const match = html.match(regex);
    if (match) return decodeHtmlEntities(match[1]);
    // Try reversed attribute order (content before property)
    const regex2 = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`,
      'i'
    );
    const match2 = html.match(regex2);
    return match2 ? decodeHtmlEntities(match2[1]) : null;
  };

  const latStr = getContent('place:location:latitude');
  const lonStr = getContent('place:location:longitude');
  const lat = latStr ? parseFloat(latStr) : null;
  const lon = lonStr ? parseFloat(lonStr) : null;

  return {
    title: getContent('og:title'),
    description: getContent('og:description'),
    latitude: lat !== null && !isNaN(lat) ? lat : null,
    longitude: lon !== null && !isNaN(lon) ? lon : null,
  };
}

async function fetchOgMetadata(url: string): Promise<OgMetadata | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NearDrop/1.0)',
        Accept: 'text/html',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) return null;

    // OG tags are in <head>; truncate to 50KB to avoid parsing megabytes of JS
    const html = await res.text();
    return parseOgTags(html.slice(0, 50_000));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function enrichSocialShare(
  url: string,
  rawText: string,
  sourceType: SourceType,
  defaultName: string
): Promise<Partial<ParsedShareData>> {
  const name = extractNameBeforeUrl(rawText, url);
  let notes = cleanTextForNotes(rawText, url);
  console.log(`[NearDrop] enrichSocialShare: sourceType=${sourceType} name="${name}" url=${url}`);

  // Step 1: Try to extract location from the shared text
  const textAddress = extractAddressFromText(rawText);
  const textHint = !textAddress ? extractLocationHintFromText(rawText) : null;
  console.log(`[NearDrop] text extraction: address="${textAddress}" hint="${textHint}"`);

  // Step 2: Fetch OG metadata from the page
  const og = await fetchOgMetadata(url);
  console.log(`[NearDrop] OG metadata:`, JSON.stringify(og));

  // Use OG description as notes if we don't have any
  if (!notes && og?.description) {
    // Clean up Instagram OG description format: "N likes, M comments - user on date: \"caption\""
    const captionMatch = og.description.match(/:\s*"(.+?)"\s*\.?\s*$/s);
    notes = captionMatch ? captionMatch[1].trim() : og.description;
  }

  // Step 2a: Direct coordinates from OG tags (Facebook Places)
  if (og?.latitude != null && og?.longitude != null) {
    console.log(`[NearDrop] using OG coordinates: ${og.latitude},${og.longitude}`);
    return {
      name: name || extractPlaceNameFromOgTitle(og.title) || og.title || defaultName,
      latitude: og.latitude,
      longitude: og.longitude,
      sourceType,
      sourceUrl: url,
      notes,
    };
  }

  // Build candidates list by priority
  const ogDescription = og?.description ?? '';
  const ogAddress = extractAddressFromText(ogDescription);
  const ogHint = !ogAddress ? extractLocationHintFromText(ogDescription) : null;
  console.log(`[NearDrop] OG description extraction: address="${ogAddress}" hint="${ogHint}"`);

  const bestCandidate = textAddress || textHint || ogAddress || ogHint;
  console.log(`[NearDrop] bestCandidate for geocoding: "${bestCandidate}"`);

  // Step 3: Geocode the best candidate, biased near user location
  if (bestCandidate) {
    const userLocation = useAppStore.getState().userLocation;
    console.log(`[NearDrop] geocoding with userLocation:`, userLocation ? `${userLocation.latitude},${userLocation.longitude}` : 'null');
    const geocoded = await geocodeAddress(bestCandidate, userLocation);
    console.log(`[NearDrop] geocode result:`, JSON.stringify(geocoded));
    if (geocoded) {
      return {
        name: name || extractPlaceNameFromOgTitle(og?.title ?? null) || og?.title || defaultName,
        address: bestCandidate,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        sourceType,
        sourceUrl: url,
        notes,
      };
    }
  }

  console.log(`[NearDrop] no location found, returning without coordinates`);
  // Use OG title as name if available
  return {
    name: name || extractPlaceNameFromOgTitle(og?.title ?? null) || og?.title || defaultName,
    address: '',
    sourceType,
    sourceUrl: url,
    notes,
  };
}

function parseGenericUrlShare(url: string, rawText: string): Partial<ParsedShareData> {
  const name = extractNameBeforeUrl(rawText, url);
  return {
    name: name || 'Shared place',
    address: '',
    sourceType: 'share_intent',
    sourceUrl: url,
    notes: cleanTextForNotes(rawText, url),
  };
}

async function parsePlainTextShare(rawText: string): Promise<Partial<ParsedShareData>> {
  const address = extractAddressFromText(rawText);

  if (address) {
    const geocoded = await geocodeAddress(address);
    return {
      name: rawText.split('\n')[0]?.trim().substring(0, 60) || 'Shared place',
      address,
      ...(geocoded ? { latitude: geocoded.latitude, longitude: geocoded.longitude } : {}),
      sourceType: 'share_intent',
      notes: '',
    };
  }

  // No address found — put everything as name/notes for the user to edit
  const firstLine = rawText.split('\n')[0]?.trim() || '';
  return {
    name: firstLine.substring(0, 60) || 'Shared place',
    address: '',
    sourceType: 'share_intent',
    notes: rawText.length > 60 ? rawText : '',
  };
}

// --- Helpers ---

function extractUrlFromText(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

function isGoogleMapsUrl(url: string): boolean {
  return /google\.\w+\/maps|maps\.google|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url);
}

function isInstagramUrl(url: string): boolean {
  return /instagram\.com|instagr\.am/i.test(url);
}

function isFacebookUrl(url: string): boolean {
  return /facebook\.com|fb\.com|fb\.me/i.test(url);
}

/**
 * Extract the address portion from a resolved Google Maps URL path.
 * E.g. "/maps/place/INDIAN+FACTORY+-+LA+COURNEUVE,+1+Bd+Pasteur,+93120+La+Courneuve/data=..."
 * → "INDIAN FACTORY - LA COURNEUVE, 1 Bd Pasteur, 93120 La Courneuve"
 */
function extractAddressFromGoogleMapsPath(url: string): string | null {
  const match = url.match(/\/place\/([^/]+)/);
  if (!match) return null;
  const decoded = decodeURIComponent(match[1].replace(/\+/g, ' ')).trim();
  return decoded || null;
}

/** Extract the text before the URL (often the place name in share messages) */
function extractNameBeforeUrl(text: string, url: string): string {
  const idx = text.indexOf(url);
  if (idx <= 0) return '';
  const before = text.substring(0, idx).trim();
  // Take last line before URL (skip empty lines)
  const lines = before.split('\n').filter((l) => l.trim());
  const name = lines[lines.length - 1]?.trim() || '';
  return name.substring(0, 80);
}

/** Extract a short place name from a long OG title (e.g. Instagram post caption) */
function extractPlaceNameFromOgTitle(ogTitle: string | null): string {
  if (!ogTitle) return '';

  // Try to find a 📍 location pin — text after it is usually the place name
  const pinMatch = ogTitle.match(/📍\s*(.+)/);
  if (pinMatch) {
    // Take first line after pin, strip trailing emoji/stars/hashtags
    const afterPin = pinMatch[1].split('\n')[0].trim();
    const cleaned = afterPin.replace(/[⭐️#].*/g, '').trim();
    if (cleaned.length > 0 && cleaned.length <= 80) return cleaned;
  }

  // Instagram OG title format: "Username on Instagram: \"caption...\""
  const igMatch = ogTitle.match(/^(.+?)\s+on Instagram:/);
  if (igMatch) {
    // Use the account display name as the place name — often the business name
    const accountName = igMatch[1].trim();
    if (accountName.length > 0 && accountName.length <= 60) return accountName;
  }

  // If title is short enough, use it directly
  if (ogTitle.length <= 60) return ogTitle;

  return '';
}

/** Remove the URL from text and return the rest as notes */
function cleanTextForNotes(text: string, url: string): string {
  return text.replace(url, '').trim();
}

/** Remove the URL from text and return the rest as potential address */
function cleanTextForAddress(text: string, url: string): string {
  return text.replace(url, '').replace(/\n/g, ', ').trim();
}
