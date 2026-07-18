// ---------------------------------------------------------------------------
// Pure production math. No SvelteKit, no Prisma, no I/O — fully unit-testable.
// All progress is integrated deterministically from timestamps on read.
// ---------------------------------------------------------------------------

import * as suncalcModule from "suncalc";
import {
  STORM_CUTOFF_WIND_MS,
  WEATHER_FACTOR_MAX,
  WEATHER_FACTOR_MIN,
  fabricatorMaterialPerHour,
  solarRateW,
  windRateW,
} from "./gameConfig";

// suncalc is CommonJS — normalize the default/namespace interop difference
// between Vite SSR and plain Node so tests and app code both work.
const SunCalc: typeof suncalcModule =
  (suncalcModule as { default?: typeof suncalcModule }).default ??
  suncalcModule;

export type ProducerType = "SOLAR" | "WIND";

export type WeatherHourData = {
  /** Full hour, UTC. */
  hourUtc: Date;
  solarWm2: number;
  windMs: number;
};

export type RegionData = {
  latitude: number;
  longitude: number;
  avgSolarWm2: number;
  avgWindMs: number;
};

const HOUR_MS = 3_600_000;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Fairness normalization: current value / regional long-term average. */
export const weatherFactor = (value: number, average: number) =>
  clamp(value / average, WEATHER_FACTOR_MIN, WEATHER_FACTOR_MAX);

/** Key for looking up the weather bucket a timestamp falls into. */
export const hourKeyMs = (date: Date) =>
  Math.floor(date.getTime() / HOUR_MS) * HOUR_MS;

/** [sunrise, sunset] for the UTC calendar day containing `date`. */
export function daylightWindow(
  date: Date,
  latitude: number,
  longitude: number,
) {
  const noon = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12),
  );
  const times = SunCalc.getTimes(noon, latitude, longitude);
  // Polar edge cases: suncalc may return null/invalid — zero-length window.
  const sunrise =
    times.sunrise && !isNaN(times.sunrise.getTime()) ? times.sunrise : noon;
  const sunset =
    times.sunset && !isNaN(times.sunset.getTime()) ? times.sunset : noon;
  return { sunrise, sunset };
}

/** Instantaneous production rate in watts for a producer at given weather. */
export function producerRateW(
  type: ProducerType,
  level: number,
  weather: { solarWm2: number; windMs: number },
  region: RegionData,
  at: Date,
): number {
  if (type === "SOLAR") {
    const { sunrise, sunset } = daylightWindow(
      at,
      region.latitude,
      region.longitude,
    );
    if (at < sunrise || at >= sunset) return 0;
    return (
      solarRateW(level) * weatherFactor(weather.solarWm2, region.avgSolarWm2)
    );
  }
  // WIND: storm cutoff — at >= 20 m/s the asset produces NOTHING.
  if (weather.windMs >= STORM_CUTOFF_WIND_MS) return 0;
  return windRateW(level) * weatherFactor(weather.windMs, region.avgWindMs);
}

/**
 * Potential energy produced by one producer over [from, to], in watt-hours
 * (fractional). Integrates hour by hour; weather is a step function per hour.
 * Storage capping happens separately via `applyToStorage`.
 */
export function computeProduction(
  building: { type: ProducerType; level: number },
  weatherHours: WeatherHourData[],
  from: Date,
  to: Date,
  region: RegionData,
): number {
  if (to <= from) return 0;
  const byHour = new Map<number, WeatherHourData>();
  for (const w of weatherHours) byHour.set(hourKeyMs(w.hourUtc), w);

  let producedWh = 0;
  for (let bucket = hourKeyMs(from); bucket < to.getTime(); bucket += HOUR_MS) {
    const weather = byHour.get(bucket);
    if (!weather) continue; // missing weather = no production for that hour
    const sliceStart = Math.max(bucket, from.getTime());
    const sliceEnd = Math.min(bucket + HOUR_MS, to.getTime());
    if (sliceEnd <= sliceStart) continue;

    if (building.type === "SOLAR") {
      const { sunrise, sunset } = daylightWindow(
        new Date(sliceStart),
        region.latitude,
        region.longitude,
      );
      const litStart = Math.max(sliceStart, sunrise.getTime());
      const litEnd = Math.min(sliceEnd, sunset.getTime());
      if (litEnd <= litStart) continue;
      const factor = weatherFactor(weather.solarWm2, region.avgSolarWm2);
      producedWh +=
        solarRateW(building.level) * factor * ((litEnd - litStart) / HOUR_MS);
    } else {
      if (weather.windMs >= STORM_CUTOFF_WIND_MS) continue;
      const factor = weatherFactor(weather.windMs, region.avgWindMs);
      producedWh +=
        windRateW(building.level) *
        factor *
        ((sliceEnd - sliceStart) / HOUR_MS);
    }
  }
  return producedWh;
}

/**
 * Adds produced energy to storage. Full storage = production lost permanently.
 */
export function applyToStorage(
  currentWh: number,
  capacityWh: number,
  producedWh: number,
): { storedWh: number; lostWh: number } {
  const free = Math.max(0, capacityWh - currentWh);
  const storedWh = Math.min(free, producedWh);
  return { storedWh, lostWh: producedWh - storedWh };
}

/**
 * Fabricator: continuously converts credits into material, independent of
 * weather (dark-doldrums protection). Limited by time AND available credits.
 * Returns whole material units gained plus credits spent; fractional progress
 * is handled by the caller via the building's milli-remainder.
 */
export function computeFabrication(
  level: number,
  creditsCents: number,
  centsPerMaterial: number,
  remainderMilli: number,
  from: Date,
  to: Date,
  rateMultiplier = 1,
): { material: number; creditsSpentCents: number; remainderMilli: number } {
  if (to <= from || creditsCents < centsPerMaterial) {
    return { material: 0, creditsSpentCents: 0, remainderMilli };
  }
  const hours = (to.getTime() - from.getTime()) / HOUR_MS;
  const producedMilli =
    remainderMilli +
    Math.round(
      fabricatorMaterialPerHour(level) * rateMultiplier * hours * 1000,
    );
  const byTime = Math.floor(producedMilli / 1000);
  const byCredits = Math.floor(creditsCents / centsPerMaterial);
  const material = Math.min(byTime, byCredits);
  // When credit-limited, drop the excess remainder — the fabricator was stalled.
  const newRemainder = byCredits < byTime ? 0 : producedMilli % 1000;
  return {
    material,
    creditsSpentCents: material * centsPerMaterial,
    remainderMilli: newRemainder,
  };
}
