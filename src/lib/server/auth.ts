// ---------------------------------------------------------------------------
// Better Auth server instance. Social logins only (Google, Facebook) — no
// email/password. `nickname` is a custom user field, chosen once after the
// first sign-in and never writable through the auth API itself.
// ---------------------------------------------------------------------------

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import {
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET,
} from "$app/env/private";
import { prisma } from "$server/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: GOOGLE_CLIENT_ID ?? "",
      clientSecret: GOOGLE_CLIENT_SECRET ?? "",
    },
    facebook: {
      clientId: FACEBOOK_CLIENT_ID ?? "",
      clientSecret: FACEBOOK_CLIENT_SECRET ?? "",
    },
  },
  user: {
    additionalFields: {
      // Managed by the welcome flow (Prisma), not by auth API input.
      nickname: { type: "string", required: false, input: false },
    },
  },
  advanced: {
    // Behind Railway's proxy the client IP arrives via X-Forwarded-For;
    // without this, rate limiting falls back to one shared bucket.
    ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
  },
  plugins: [sveltekitCookies(getRequestEvent)],
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = AuthSession["user"];
