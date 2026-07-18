// ---------------------------------------------------------------------------
// Dev panel commands. Guarded: every command throws 403 in production.
// ---------------------------------------------------------------------------

import { command } from "$app/server";
import { error } from "@sveltejs/kit";
import { dev } from "$app/env";
import { z } from "zod";
import { prisma } from "$server/db";
import { WEATHER_FIXTURE_NAMES } from "./fixtures";
import { gameNow, devState } from "./server/time";
import { requirePlayerId, requireUser } from "./server/currentPlayer";
import { createDefaultPlayer, deletePlayer } from "./defaultPlayer";
import { getGameState } from "./game.remote";

function guard() {
  if (!dev) error(403, "Dev commands are disabled in production.");
}

/** Time travel: fast-forward the authoritative server clock (forward only). */
export const devAdvanceTime = command(
  z.object({
    ms: z
      .number()
      .int()
      .min(1)
      .max(365 * 86_400_000),
  }),
  async ({ ms }) => {
    guard();
    devState.timeOffsetMs += ms;
    void getGameState().refresh();
  },
);

export const devSetWeatherFixture = command(
  z.object({ fixture: z.enum(["live", ...WEATHER_FIXTURE_NAMES]) }),
  async ({ fixture }) => {
    guard();
    devState.weatherFixture = fixture === "live" ? null : fixture;
    void getGameState().refresh();
  },
);

/** Simulate news situations: "live" = real schedule, "none" = suppress events. */
export const devSetNewsOverride = command(
  z.object({
    override: z.enum([
      "live",
      "none",
      "PRICE_SURGE",
      "PRICE_DROP",
      "FABRICATOR_BOOST",
      "FABRICATOR_SLOWDOWN",
    ]),
  }),
  async ({ override }) => {
    guard();
    devState.newsOverride = override === "live" ? null : override;
    void getGameState().refresh();
  },
);

export const devSetResources = command(
  z.object({
    creditsCents: z.number().int().min(0).optional(),
    material: z.number().int().min(0).optional(),
    energyWh: z.number().int().min(0).optional(),
  }),
  async (data) => {
    guard();
    const playerId = await requirePlayerId();
    await prisma.player.update({ where: { id: playerId }, data });
    void getGameState().refresh();
  },
);

/** Deletes and re-seeds the current user's player. Keeps time offset & region. */
export const devResetPlayer = command(async () => {
  guard();
  const user = requireUser();
  const old = await prisma.player.findUnique({
    where: { userId: user.id },
    select: { regionId: true },
  });
  await deletePlayer(prisma, user.id);
  await createDefaultPlayer(prisma, gameNow(), user.id, old?.regionId);
  void getGameState().refresh();
});
