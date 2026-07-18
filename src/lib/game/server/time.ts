// ---------------------------------------------------------------------------
// Server time: the single source of truth. ALL game logic reads "now" from
// gameNow() — never from `new Date()` directly. In dev, an offset enables
// time travel (env var VRYNE_TIME_OFFSET_MS and/or the dev panel).
// ---------------------------------------------------------------------------

import { dev } from "$app/env";
import { VRYNE_TIME_OFFSET_MS } from "$app/env/private";
import type { WeatherFixtureName } from "../fixtures";
import type { NewsKind } from "../news";

/** Dev-only news simulation: null = live schedule, "none" = suppress events. */
export type NewsOverride = NewsKind | "none";

/** In-memory dev state. Ignored entirely in production builds. */
export const devState = {
  timeOffsetMs: dev ? Number(VRYNE_TIME_OFFSET_MS ?? 0) || 0 : 0,
  /** When set (dev only), the weather service serves this fixture. */
  weatherFixture: null as WeatherFixtureName | null,
  /** When set (dev only), overrides the deterministic news schedule. */
  newsOverride: null as NewsOverride | null,
};

/** Authoritative server time (UTC). */
export function gameNow(): Date {
  return new Date(Date.now() + (dev ? devState.timeOffsetMs : 0));
}
