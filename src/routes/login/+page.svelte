<script lang="ts">
  import Button from "$components/elements/Button.svelte";
  import { authClient } from "$lib/auth-client";

  let { data } = $props();

  let pending = $state<"google" | "facebook" | null>(null);
  let message = $state("");

  async function signIn(provider: "google" | "facebook") {
    pending = provider;
    message = "";
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: "/",
    });
    if (error) {
      message = error.message ?? "Sign-in failed. Please try again.";
      pending = null;
    }
  }
</script>

<svelte:head><title>Sign in · Vryne</title></svelte:head>

<main class="mx-auto flex w-full max-w-xs flex-1 flex-col justify-center gap-4">
  <h2 class="text-sm tracking-widest">RUN YOUR OWN GRID</h2>
  <p class="text-base-content/50 text-xs">
    Vryne is a cozy idle game: solar, wind and storage — driven by the real
    weather over your home town and real electricity prices. Produce while
    you're away, sell at the right moment, climb the leaderboard.
  </p>

  <Button
    block
    color="neutral"
    type="button"
    loading={pending === "google"}
    disabled={pending !== null || !data.providers.google}
    onclick={() => void signIn("google")}
  >
    Continue with Google
  </Button>
  <Button
    block
    color="neutral"
    type="button"
    loading={pending === "facebook"}
    disabled={pending !== null || !data.providers.facebook}
    onclick={() => void signIn("facebook")}
  >
    Continue with Facebook
  </Button>

  {#if !data.providers.facebook || !data.providers.google}
    <p class="text-base-content/50 text-xs">
      Greyed-out providers aren't configured on this server.
    </p>
  {/if}

  {#if message}
    <p class="text-error text-xs">{message}</p>
  {/if}

  <p class="text-base-content/50 text-xs">
    By signing in you agree to our <a class="underline" href="/terms">terms</a>
    and <a class="underline" href="/privacy">privacy policy</a>. We only use
    your account to sign you in — no posts, no contacts.
  </p>
</main>
