import type { Theme } from "$lib/server/theme";
import type { AppConfig } from "$lib/server/config";
import type { AuthSession, AuthUser } from "$lib/server/auth";
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      theme: Theme;
      app: AppConfig;
      session: AuthSession["session"] | null;
      user: AuthUser | null;
    }
    interface PageData {
      /** From the root layout: the signed-in user (or null). */
      user?: AuthUser | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
