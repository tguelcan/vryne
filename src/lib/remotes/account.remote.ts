// ---------------------------------------------------------------------------
// Account remotes: nickname + home location (chosen once before playing;
// nickname changeable in the profile), profile data, and the XP leaderboard.
// ---------------------------------------------------------------------------

import { form, query } from "$app/server";
import { invalid, redirect } from "@sveltejs/kit";
import { z } from "zod";
import { prisma } from "$server/db";
import { requireUser } from "$lib/game/server/currentPlayer";
import {
  createDefaultPlayer,
  ensureRegionForPlace,
} from "$lib/game/defaultPlayer";
import { geocodePlace } from "$lib/game/server/geocode";
import { gameNow } from "$lib/game/server/time";
import { progressFromXp } from "$lib/game/gameConfig";

export const setNickname = form(
  z.object({
    nickname: z
      .string()
      .trim()
      .min(3, "At least 3 characters.")
      .max(20, "At most 20 characters.")
      .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, digits, - and _."),
    // Only required (and shown) during onboarding, when no player exists yet.
    location: z.string().trim().max(80).optional(),
  }),
  async ({ nickname, location }, issue) => {
    const user = requireUser();

    const taken = await prisma.user.findFirst({
      where: {
        nickname: { equals: nickname, mode: "insensitive" },
        NOT: { id: user.id },
      },
      select: { id: true },
    });
    if (taken) invalid(issue.nickname("This nickname is already taken."));

    await prisma.user.update({
      where: { id: user.id },
      data: { nickname },
    });

    // First time here: resolve the home region and create the player grid.
    const player = await prisma.player.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!player) {
      if (!location || location.length < 2)
        invalid(issue.location("Enter a town or city, e.g. Braunschweig."));
      const place = await geocodePlace(location);
      if (!place)
        invalid(
          issue.location("Couldn't find this place — try a nearby city."),
        );
      const regionId = await ensureRegionForPlace(prisma, place);
      await createDefaultPlayer(prisma, gameNow(), user.id, regionId);
    }

    redirect(303, "/");
  },
);

/** Profile data: identity, progress, and current leaderboard rank. */
export const getProfile = query(async () => {
  const user = requireUser();
  const player = await prisma.player.findUnique({
    where: { userId: user.id },
    select: { xp: true, createdAt: true },
  });

  let rank: number | null = null;
  if (player) {
    rank =
      1 +
      (await prisma.player.count({
        where: {
          userId: { not: null },
          OR: [
            { xp: { gt: player.xp } },
            { xp: player.xp, createdAt: { lt: player.createdAt } },
          ],
        },
      }));
  }

  return {
    nickname: user.nickname ?? null,
    email: user.email,
    createdAtMs: player?.createdAt.getTime() ?? null,
    xp: player?.xp ?? 0,
    progress: progressFromXp(player?.xp ?? 0),
    rank,
    totalPlayers: await prisma.player.count({
      where: { userId: { not: null } },
    }),
  };
});

const LEADERBOARD_SIZE = 50;

/** Top players by XP plus the caller's own rank (ties broken by seniority). */
export const getLeaderboard = query(async () => {
  const user = requireUser();

  const top = await prisma.player.findMany({
    where: { userId: { not: null } },
    orderBy: [{ xp: "desc" }, { createdAt: "asc" }],
    take: LEADERBOARD_SIZE,
    select: {
      userId: true,
      xp: true,
      user: { select: { nickname: true } },
      region: { select: { name: true } },
    },
  });

  const me = await prisma.player.findUnique({
    where: { userId: user.id },
    select: { xp: true, createdAt: true },
  });
  let myRank: number | null = null;
  if (me) {
    myRank =
      1 +
      (await prisma.player.count({
        where: {
          userId: { not: null },
          OR: [
            { xp: { gt: me.xp } },
            { xp: me.xp, createdAt: { lt: me.createdAt } },
          ],
        },
      }));
  }

  return {
    entries: top.map((p, i) => ({
      rank: i + 1,
      nickname: p.user?.nickname ?? "anonymous",
      region: p.region.name,
      xp: p.xp,
      level: progressFromXp(p.xp).level,
      me: p.userId === user.id,
    })),
    myRank,
    myXp: me?.xp ?? 0,
    totalPlayers: await prisma.player.count({
      where: { userId: { not: null } },
    }),
  };
});
