import { redirect } from "@sveltejs/kit";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET,
} from "$app/env/private";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) redirect(303, "/");
  // Buttons for providers without credentials are disabled in the UI.
  return {
    providers: {
      google: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
      facebook: !!(FACEBOOK_CLIENT_ID && FACEBOOK_CLIENT_SECRET),
    },
  };
};
