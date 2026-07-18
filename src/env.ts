import { defineEnvVars } from "@sveltejs/kit/hooks";
import { building } from "$app/env";
import { z } from "zod";

export const variables = defineEnvVars({
  DATABASE_URL: {
    description: "PostgreSQL connection string for Prisma",
    schema: building ? z.string().optional() : z.string(),
  },
  VRYNE_TIME_OFFSET_MS: {
    description:
      "Dev-only time travel: initial offset in milliseconds added to gameNow()",
    schema: z.string().optional(),
  },
  GLM_API_KEY: {
    description:
      "GLM (Zhipu) API key for LLM-generated news headlines. Optional — falls back to templates.",
    schema: z.string().optional(),
  },
  GLM_BASE_URL: {
    description: "OpenAI-compatible GLM endpoint base URL",
    schema: z.string().optional(),
  },
  GLM_MODEL: {
    description: "GLM model id for headline generation",
    schema: z.string().optional(),
  },
  BETTER_AUTH_SECRET: {
    description:
      "Better Auth encryption/hashing secret (>= 32 chars, high entropy)",
    schema: building ? z.string().optional() : z.string().min(32),
  },
  BETTER_AUTH_URL: {
    description:
      "Public base URL of the app for Better Auth (e.g. http://localhost:5174)",
    schema: z.string().optional(),
  },
  GOOGLE_CLIENT_ID: {
    description: "Google OAuth client id for social login",
    schema: z.string().optional(),
  },
  GOOGLE_CLIENT_SECRET: {
    description: "Google OAuth client secret for social login",
    schema: z.string().optional(),
  },
  FACEBOOK_CLIENT_ID: {
    description: "Facebook OAuth app id for social login",
    schema: z.string().optional(),
  },
  FACEBOOK_CLIENT_SECRET: {
    description: "Facebook OAuth app secret for social login",
    schema: z.string().optional(),
  },
});
