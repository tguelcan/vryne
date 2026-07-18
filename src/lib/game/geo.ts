// ---------------------------------------------------------------------------
// Geohash encoding (pure, dependency-free). Players are grouped into coarse
// geohash cells so nearby players share one Region row (and its weather
// cache) — and no exact location is ever stored.
// ---------------------------------------------------------------------------

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/**
 * Region cell precision. Precision 3 ≈ 156 × 156 km — deliberately coarse:
 * one cell covers a whole metro area and its surroundings.
 */
export const REGION_GEOHASH_PRECISION = 3;

/** Encodes latitude/longitude into a geohash of the given precision. */
export function geohashEncode(
  latitude: number,
  longitude: number,
  precision: number,
): string {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let hash = "";
  let bits = 0;
  let value = 0;
  let evenBit = true;

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lonMin + lonMax) / 2;
      if (longitude >= mid) {
        value = value * 2 + 1;
        lonMin = mid;
      } else {
        value = value * 2;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (latitude >= mid) {
        value = value * 2 + 1;
        latMin = mid;
      } else {
        value = value * 2;
        latMax = mid;
      }
    }
    evenBit = !evenBit;
    if (++bits === 5) {
      hash += BASE32[value];
      bits = 0;
      value = 0;
    }
  }
  return hash;
}

/** Returns the center coordinates of a geohash cell. */
export function geohashCellCenter(hash: string): {
  latitude: number;
  longitude: number;
} {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let evenBit = true;

  for (const char of hash) {
    const value = BASE32.indexOf(char);
    if (value === -1) throw new Error(`Invalid geohash character: ${char}`);
    for (let bit = 4; bit >= 0; bit--) {
      const isSet = (value >> bit) & 1;
      if (evenBit) {
        const mid = (lonMin + lonMax) / 2;
        if (isSet) lonMin = mid;
        else lonMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (isSet) latMin = mid;
        else latMax = mid;
      }
      evenBit = !evenBit;
    }
  }
  return {
    latitude: (latMin + latMax) / 2,
    longitude: (lonMin + lonMax) / 2,
  };
}
