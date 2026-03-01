import { extractCoordsFromGoogleMapsUrl, extractAddressFromText } from '@/utils/address-parser';
import { geocodeAddress } from './geocoding';
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
  webUrl: string | null
): Promise<Partial<ParsedShareData>> {
  const url = webUrl || extractUrlFromText(text ?? '');
  const rawText = text ?? '';

  // 1. Google Maps URL → extract coordinates directly
  if (url && isGoogleMapsUrl(url)) {
    return await parseGoogleMapsShare(url, rawText);
  }

  // 2. Instagram URL
  if (url && isInstagramUrl(url)) {
    return parseInstagramShare(url, rawText);
  }

  // 3. Facebook URL
  if (url && isFacebookUrl(url)) {
    return parseFacebookShare(url, rawText);
  }

  // 4. Other URL — save as source
  if (url) {
    return parseGenericUrlShare(url, rawText);
  }

  // 5. Plain text — try to extract an address
  return parsePlainTextShare(rawText);
}

async function parseGoogleMapsShare(
  url: string,
  rawText: string
): Promise<Partial<ParsedShareData>> {
  const coords = extractCoordsFromGoogleMapsUrl(url);

  // Try to extract place name from the text (often "Place Name\nhttps://maps...")
  const name = extractNameBeforeUrl(rawText, url);

  if (coords) {
    return {
      name: name || 'Shared place',
      latitude: coords.latitude,
      longitude: coords.longitude,
      sourceType: 'google_maps',
      sourceUrl: url,
      notes: '',
    };
  }

  // If no coords in URL, try to extract address from the shared text
  const address = extractAddressFromText(rawText) || cleanTextForAddress(rawText, url);
  const geocoded = address ? await geocodeAddress(address) : null;

  return {
    name: name || 'Shared place',
    address: address || '',
    latitude: geocoded?.latitude ?? 0,
    longitude: geocoded?.longitude ?? 0,
    sourceType: 'google_maps',
    sourceUrl: url,
    notes: '',
  };
}

function parseInstagramShare(url: string, rawText: string): Partial<ParsedShareData> {
  const name = extractNameBeforeUrl(rawText, url);
  return {
    name: name || 'Instagram place',
    address: '',
    sourceType: 'instagram',
    sourceUrl: url,
    notes: cleanTextForNotes(rawText, url),
  };
}

function parseFacebookShare(url: string, rawText: string): Partial<ParsedShareData> {
  const name = extractNameBeforeUrl(rawText, url);
  return {
    name: name || 'Facebook place',
    address: '',
    sourceType: 'facebook',
    sourceUrl: url,
    notes: cleanTextForNotes(rawText, url),
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
      latitude: geocoded?.latitude ?? 0,
      longitude: geocoded?.longitude ?? 0,
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

/** Remove the URL from text and return the rest as notes */
function cleanTextForNotes(text: string, url: string): string {
  return text.replace(url, '').trim();
}

/** Remove the URL from text and return the rest as potential address */
function cleanTextForAddress(text: string, url: string): string {
  return text.replace(url, '').replace(/\n/g, ', ').trim();
}
