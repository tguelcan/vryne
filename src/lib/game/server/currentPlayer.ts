// ---------------------------------------------------------------------------
// Session → player resolution for remote functions. Every remote that touches
// player state MUST go through these guards.
// ---------------------------------------------------------------------------

import { getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { prisma } from "$server/db";

/** Returns the signed-in auth user or fails with 401. */
export function requireUser() {
  const { locals } = getRequestEvent();
  if (!locals.user) error(401, "Sign in required.");
  return locals.user;
}

/** Returns the signed-in user's player id or fails (no grid created yet). */
export async function requirePlayerId(): Promise<string> {
  const user = requireUser();
  const player = await prisma.player.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!player) error(403, "No grid yet — choose a nickname first.");
  return player.id;
}
