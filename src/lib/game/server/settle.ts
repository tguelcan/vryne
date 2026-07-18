// ---------------------------------------------------------------------------
// Lazy settlement: NO cron jobs, NO ticks. All progress is computed
// deterministically from timestamps on read and persisted atomically.
// Finished upgrades are applied on the next read.
// ---------------------------------------------------------------------------

import { error } from "@sveltejs/kit";
import { prisma } from "$server/db";
import {
  FABRICATOR_CENTS_PER_MATERIAL,
  storageCapacityWh,
  upgradeMaterialCost,
  type BuildingType,
} from "../gameConfig";
import {
  applyToStorage,
  computeFabrication,
  computeProduction,
} from "../production";
import type { RegionData, WeatherHourData } from "../production";
import { resolveNewsWindows } from "./news";
import { ensureWeatherHours, type WeatherRow } from "./weather";

const HOUR_MS = 3_600_000;
/**
 * Settlement lookback cap. Storage fills up long before this, so nothing of
 * value is lost; it bounds weather-cache work after very long absences.
 */
const LOOKBACK_MS = 30 * 86_400_000;

type LoadedPlayer = NonNullable<Awaited<ReturnType<typeof loadPlayer>>>;

function loadPlayer(playerId: string) {
  return prisma.player.findUnique({
    where: { id: playerId },
    include: { buildings: true, region: true },
  });
}

export type SettledState = {
  player: LoadedPlayer;
  /** Weather rows covering [settleStart, now + 24 h]. */
  weather: WeatherRow[];
  now: Date;
};

/**
 * Applies finished upgrades, integrates production since each building's
 * lastSettledAt, caps at free storage (overflow is lost permanently), runs
 * the fabricator, and persists everything. Returns the fresh state.
 */
