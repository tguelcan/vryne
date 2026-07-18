// ---------------------------------------------------------------------------
// Place lookup via the free Open-Meteo geocoding API (same provider as the
// weather data, no API key needed). Used once during onboarding.
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 5_000;

export type GeocodedPlace = {
  name: string;
  latitude: number;
  longitude: number;
  /** ISO 3166-1 alpha-2, e.g. "DE" — when the API provides it. */
  countryCode?: string;
};

/** Resolves a free-text place name to coordinates. Null when not found. */
export async function geocodePlace(
  search: string,
): Promise<GeocodedPlace | null> {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search" +
    `?name=${encodeURIComponent(search)}&count=1&language=en&format=json`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{
        name: string;
        latitude: number;
        longitude: number;
        country_code?: string;
      }>;
    };
    const hit = data.results?.[0];
    if (!hit) return null;
    return {
      name: hit.name,
      latitude: hit.latitude,
      longitude: hit.longitude,
      countryCode: hit.country_code,
    };
  } catch {
    return null;
  }
}
