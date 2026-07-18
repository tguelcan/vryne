import type { Handle } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/env";
import { auth } from "$lib/server/auth";
import { loadTheme, themeToCssVars } from "$lib/server/theme";
import { loadApp } from "$lib/server/config";

export const handle: Handle = async ({ event, resolve }) => {
  const theme = loadTheme();
  const app = loadApp();
  const cssVars = themeToCssVars(theme);

  event.locals.theme = theme;
  event.locals.app = app;

  // Better Auth session → locals (available to load functions and remotes).
  const session = building
    ? null
    : await auth.api.getSession({ headers: event.request.headers });
  event.locals.session = session?.session ?? null;
  event.locals.user = session?.user ?? null;

  return svelteKitHandler({
    event,
    auth,
    building,
    resolve: () =>
      resolve(event, {
        transformPageChunk: ({ html }) =>
          html
            .replace("%app.name%", app.name)
            .replace("%theme.style%", `<style>:root{${cssVars}}</style>`),
      }),
  });
};
