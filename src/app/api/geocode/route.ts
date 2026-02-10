import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/geocode
 * Geocode an address to get latitude and longitude coordinates
 * Query params: address (required)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawAddress = searchParams.get('address');

    if (!rawAddress || rawAddress.trim().length === 0) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const candidates = buildAddressCandidates(rawAddress).slice(0, 8);
    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Use Google Maps Geocoding API if available
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (googleMapsApiKey) {
      const googleResult = await geocodeWithGoogle(candidates, googleMapsApiKey);
      if (googleResult.result) {
        return NextResponse.json({
          success: true,
          lat: googleResult.result.lat,
          lng: googleResult.result.lng,
          formatted_address: googleResult.result.formattedAddress,
          query: googleResult.result.query,
          provider: 'google',
        });
      }
    }

    // Fallback: Use OpenStreetMap Nominatim (free, no API key required)
    const nominatimResult = await geocodeWithNominatim(candidates);
    if (nominatimResult.result) {
      return NextResponse.json({
        success: true,
        lat: nominatimResult.result.lat,
        lng: nominatimResult.result.lng,
        formatted_address: nominatimResult.result.formattedAddress,
        query: nominatimResult.result.query,
        provider: 'nominatim',
      });
    }

    return NextResponse.json(
      {
        error: 'Address not found',
        details: 'No geocoding match found after fallback attempts',
        attempted: candidates.slice(0, 5),
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode address', details: error.message },
      { status: 500 }
    );
  }
}

type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
  query: string;
};

type GeocodeAttemptResult = {
  result: GeocodeResult | null;
  details?: string;
};

function normalizeAddressInput(input: string): string {
  return input
    .replace(/\r?\n/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/,+/g, ',')
    .replace(/\s*,\s*/g, ', ')
    .replace(/,\s*,+/g, ', ')
    .replace(/^,\s*|\s*,$/g, '')
    .trim();
}

function dedupeAddressSegments(parts: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const part of parts) {
    const cleaned = part.trim();
    if (!cleaned) continue;

    const key = cleaned
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(cleaned);
  }

  return deduped;
}

function ensureCapeTownContext(address: string): string {
  const segments = dedupeAddressSegments(address.split(','));
  const hasCapeTown = segments.some((segment) => /\bcape\s*town\b/i.test(segment));
  const hasSouthAfrica = segments.some((segment) => /\b(south\s*africa|za)\b/i.test(segment));

  if (!hasCapeTown) segments.push('Cape Town');
  if (!hasSouthAfrica) segments.push('South Africa');

  return normalizeAddressInput(segments.join(', '));
}

function expandStreetAbbreviations(address: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/\bRd\.?\b/gi, 'Road'],
    [/\bSt\.?\b/gi, 'Street'],
    [/\bAve\.?\b/gi, 'Avenue'],
    [/\bAv\.?\b/gi, 'Avenue'],
    [/\bBlvd\.?\b/gi, 'Boulevard'],
    [/\bDr\.?\b/gi, 'Drive'],
    [/\bLn\.?\b/gi, 'Lane'],
    [/\bCtr\.?\b/gi, 'Centre'],
  ];

  let normalized = address;
  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalizeAddressInput(normalized);
}

function buildAddressCandidates(rawAddress: string): string[] {
  const base = normalizeAddressInput(rawAddress);
  if (!base) return [];

  const candidates: string[] = [];
  const seen = new Set<string>();

  const pushCandidate = (value: string) => {
    const normalized = normalizeAddressInput(value);
    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    candidates.push(normalized);
  };

  const baseSegments = dedupeAddressSegments(base.split(','));
  const dedupedBase = normalizeAddressInput(baseSegments.join(', '));
  const expandedBase = expandStreetAbbreviations(dedupedBase);

  pushCandidate(dedupedBase);
  pushCandidate(ensureCapeTownContext(dedupedBase));
  pushCandidate(expandedBase);
  pushCandidate(ensureCapeTownContext(expandedBase));

  if (baseSegments.length >= 2) {
    const streetAndArea = `${baseSegments[0]}, ${baseSegments[1]}`;
    pushCandidate(streetAndArea);
    pushCandidate(ensureCapeTownContext(streetAndArea));

    const streetAndLast = `${baseSegments[0]}, ${baseSegments[baseSegments.length - 1]}`;
    pushCandidate(streetAndLast);
    pushCandidate(ensureCapeTownContext(streetAndLast));
  } else {
    pushCandidate(ensureCapeTownContext(baseSegments[0] || dedupedBase));
  }

  return candidates;
}

async function geocodeWithGoogle(
  candidates: string[],
  apiKey: string
): Promise<GeocodeAttemptResult> {
  let lastStatus = 'ZERO_RESULTS';

  for (const query of candidates) {
    const geocodeUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    geocodeUrl.searchParams.set('address', query);
    geocodeUrl.searchParams.set('region', 'za');
    geocodeUrl.searchParams.set('key', apiKey);

    const response = await fetch(geocodeUrl.toString(), { cache: 'no-store' });
    if (!response.ok) {
      lastStatus = `HTTP_${response.status}`;
      continue;
    }

    const data = await response.json();
    const status = typeof data?.status === 'string' ? data.status : 'UNKNOWN';
    lastStatus = status;

    if (status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
      const first = data.results[0];
      const lat = first?.geometry?.location?.lat;
      const lng = first?.geometry?.location?.lng;

      if (typeof lat === 'number' && typeof lng === 'number') {
        return {
          result: {
            lat,
            lng,
            formattedAddress: first.formatted_address || query,
            query,
          },
        };
      }
    }

    if (status === 'OVER_QUERY_LIMIT' || status === 'REQUEST_DENIED' || status === 'INVALID_REQUEST') {
      break;
    }
  }

  return { result: null, details: lastStatus };
}

async function geocodeWithNominatim(candidates: string[]): Promise<GeocodeAttemptResult> {
  for (const query of candidates) {
    const result = await queryNominatim(query, true);
    if (result) return { result };
  }

  // If strict ZA search fails, retry without country restriction.
  for (const query of candidates) {
    const result = await queryNominatim(query, false);
    if (result) return { result };
  }

  return { result: null, details: 'ZERO_RESULTS' };
}

async function queryNominatim(query: string, restrictToZA: boolean): Promise<GeocodeResult | null> {
  const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
  nominatimUrl.searchParams.set('format', 'jsonv2');
  nominatimUrl.searchParams.set('q', query);
  nominatimUrl.searchParams.set('limit', '3');
  nominatimUrl.searchParams.set('addressdetails', '1');

  if (restrictToZA) {
    nominatimUrl.searchParams.set('countrycodes', 'za');
  }

  const response = await fetch(nominatimUrl.toString(), {
    headers: {
      'User-Agent': 'sayso-app/1.0',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const first = data[0] as {
    lat?: string;
    lon?: string;
    display_name?: string;
  };

  const lat = Number.parseFloat(first.lat || '');
  const lng = Number.parseFloat(first.lon || '');

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    formattedAddress: first.display_name || query,
    query,
  };
}

