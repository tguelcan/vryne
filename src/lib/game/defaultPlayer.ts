// ---------------------------------------------------------------------------
// Creates regions and fresh players (with starter buildings) for auth users.
// Shared by the welcome flow, the seed script, and the dev-panel reset
// command. Regions are coarse geohash cells: nearby players share one region
// (and its weather cache).
// ---------------------------------------------------------------------------

import type { PrismaClient } from "../../generated/prisma/client";
import { BUILDING_ORDER, REGION, STARTING_RESOURCES } from "./gameConfig";
import {
  geohashCellCenter,
  geohashEncode,
  REGION_GEOHASH_PRECISION,
} from "./geo";

type Db = Pick<PrismaClient, "region" | "player" | "building">;

export async function ensureRegion(db: Db) {
  await db.region.upsert({
    where: { id: REGION.id },
    update: {
      name: REGION.name,
      latitude: REGION.latitude,
      longitude: REGION.longitude,
      avgSolarWm2: REGION.avgSolarWm2,
      avgWindMs: REGION.avgWindMs,
    },
    create: {
      id: REGION.id,
      name: REGION.name,
      latitude: REGION.latitude,
      longitude: REGION.longitude,
      avgSolarWm2: REGION.avgSolarWm2,
      avgWindMs: REGION.avgWindMs,
    },
  });
}

/**
 * Finds or creates the geohash-cell region for a place. The cell (~156 km)
 * is deliberately coarse: only its center — never the exact place — is
 * stored, and everyone in the cell shares weather. The first player in a
 * cell names it after their place.
 */
export async function ensureRegionForPlace(
  db: Db,
  place: { name: string; latitude: number; longitude: number },
): Promise<string> {
  const id = geohashEncode(
    place.latitude,
    place.longitude,
    REGION_GEOHASH_PRECISION,
  );
  const center = geohashCellCenter(id);
  await db.region.upsert({
    where: { id },
    update: {},
    create: {
      id,
      name: place.name,
      latitude: center.latitude,
      longitude: center.longitude,
      avgSolarWm2: REGION.avgSolarWm2,
      avgWindMs: REGION.avgWindMs,
    },
  });
  return id;
}

export async function createDefaultPlayer(
  db: Db,
  now: Date,
  userId: string,
  regionId?: string,
) {
  if (!regionId) await ensureRegion(db);

  await db.player.create({
    data: {
      userId,
      regionId: regionId ?? REGION.id,
      creditsCents: STARTING_RESOURCES.creditsCents,
      material: STARTING_RESOURCES.material,
      energyWh: STARTING_RESOURCES.energyWh,
      buildings: {
        create: BUILDING_ORDER.map((type) => ({
          type,
          level: 1,
          lastSettledAt: now,
        })),
      },
    },
  });
}

export async function deletePlayer(db: Db, userId: string) {
  // Buildings cascade via the relation.
  await db.player.deleteMany({ where: { userId } });
}
