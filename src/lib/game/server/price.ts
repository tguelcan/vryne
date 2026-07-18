// ---------------------------------------------------------------------------
// Spot price service: real German day-ahead prices via aWATTar (free, no
// key), cached per full UTC hour like the weather. Fallback: synthetic daily
// curve — a pure function of the timestamp.
// ---------------------------------------------------------------------------

import { prisma } from "$server/db";
import { hourKeyMs } from "../production";
import { fallbackPriceMilliCents } from "../price";

export type PriceRow = {
  hourUtc: Date;
  priceMilliCentsPerKwh: number;
  estimated: boolean;
};

const HOUR_MS = 3_600_000;
const FETCH_TIMEOUT_MS = 5_000;

/** Returns one price row per full UTC hour covering [from, to]. Never throws. */
export async function ensurePriceHours(
  from: Date,
  to: Date,
  now: Date,
): Promise<PriceRow[]> {
  const startMs = hourKeyMs(from);
  const endMs = hourKeyMs(to);
  const wanted: number[] = [];
  for (let h = startMs; h <= endMs; h += HOUR_MS) wanted.push(h);

  const cached = await prisma.priceHour.findMany({
    where: { hourUtc: { gte: new Date(startMs), lte: new Date(endMs) } },
  });
  const byHour = new Map<number, PriceRow>();
  for (const row of cached) byHour.set(row.hourUtc.getTime(), row);

  const retryFromMs = now.getTime() - 2 * HOUR_MS;
  const missing = wanted.filter((h) => {
    const row = byHour.get(h);
    return !row || (row.estimated && h >= retryFromMs);
  });

  if (missing.length > 0) {
    const fetched = await fetchAwattar(
      new Date(missing[0]),
      new Date(endMs + HOUR_MS),
    );
    const upserts: PriceRow[] = [];
    for (const h of missing) {
      const live = fetched.get(h);
      const row: PriceRow =
        live != null
          ? {
              hourUtc: new Date(h),
              priceMilliCentsPerKwh: live,
              estimated: false,
            }
          : {
              hourUtc: new Date(h),
              priceMilliCentsPerKwh: fallbackPriceMilliCents(new Date(h)),
              estimated: true,
            };
      byHour.set(h, row);
      upserts.push(row);
    }
    await Promise.all(
      upserts.map((row) =>
        prisma.priceHour.upsert({
          where: { hourUtc: row.hourUtc },
          update: {
            priceMilliCentsPerKwh: row.priceMilliCentsPerKwh,
            estimated: row.estimated,
          },
          create: row,
        }),
      ),
    );
  }

  return wanted.map((h) => byHour.get(h)!);
}

/** Fetches day-ahead prices from aWATTar. EUR/MWh → milli-cents/kWh (×100). */
async function fetchAwattar(
  from: Date,
  to: Date,
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  try {
    const url = `https://api.awattar.de/v1/marketdata?start=${from.getTime()}&end=${to.getTime()}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return result;
    const data = (await res.json()) as {
      data?: { start_timestamp: number; marketprice: number }[];
    };
    for (const entry of data.data ?? []) {
      result.set(entry.start_timestamp, Math.round(entry.marketprice * 100));
    }
  } catch {
    // API failure — caller falls back to the synthetic curve.
  }
  return result;
}
