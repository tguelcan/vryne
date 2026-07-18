import { redirect, type Handle } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/env";
import { BETTER_AUTH_URL } from "$app/env/private";
import { auth } from "$lib/server/auth";
import { loadTheme, themeToCssVars } from "$lib/server/theme";
import { loadApp } from "$lib/server/config";

export const handle: Handle = async ({ event, resolve }) => {
  // Canonical host: OAuth state cookies are host-bound, so serving the app
  // on aliases (www., *.up.railway.app) breaks the callback ("state not
  // found"). Redirect everything to the BETTER_AUTH_URL origin.
  const EXEMPT_HOSTS = new Set([
    "localhost",
    "127.0.0.1",
    // Railway's internal healthcheck must get a 200, not a redirect.
    "healthcheck.railway.app",
  ]);
  if (!building && BETTER_AUTH_URL) {
    const canonical = new URL(BETTER_AUTH_URL);
    if (
      !EXEMPT_HOSTS.has(event.url.hostname) &&
      event.url.host !== canonical.host
    ) {
      redirect(
        308,
        `${canonical.origin}${event.url.pathname}${event.url.search}`,
      );
    }
  }

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
