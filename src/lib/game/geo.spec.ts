import { describe, expect, it } from "vitest";
import {
  geohashCellCenter,
  geohashEncode,
  REGION_GEOHASH_PRECISION,
} from "./geo";

describe("geohashEncode", () => {
  // Reference vectors from the original geohash.org implementation.
  it("matches known reference hashes", () => {
    expect(geohashEncode(57.64911, 10.40744, 11)).toBe("u4pruydqqvj");
    expect(geohashEncode(48.669, -4.329, 5)).toBe("gbsuv");
  });

  it("groups nearby places into the same coarse cell", () => {
    // Braunschweig and Wolfsburg are ~30 km apart.
    const braunschweig = geohashEncode(52.2689, 10.5268, 3);
    const wolfsburg = geohashEncode(52.4227, 10.7865, 3);
    expect(braunschweig).toBe(wolfsburg);
  });

  it("separates places on different continents", () => {
    const berlin = geohashEncode(52.52, 13.405, REGION_GEOHASH_PRECISION);
    const tokyo = geohashEncode(35.6764, 139.65, REGION_GEOHASH_PRECISION);
    expect(berlin).not.toBe(tokyo);
  });

  it("handles boundary coordinates", () => {
    expect(geohashEncode(0, 0, 3)).toHaveLength(3);
    expect(geohashEncode(90, 180, 3)).toHaveLength(3);
    expect(geohashEncode(-90, -180, 3)).toBe("000");
  });
});

describe("geohashCellCenter", () => {
  it("round-trips: the cell center encodes back to the same hash", () => {
    const hash = geohashEncode(52.2689, 10.5268, REGION_GEOHASH_PRECISION);
    const center = geohashCellCenter(hash);
    expect(
      geohashEncode(
        center.latitude,
        center.longitude,
        REGION_GEOHASH_PRECISION,
      ),
    ).toBe(hash);
  });

  it("stays within the cell bounds (~±0.7° at precision 3)", () => {
    const center = geohashCellCenter(geohashEncode(52.2689, 10.5268, 3));
    expect(Math.abs(center.latitude - 52.2689)).toBeLessThan(1.5);
    expect(Math.abs(center.longitude - 10.5268)).toBeLessThan(1.5);
  });

  it("rejects invalid characters", () => {
    expect(() => geohashCellCenter("a!")).toThrow();
  });
});
