// Nickname gate: signed in, but only reachable while no nickname is set.
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) redirect(303, "/login");
  if (locals.user.nickname) redirect(303, "/");
  return {};
};