export async function settlePlayer(
  now: Date,
  playerId: string,
): Promise<SettledState> {
  const player = await loadPlayer(playerId);
  if (!player) throw error(404, "Player not found.");

  const region: RegionData = player.region;
  const settleFloor = now.getTime() - LOOKBACK_MS;
  // lastSettledAt can lie in the FUTURE relative to this process (the dev
  // time-travel offset is per process, persisted timestamps are not — e.g.
  // after a dev-server restart). Clamp so the weather range always covers
  // the current hour; production math already yields 0 for inverted windows.
  const earliest = Math.max(
    settleFloor,
    Math.min(
      now.getTime(),
      ...player.buildings.map((b) => b.lastSettledAt.getTime()),
    ),
  );
  const weather = await ensureWeatherHours(
    player.region,
    new Date(earliest),
    new Date(now.getTime() + 24 * HOUR_MS),
    now,
  );
  const weatherHours: WeatherHourData[] = weather;

  let energyWh = player.energyWh;
  let material = player.material;
  let creditsCents = player.creditsCents;
  let xp = player.xp;

  type BuildingUpdate = {
    id: string;
    level: number;
    upgradeDoneAt: Date | null;
    lastSettledAt: Date;
    remainderMilli: number;
  };
  const updates = new Map<string, BuildingUpdate>();

  // Never move lastSettledAt backwards — a future timestamp (see clamp note
  // above) stays put until real time catches up, preventing double production.
  const settledAt = (b: { lastSettledAt: Date }) =>
    now > b.lastSettledAt ? now : b.lastSettledAt;

  // Resolve upgrade completion per building: [from, doneAt] at the old level,
  // [doneAt, now] at the new one. Finished upgrades award their material cost
  // as XP.
  const resolved = player.buildings.map((b) => {
    const from = new Date(Math.max(b.lastSettledAt.getTime(), settleFloor));
    const upgradeFinished = b.upgradeDoneAt !== null && b.upgradeDoneAt <= now;
    if (upgradeFinished) {
      xp += upgradeMaterialCost(b.type as BuildingType, b.level);
    }
    const segments: { from: Date; to: Date; level: number }[] = upgradeFinished
      ? [
          { from, to: b.upgradeDoneAt!, level: b.level },
          { from: b.upgradeDoneAt!, to: now, level: b.level + 1 },
        ]
      : [{ from, to: now, level: b.level }];
    return {
      building: b,
      segments,
      newLevel: upgradeFinished ? b.level + 1 : b.level,
      newUpgradeDoneAt: upgradeFinished ? null : b.upgradeDoneAt,
    };
  });

  // Storage capacity: if the storage upgrade just finished, the whole window
  // uses the new capacity (simplification in the player's favor).
  const storage = resolved.find((r) => r.building.type === "STORAGE");
  const capacityWh = storageCapacityWh(storage?.newLevel ?? 1);

  // Producers: solar first, then wind — deterministic overflow order.
  for (const type of ["SOLAR", "WIND"] as const) {
    const r = resolved.find((x) => x.building.type === type);
    if (!r) continue;
    let potentialWh = 0;
    for (const seg of r.segments) {
      potentialWh += computeProduction(
        { type, level: seg.level },
        weatherHours,
        seg.from,
        seg.to,
        region,
      );
    }
    const totalMilli =
      r.building.remainderMilli + Math.round(potentialWh * 1000);
    const wholeWh = Math.floor(totalMilli / 1000);
    const { storedWh, lostWh } = applyToStorage(energyWh, capacityWh, wholeWh);
    energyWh += storedWh;
    updates.set(r.building.id, {
      id: r.building.id,
      level: r.newLevel,
      upgradeDoneAt: r.newUpgradeDoneAt,
      lastSettledAt: settledAt(r.building),
      // Full storage: overflow (and its remainder) is lost permanently.
      remainderMilli: lostWh > 0 ? 0 : totalMilli % 1000,
    });
  }

  // Fabricator: credits → material, always progressing while credits last.
  // News events modulate the rate — segments are split at event boundaries.
  const fab = resolved.find((r) => r.building.type === "FABRICATOR");
  if (fab) {
    let remainderMilli = fab.building.remainderMilli;
    for (const seg of fab.segments) {
      for (const sub of splitByNews(seg.from, seg.to)) {
        const r = computeFabrication(
          seg.level,
          creditsCents,
          FABRICATOR_CENTS_PER_MATERIAL,
          remainderMilli,
          sub.from,
          sub.to,
          sub.fabricatorMult,
        );
        material += r.material;
        creditsCents -= r.creditsSpentCents;
        remainderMilli = r.remainderMilli;
      }
    }
    updates.set(fab.building.id, {
      id: fab.building.id,
      level: fab.newLevel,
      upgradeDoneAt: fab.newUpgradeDoneAt,
      lastSettledAt: settledAt(fab.building),
      remainderMilli,
    });
  }

  // Storage and grid: no lazy production, but upgrades still complete.
  for (const r of resolved) {
    if (updates.has(r.building.id)) continue;
    updates.set(r.building.id, {
      id: r.building.id,
      level: r.newLevel,
      upgradeDoneAt: r.newUpgradeDoneAt,
      lastSettledAt: settledAt(r.building),
      remainderMilli: r.building.remainderMilli,
    });
  }

  await prisma.$transaction([
    prisma.player.update({
      where: { id: player.id },
      data: { energyWh, material, creditsCents, xp },
    }),
    ...[...updates.values()].map(({ id, ...data }) =>
      prisma.building.update({ where: { id }, data }),
    ),
  ]);

  const fresh = await loadPlayer(player.id);
  return { player: fresh!, weather, now };
}

/** Splits [from, to] into sub-intervals with the fabricator multiplier active there. */
function splitByNews(
  from: Date,
  to: Date,
): { from: Date; to: Date; fabricatorMult: number }[] {
  const events = resolveNewsWindows(from, to).filter(
    (e) => e.fabricatorMult !== 1,
  );
  if (events.length === 0) return [{ from, to, fabricatorMult: 1 }];

  const cuts = new Set<number>([from.getTime(), to.getTime()]);
  for (const e of events) {
    if (e.startMs > from.getTime() && e.startMs < to.getTime())
      cuts.add(e.startMs);
    if (e.endMs > from.getTime() && e.endMs < to.getTime()) cuts.add(e.endMs);
  }
  const sorted = [...cuts].sort((a, b) => a - b);
  const parts: { from: Date; to: Date; fabricatorMult: number }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const mid = (sorted[i] + sorted[i + 1]) / 2;
    const active = events.find((e) => mid >= e.startMs && mid < e.endMs);
    parts.push({
      from: new Date(sorted[i]),
      to: new Date(sorted[i + 1]),
      fabricatorMult: active?.fabricatorMult ?? 1,
    });
  }
  return parts;
}
