// ---------------------------------------------------------------------------
// Weather service: cache per REGION per full UTC hour. Missing hours are
// fetched from Open-Meteo and upserted during reads. If the API fails, the
// synthetic fallback fills the gap and marks those hours as "estimated".
// The game never blocks on the external service.
// ---------------------------------------------------------------------------

import { dev } from "$app/env";
import { prisma } from "$server/db";
import { REGION } from "../gameConfig";
import { hourKeyMs } from "../production";
import { fallbackWeather } from "../weatherFallback";
import { fixtureWeatherHours } from "../fixtures";
import { devState } from "./time";

export type WeatherRow = {
  hourUtc: Date;
  solarWm2: number;
  windMs: number;
  estimated: boolean;
};

const HOUR_MS = 3_600_000;
const FETCH_TIMEOUT_MS = 5_000;

/**
 * Returns one row per full UTC hour covering [from, to], fetching and
 * caching missing hours. Never throws on API failure.
 */
export async function ensureWeatherHours(
  from: Date,
  to: Date,
  now: Date,
): Promise<WeatherRow[]> {
  const startMs = hourKeyMs(from);
  const endMs = hourKeyMs(to);
  const wanted: number[] = [];
  for (let h = startMs; h <= endMs; h += HOUR_MS) wanted.push(h);

  // Dev fixture mode: deterministic weather, bypasses cache and API entirely.
  if (dev && devState.weatherFixture) {
    return fixtureWeatherHours(
      devState.weatherFixture,
      new Date(startMs),
      wanted.length,
    ).map((h) => ({ ...h, estimated: false }));
  }

  const cached = await prisma.weatherHour.findMany({
    where: {
      regionId: REGION.id,
      hourUtc: { gte: new Date(startMs), lte: new Date(endMs) },
    },
  });
  const byHour = new Map<number, WeatherRow>();
  for (const row of cached) byHour.set(row.hourUtc.getTime(), row);

  // Missing hours — plus recent/future "estimated" rows we retry to upgrade
  // to live data once the API recovers.
  const retryFromMs = now.getTime() - 2 * HOUR_MS;
  const missing = wanted.filter((h) => {
    const row = byHour.get(h);
    return !row || (row.estimated && h >= retryFromMs);
  });

  if (missing.length > 0) {
    const fetched = await fetchOpenMeteo(new Date(missing[0]), now);
    const upserts: WeatherRow[] = [];
    for (const h of missing) {
      const live = fetched.get(h);
      const row: WeatherRow = live
        ? { hourUtc: new Date(h), ...live, estimated: false }
        : {
            hourUtc: new Date(h),
            ...fallbackWeather(new Date(h), REGION),
            estimated: true,
          };
      byHour.set(h, row);
      upserts.push(row);
    }
    await Promise.all(
      upserts.map((row) =>
        prisma.weatherHour.upsert({
          where: {
            regionId_hourUtc: { regionId: REGION.id, hourUtc: row.hourUtc },
          },
          update: {
            solarWm2: row.solarWm2,
            windMs: row.windMs,
            estimated: row.estimated,
          },
          create: { regionId: REGION.id, ...row },
        }),
      ),
    );
  }

  return wanted.map((h) => byHour.get(h)!);
}

/** Fetches hourly radiation + wind from Open-Meteo. Returns empty map on failure. */
async function fetchOpenMeteo(
  earliest: Date,
  now: Date,
): Promise<Map<number, { solarWm2: number; windMs: number }>> {
  const result = new Map<number, { solarWm2: number; windMs: number }>();
  try {
    const pastDays = Math.min(
      92,
      Math.max(0, Math.ceil((now.getTime() - earliest.getTime()) / 86_400_000)),
    );
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${REGION.latitude}&longitude=${REGION.longitude}` +
      `&hourly=shortwave_radiation,wind_speed_10m&wind_speed_unit=ms&timezone=UTC` +
      `&past_days=${pastDays}&forecast_days=2`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return result;
    const data = (await res.json()) as {
      hourly?: {
        time: string[];
        shortwave_radiation: number[];
        wind_speed_10m: number[];
      };
    };
    const hourly = data.hourly;
    if (!hourly) return result;
    for (let i = 0; i < hourly.time.length; i++) {
      const solarWm2 = hourly.shortwave_radiation[i];
      const windMs = hourly.wind_speed_10m[i];
      if (solarWm2 == null || windMs == null) continue;
      result.set(Date.parse(`${hourly.time[i]}:00Z`), { solarWm2, windMs });
    }
  } catch {
    // API failure — caller falls back to the synthetic curve.
  }
  return result;
}
