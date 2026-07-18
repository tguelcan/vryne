// ---------------------------------------------------------------------------
// Pure spot price fallback: a synthetic daily curve with morning and evening
// peaks plus seeded noise. A pure function of the timestamp — computable
// identically on client and server. Used whenever the aWATTar API fails.
// ---------------------------------------------------------------------------

const HOUR_MS = 3_600_000;

/** Base price in milli-cents per kWh (~9 ct/kWh German day-ahead average). */
const BASE_MILLI_CENTS = 9_000;

/** Hour-of-day multipliers: morning peak 7–9, evening peak 18–21, night low. */
const DAY_CURVE = [
  0.55, 0.5, 0.48, 0.5, 0.58, 0.75, 0.95, 1.25, 1.35, 1.15, 1.0, 0.9, 0.85, 0.8,
  0.85, 0.95, 1.1, 1.3, 1.55, 1.6, 1.45, 1.15, 0.9, 0.7,
];

/** Deterministic hash → [0, 1). mulberry32-style, seeded by the epoch hour. */
export function seededUnit(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Synthetic fallback spot price in milli-cents per kWh for the hour
 * containing `timestamp`. Deterministic; noise is seeded by the epoch hour.
 */
export function fallbackPriceMilliCents(timestamp: Date): number {
  const epochHour = Math.floor(timestamp.getTime() / HOUR_MS);
  const hourOfDay = new Date(epochHour * HOUR_MS).getUTCHours();
  const noise = 1 + (seededUnit(epochHour) - 0.5) * 0.2; // ±10 %
  return Math.round(BASE_MILLI_CENTS * DAY_CURVE[hourOfDay] * noise);
}

/** Revenue in cents for selling `amountWh` at `priceMilliCentsPerKwh`. */
export const sellRevenueCents = (
  amountWh: number,
  priceMilliCentsPerKwh: number,
) => Math.round((amountWh * priceMilliCentsPerKwh) / 1_000_000);
