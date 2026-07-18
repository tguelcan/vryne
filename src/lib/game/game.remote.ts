// ---------------------------------------------------------------------------
// Vryne remote functions — the ONLY data layer. The UI never touches Prisma.
// query() for reads, command() for mutations, server time is authoritative.
// ---------------------------------------------------------------------------

import { command, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { dev } from "$app/env";
import { z } from "zod";
import { prisma } from "$server/db";
import {
  BUILDING_NAMES,
  BUILDING_ORDER,
  MAX_LEVEL,
  fabricatorMaterialPerHour,
  FABRICATOR_CENTS_PER_MATERIAL,
  XP_PER_KWH_SOLD,
  gridMaxSellWh,
  progressFromXp,
  storageCapacityWh,
  upgradeDurationMs,
  upgradeMaterialCost,
  type BuildingType,
} from "./gameConfig";
import { daylightWindow, hourKeyMs, producerRateW } from "./production";
import { sellRevenueCents } from "./price";
import { upcomingNews } from "./news";
import { gameNow, devState } from "./server/time";
import { requirePlayerId } from "./server/currentPlayer";
import { settlePlayer } from "./server/settle";
import { ensurePriceHours } from "./server/price";
import { ensureHeadline, resolveActiveNews } from "./server/news";

const HOUR_MS = 3_600_000;

/**
 * Full authoritative snapshot. Computes lazy progress, applies finished
 * upgrades, and returns everything the UI needs — including `serverNow` so
 * the client can derive its clock offset. All timestamps are UTC epoch ms.
 */
export const getGameState = query(async () => {
  const now = gameNow();
  const playerId = await requirePlayerId();
  const { player, weather } = await settlePlayer(now, playerId);
  const prices = await ensurePriceHours(
    now,
    new Date(now.getTime() + 24 * HOUR_MS),
    now,
  );

  const region = player.region;
  const currentHourMs = hourKeyMs(now);
  const weatherNow = weather.find(
    (w) => w.hourUtc.getTime() === currentHourMs,
  )!;
  const priceNow = prices.find((p) => p.hourUtc.getTime() === currentHourMs)!;
  const { sunrise, sunset } = daylightWindow(
    now,
    region.latitude,
    region.longitude,
  );

  const byType = new Map(
    player.buildings.map((b) => [b.type as BuildingType, b]),
  );
  const levelOf = (type: BuildingType) => byType.get(type)?.level ?? 1;

  const solarW = byType.has("SOLAR")
    ? producerRateW("SOLAR", levelOf("SOLAR"), weatherNow, region, now)
    : 0;
  const windW = byType.has("WIND")
    ? producerRateW("WIND", levelOf("WIND"), weatherNow, region, now)
    : 0;

  // Stable tile order, independent of DB row order.
  const buildings = [...player.buildings]
    .sort(
      (a, b) =>
        BUILDING_ORDER.indexOf(a.type as BuildingType) -
        BUILDING_ORDER.indexOf(b.type as BuildingType),
    )
    .map((b) => {
      const type = b.type as BuildingType;
      return {
        id: b.id,
        type,
        name: BUILDING_NAMES[type],
        level: b.level,
        upgrade: b.upgradeDoneAt
          ? { doneAtMs: b.upgradeDoneAt.getTime(), targetLevel: b.level + 1 }
          : null,
        next:
          b.level >= MAX_LEVEL
            ? null
            : {
                materialCost: upgradeMaterialCost(type, b.level),
                durationMs: upgradeDurationMs(b.level),
              },
      };
    });

  const forecast = weather
    .filter((w) => w.hourUtc.getTime() >= currentHourMs)
    .slice(0, 24)
    .map((w) => {
      const price = prices.find(
        (p) => p.hourUtc.getTime() === w.hourUtc.getTime(),
      );
      return {
        hourMs: w.hourUtc.getTime(),
        solarWm2: w.solarWm2,
        windMs: w.windMs,
        weatherEstimated: w.estimated,
        priceMilliCents: price?.priceMilliCentsPerKwh ?? 0,
        priceEstimated: price?.estimated ?? true,
      };
    });

  // News: deterministic schedule (or dev simulation), persisted headline text.
  const active = resolveActiveNews(now);
  const upcoming = devState.newsOverride !== null ? null : upcomingNews(now);
  const news = {
    active: active
      ? {
          ...(await ensureHeadline(active)),
          kind: active.kind,
          priceMult: active.priceMult,
          fabricatorMult: active.fabricatorMult,
          endMs: active.endMs,
        }
      : null,
    upcoming: upcoming ? { startMs: upcoming.startMs } : null,
  };
  const effectiveMilliCents = Math.round(
    priceNow.priceMilliCentsPerKwh * (active?.priceMult ?? 1),
  );

  return {
    serverNow: now.getTime(),
    region: { name: region.name },
    buildings,
    resources: {
      energyWh: player.energyWh,
      creditsCents: player.creditsCents,
      material: player.material,
    },
    progress: { xp: player.xp, ...progressFromXp(player.xp) },
    news,
    storage: {
      capacityWh: storageCapacityWh(levelOf("STORAGE")),
      /** Net fill rate right now (W) — for cosmetic client interpolation only. */
      fillRateW: Math.round(solarW + windW),
    },
    rates: {
      solarW: Math.round(solarW),
      windW: Math.round(windW),
      fabricatorPerHour: fabricatorMaterialPerHour(levelOf("FABRICATOR")),
      fabricatorActive: player.creditsCents >= FABRICATOR_CENTS_PER_MATERIAL,
    },
    grid: { maxSellWh: gridMaxSellWh(levelOf("GRID")) },
    weatherNow: {
      solarWm2: weatherNow.solarWm2,
      windMs: weatherNow.windMs,
      estimated: weatherNow.estimated,
      isDaylight: now >= sunrise && now < sunset,
      sunriseMs: sunrise.getTime(),
      sunsetMs: sunset.getTime(),
    },
    priceNow: {
      milliCentsPerKwh: priceNow.priceMilliCentsPerKwh,
      effectiveMilliCents,
      estimated: priceNow.estimated,
    },
    forecast,
    dev: dev
      ? {
          timeOffsetMs: devState.timeOffsetMs,
          weatherFixture: devState.weatherFixture,
          newsOverride: devState.newsOverride,
        }
      : null,
  };
});

/**
 * Sells energy from storage at the current spot price. The grid connection
 * level caps the maximum amount per sell action.
 */
export const sellEnergy = command(
  z.object({ amountWh: z.number().int().min(1) }),
  async ({ amountWh }) => {
    const now = gameNow();
    const playerId = await requirePlayerId();
    const { player } = await settlePlayer(now, playerId);

    const grid = player.buildings.find((b) => b.type === "GRID");
    const maxSellWh = gridMaxSellWh(grid?.level ?? 1);
    if (player.energyWh < 1) error(400, "Storage is empty.");

    const soldWh = Math.min(amountWh, player.energyWh, maxSellWh);
    const prices = await ensurePriceHours(now, now, now);
    // News events modulate the sell price while active.
    const priceMult = resolveActiveNews(now)?.priceMult ?? 1;
    const price = Math.round(prices[0].priceMilliCentsPerKwh * priceMult);
    const revenueCents = sellRevenueCents(soldWh, price);
    const xpGain = Math.floor(soldWh / 1000) * XP_PER_KWH_SOLD;

    await prisma.player.update({
      where: { id: player.id },
      data: {
        energyWh: { decrement: soldWh },
        creditsCents: { increment: revenueCents },
        xp: { increment: xpGain },
      },
    });

    void getGameState().refresh();
    return { soldWh, revenueCents, priceMilliCentsPerKwh: price };
  },
);

/**
 * Starts an upgrade: costs material + real waiting time. Only one upgrade
 * per asset at a time; it completes lazily on a future read.
 */
export const startUpgrade = command(
  z.object({ buildingId: z.string().min(1) }),
  async ({ buildingId }) => {
    const now = gameNow();
    const playerId = await requirePlayerId();
    const { player } = await settlePlayer(now, playerId);

    const building = player.buildings.find((b) => b.id === buildingId);
    if (!building) error(404, "Building not found.");
    if (building.upgradeDoneAt)
      error(400, "An upgrade is already in progress.");
    if (building.level >= MAX_LEVEL) error(400, "Already at maximum level.");

    const type = building.type as BuildingType;
    const cost = upgradeMaterialCost(type, building.level);
    if (player.material < cost)
      error(400, `Not enough material (need ${cost}).`);

    const doneAt = new Date(now.getTime() + upgradeDurationMs(building.level));
    await prisma.$transaction([
      prisma.player.update({
        where: { id: player.id },
        data: { material: { decrement: cost } },
      }),
      prisma.building.update({
        where: { id: buildingId },
        data: { upgradeDoneAt: doneAt },
      }),
    ]);

    void getGameState().refresh();
    return { doneAtMs: doneAt.getTime(), targetLevel: building.level + 1 };
  },
);

export type GameState = Awaited<ReturnType<typeof getGameState>>;
