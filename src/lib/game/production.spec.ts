import { describe, expect, it } from "vitest";
import {
  REGION,
  FABRICATOR_CENTS_PER_MATERIAL,
  solarRateW,
  windRateW,
} from "./gameConfig";
import {
  applyToStorage,
  computeFabrication,
  computeProduction,
  daylightWindow,
  weatherFactor,
} from "./production";
import { fixtureWeatherHours } from "./fixtures";
import { fallbackPriceMilliCents, sellRevenueCents } from "./price";
import { fallbackWeather } from "./weatherFallback";

// Anchor: a mid-June day (Braunschweig daylight ≈ 03:00–19:45 UTC).
const DAY = new Date("2026-06-15T00:00:00Z");
const at = (h: number, m = 0) =>
  new Date(DAY.getTime() + h * 3_600_000 + m * 60_000);

const sunny = fixtureWeatherHours("sunny-day", DAY, 24);
const storm = fixtureWeatherHours("storm-day", DAY, 24);
const doldrums = fixtureWeatherHours("dark-doldrums", DAY, 24);

describe("daylight window (solar)", () => {
  it("produces nothing before sunrise", () => {
    const wh = computeProduction(
      { type: "SOLAR", level: 1 },
      sunny,
      at(0),
      at(2),
      REGION,
    );
    expect(wh).toBe(0);
  });

  it("produces nothing after sunset", () => {
    const wh = computeProduction(
      { type: "SOLAR", level: 1 },
      sunny,
      at(20),
      at(24),
      REGION,
    );
    expect(wh).toBe(0);
  });

  it("produces during midday", () => {
    const wh = computeProduction(
      { type: "SOLAR", level: 1 },
      sunny,
      at(11),
      at(12),
      REGION,
    );
    expect(wh).toBeGreaterThan(0);
  });

  it("clips a slice that straddles sunrise to the lit part only", () => {
    const { sunrise } = daylightWindow(DAY, REGION.latitude, REGION.longitude);
    const from = new Date(sunrise.getTime() - 30 * 60_000);
    const to = new Date(sunrise.getTime() + 30 * 60_000);
    const wh = computeProduction(
      { type: "SOLAR", level: 1 },
      sunny,
      from,
      to,
      REGION,
    );
    // Only the ~30 lit minutes count; far less than a full-strength hour.
    expect(wh).toBeGreaterThan(0);
    expect(wh).toBeLessThan(solarRateW(1) * 0.6);
  });
});

describe("storm cutoff (wind)", () => {
  it("produces NOTHING at wind >= 20 m/s", () => {
    // Storm fixture hours 6–19 are >= 20 m/s.
    const wh = computeProduction(
      { type: "WIND", level: 1 },
      storm,
      at(8),
      at(12),
      REGION,
    );
    expect(wh).toBe(0);
  });

  it("produces below the cutoff", () => {
    // Hour 23 has 12 m/s.
    const wh = computeProduction(
      { type: "WIND", level: 1 },
      storm,
      at(22),
      at(24),
      REGION,
    );
    expect(wh).toBeGreaterThan(0);
  });

  it("produces around the clock when calm enough", () => {
    const night = computeProduction(
      { type: "WIND", level: 1 },
      sunny,
      at(0),
      at(1),
      REGION,
    );
    expect(night).toBeGreaterThan(0);
  });
});

describe("normalization clamp", () => {
  it("clamps the factor to [0.2, 1.8]", () => {
    expect(weatherFactor(10_000, REGION.avgSolarWm2)).toBe(1.8);
    expect(weatherFactor(0, REGION.avgSolarWm2)).toBe(0.2);
    expect(weatherFactor(REGION.avgSolarWm2, REGION.avgSolarWm2)).toBe(1);
  });

  it("caps a blazing midday hour at 1.8× base rate", () => {
    // Sunny fixture hour 12 = 810 W/m² → raw factor 2.53 → clamped to 1.8.
    const wh = computeProduction(
      { type: "SOLAR", level: 1 },
      sunny,
      at(12),
      at(13),
      REGION,
    );
    expect(wh).toBeCloseTo(solarRateW(1) * 1.8, 5);
  });

  it("floors dark-doldrums wind at 0.2× base rate", () => {
    // Doldrums hour 2 = 0.6 m/s → raw factor 0.15 → clamped to 0.2.
    const wh = computeProduction(
      { type: "WIND", level: 1 },
      doldrums,
      at(2),
      at(3),
      REGION,
    );
    expect(wh).toBeCloseTo(windRateW(1) * 0.2, 5);
  });
});

