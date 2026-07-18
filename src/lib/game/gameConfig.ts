// ---------------------------------------------------------------------------
// Vryne static game configuration.
// ALL level values, costs, rates, and build times live here — never in the DB.
// This module is pure TypeScript: no SvelteKit or Prisma imports, so it can be
// used by the seed script, unit tests, server code, and the client alike.
// ---------------------------------------------------------------------------

export type BuildingType = "SOLAR" | "WIND" | "STORAGE" | "GRID" | "FABRICATOR";

/** Phase 1: region is a seeded constant (coordinates rounded to ~0.5°). */
export const REGION = {
  id: "de-braunschweig",
  name: "Braunschweig",
  latitude: 52.5,
  longitude: 10.5,
  /** Long-term average daytime shortwave radiation (W/m²), for normalization. */
  avgSolarWm2: 320,
  /** Long-term average wind speed at 10 m (m/s), for normalization. */
  avgWindMs: 4.0,
} as const;

/** Wind assets produce NOTHING at wind speeds >= this cutoff (m/s). */
export const STORM_CUTOFF_WIND_MS = 20;

/** Fairness normalization clamp: factor = value / regional average. */
export const WEATHER_FACTOR_MIN = 0.2;
export const WEATHER_FACTOR_MAX = 1.8;

export const MAX_LEVEL = 10;

/** Starting resources for a fresh player (credits in cents). */
export const STARTING_RESOURCES = {
  creditsCents: 1_000,
  material: 50,
  energyWh: 0,
} as const;

const pow = (base: number, growth: number, level: number) =>
  Math.round(base * growth ** (level - 1));

/** Solar base production rate in watts at weather factor 1.0. */
export const solarRateW = (level: number) => pow(1_000, 1.5, level);

/** Wind base production rate in watts at weather factor 1.0. */
export const windRateW = (level: number) => pow(700, 1.5, level);

/** Storage capacity in watt-hours. The only energy store in the game. */
export const storageCapacityWh = (level: number) => pow(5_000, 2, level);

/** Grid connection: maximum watt-hours sellable per sell action. */
export const gridMaxSellWh = (level: number) => pow(2_000, 2, level);

/** Fabricator: material produced per hour (fractional, remainder is carried). */
export const fabricatorMaterialPerHour = (level: number) =>
  10 * 1.5 ** (level - 1);

/** Fabricator: credits cost per unit of material (cents). */
export const FABRICATOR_CENTS_PER_MATERIAL = 5;

const UPGRADE_BASE_MATERIAL: Record<BuildingType, number> = {
  SOLAR: 25,
  WIND: 25,
  STORAGE: 20,
  GRID: 30,
  FABRICATOR: 15,
};

/** Material cost to upgrade from `currentLevel` to `currentLevel + 1`. */
export const upgradeMaterialCost = (type: BuildingType, currentLevel: number) =>
  pow(UPGRADE_BASE_MATERIAL[type], 2, currentLevel);

/** Real waiting time to upgrade from `currentLevel` (LV1→2 = 15 min, ×2 per level). */
export const upgradeDurationMs = (currentLevel: number) =>
  15 * 60_000 * 2 ** (currentLevel - 1);

export const BUILDING_ORDER: BuildingType[] = [
  "SOLAR",
  "WIND",
  "STORAGE",
  "GRID",
  "FABRICATOR",
];

export const BUILDING_NAMES: Record<BuildingType, string> = {
  SOLAR: "Solar Array",
  WIND: "Wind Turbine",
  STORAGE: "Storage Bank",
  GRID: "Grid Connection",
  FABRICATOR: "Fabricator",
};

// ---------------------------------------------------------------------------
// Player progression: XP, levels, status badges
// ---------------------------------------------------------------------------

export const MAX_PLAYER_LEVEL = 10;

/** XP per kWh sold to the grid. */
export const XP_PER_KWH_SOLD = 1;

/** Status badge unlocked at each level (index = level - 1). */
export const STATUS_TITLES = [
  "Tinkerer",
  "Hobbyist",
  "Technician",
  "Engineer",
  "Operator",
  "Grid Runner",
  "Load Balancer",
  "Power Broker",
  "Grid Architect",
  "Energy Baron",
] as const;

/** Total XP required to reach `level` (level 1 = 0 XP). */
export const xpThreshold = (level: number) => 100 * (2 ** (level - 1) - 1);

export function progressFromXp(xp: number) {
  let level = 1;
  while (level < MAX_PLAYER_LEVEL && xp >= xpThreshold(level + 1)) level++;
  const current = xpThreshold(level);
  const next = level < MAX_PLAYER_LEVEL ? xpThreshold(level + 1) : null;
  return {
    level,
    title: STATUS_TITLES[level - 1],
    xpIntoLevel: xp - current,
    xpForNext: next === null ? null : next - current,
  };
}
