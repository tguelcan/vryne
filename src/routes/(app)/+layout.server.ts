// Game area guard: must be signed in AND have a nickname before playing.
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals }) => {
  if (!locals.user) redirect(303, "/login");
  if (!locals.user.nickname) redirect(303, "/welcome");
  return {};
};