describe("storage cap", () => {
  it("stores only up to capacity, the rest is lost permanently", () => {
    expect(applyToStorage(4_900, 5_000, 500)).toEqual({
      storedWh: 100,
      lostWh: 400,
    });
  });

  it("loses everything when storage is already full", () => {
    expect(applyToStorage(5_000, 5_000, 300)).toEqual({
      storedWh: 0,
      lostWh: 300,
    });
  });

  it("stores everything when there is room", () => {
    expect(applyToStorage(0, 5_000, 300)).toEqual({ storedWh: 300, lostWh: 0 });
  });
});

describe("fabricator", () => {
  it("converts credits to material over time", () => {
    // Level 1 = 10 material/h at 5 cents each; 2 h → 20 material, 100 cents.
    const r = computeFabrication(
      1,
      1_000,
      FABRICATOR_CENTS_PER_MATERIAL,
      0,
      at(0),
      at(2),
    );
    expect(r.material).toBe(20);
    expect(r.creditsSpentCents).toBe(100);
  });

  it("is limited by available credits", () => {
    // 12 cents afford only 2 material even over 10 hours.
    const r = computeFabrication(
      1,
      12,
      FABRICATOR_CENTS_PER_MATERIAL,
      0,
      at(0),
      at(10),
    );
    expect(r.material).toBe(2);
    expect(r.creditsSpentCents).toBe(10);
  });

  it("carries sub-unit remainders across settlements", () => {
    // 3 minutes at 10/h = 0.5 material → remainder only.
    const a = computeFabrication(
      1,
      1_000,
      FABRICATOR_CENTS_PER_MATERIAL,
      0,
      at(0),
      at(0, 3),
    );
    expect(a.material).toBe(0);
    expect(a.remainderMilli).toBe(500);
    // Another 3 minutes with the carried remainder → 1 whole material.
    const b = computeFabrication(
      1,
      1_000,
      FABRICATOR_CENTS_PER_MATERIAL,
      a.remainderMilli,
      at(0, 3),
      at(0, 6),
    );
    expect(b.material).toBe(1);
  });
});

describe("price fallback", () => {
  it("is deterministic and positive", () => {
    const t = new Date("2026-07-01T19:30:00Z");
    expect(fallbackPriceMilliCents(t)).toBe(fallbackPriceMilliCents(t));
    expect(fallbackPriceMilliCents(t)).toBeGreaterThan(0);
  });

  it("evening peak beats the night low on average", () => {
    let evening = 0;
    let night = 0;
    for (let d = 0; d < 30; d++) {
      evening += fallbackPriceMilliCents(
        new Date(Date.UTC(2026, 6, d + 1, 19)),
      );
      night += fallbackPriceMilliCents(new Date(Date.UTC(2026, 6, d + 1, 2)));
    }
    expect(evening).toBeGreaterThan(night);
  });

  it("computes sell revenue in cents", () => {
    // 2 kWh at 9000 milli-cents/kWh = 18 cents.
    expect(sellRevenueCents(2_000, 9_000)).toBe(18);
  });
});

describe("weather fallback", () => {
  it("is dark at night and lit at midday", () => {
    expect(fallbackWeather(at(0), REGION).solarWm2).toBe(0);
    expect(fallbackWeather(at(12), REGION).solarWm2).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    expect(fallbackWeather(at(7), REGION)).toEqual(
      fallbackWeather(at(7), REGION),
    );
  });
});
