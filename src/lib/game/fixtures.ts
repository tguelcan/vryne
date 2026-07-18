// ---------------------------------------------------------------------------
// Deterministic weather fixtures for tests and UI development, so nothing
// ever depends on the live API. Each fixture is a 24 h hour-of-day pattern.
// ---------------------------------------------------------------------------

import sunnyDay from "./fixtures/sunny-day.json";
import stormDay from "./fixtures/storm-day.json";
import darkDoldrums from "./fixtures/dark-doldrums.json";
import type { WeatherHourData } from "./production";

export type WeatherFixtureName = "sunny-day" | "storm-day" | "dark-doldrums";

type FixtureEntry = { hour: number; solarWm2: number; windMs: number };

export const WEATHER_FIXTURES: Record<WeatherFixtureName, FixtureEntry[]> = {
  "sunny-day": sunnyDay,
  "storm-day": stormDay,
  "dark-doldrums": darkDoldrums,
};

export const WEATHER_FIXTURE_NAMES = Object.keys(
  WEATHER_FIXTURES,
) as WeatherFixtureName[];

/**
 * Materializes a fixture into absolute weather hours: `count` consecutive
 * hours starting at `fromHourUtc` (must be a full UTC hour), with values
 * looked up by hour-of-day.
 */
export function fixtureWeatherHours(
  name: WeatherFixtureName,
  fromHourUtc: Date,
  count: number,
): WeatherHourData[] {
  const pattern = WEATHER_FIXTURES[name];
  const hours: WeatherHourData[] = [];
  for (let i = 0; i < count; i++) {
    const hourUtc = new Date(fromHourUtc.getTime() + i * 3_600_000);
    const entry = pattern[hourUtc.getUTCHours()];
    hours.push({ hourUtc, solarWm2: entry.solarWm2, windMs: entry.windMs });
  }
  return hours;
}
