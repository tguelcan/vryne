// Session data for the shared header (nickname link). Available everywhere.
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals }) => {
  return { user: locals.user };
};
