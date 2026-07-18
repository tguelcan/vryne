// ---------------------------------------------------------------------------
// Pure synthetic weather fallback. Used when the Open-Meteo API fails or for
// hours it does not cover. The game must never block on an external service.
// Solar: sine arc over the astronomical daylight window.
// Wind: seeded random walk around the regional average.
// ---------------------------------------------------------------------------

import { seededUnit } from "./price";
import { daylightWindow, type RegionData } from "./production";

const HOUR_MS = 3_600_000;

/**
 * Synthetic weather for the full UTC hour starting at `hourUtc`.
 * Deterministic per hour and region.
 */
export function fallbackWeather(
  hourUtc: Date,
  region: RegionData,
): { solarWm2: number; windMs: number } {
  const epochHour = Math.floor(hourUtc.getTime() / HOUR_MS);
  const mid = new Date(epochHour * HOUR_MS + HOUR_MS / 2);
  const { sunrise, sunset } = daylightWindow(
    mid,
    region.latitude,
    region.longitude,
  );

  // Solar: sine arc peaking at solar noon, ~1.3× regional average at the top.
  let solarWm2 = 0;
  const dayLen = sunset.getTime() - sunrise.getTime();
  if (dayLen > 0 && mid >= sunrise && mid < sunset) {
    const phase = (mid.getTime() - sunrise.getTime()) / dayLen; // 0..1
    solarWm2 = Math.round(region.avgSolarWm2 * 1.3 * Math.sin(Math.PI * phase));
  }

  // Wind: smooth seeded walk — interpolate between per-6h anchor values.
  const block = Math.floor(epochHour / 6);
  const t = (epochHour % 6) / 6;
  const anchorA = 0.4 + seededUnit(block) * 1.2; // 0.4..1.6 × average
  const anchorB = 0.4 + seededUnit(block + 1) * 1.2;
  const windMs = region.avgWindMs * (anchorA + (anchorB - anchorA) * t);

  return { solarWm2, windMs: Math.round(windMs * 10) / 10 };
}
