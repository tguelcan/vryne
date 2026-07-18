<script lang="ts">
  import Button from "$components/elements/Button.svelte";
  import { authClient } from "$lib/auth-client";
  import { getProfile, setNickname } from "$remotes/account.remote";
  import { goto } from "$app/navigation";

  const profile = getProfile();
  const p = $derived(profile.current);

  let signingOut = $state(false);

  async function signOut() {
    signingOut = true;
    await authClient.signOut();
    await goto("/login", { invalidateAll: true });
  }
</script>

<svelte:head><title>Profile · Vryne</title></svelte:head>

<main class="flex flex-col gap-6">
  {#if !p}
    <p class="text-base-content/50 text-sm">loading profile…</p>
  {:else}
    <section class="flex flex-col gap-1">
      <h2 class="text-sm tracking-widest">PROFILE</h2>
      <p class="text-lg">{p.nickname}</p>
      <p class="text-base-content/50 text-xs">{p.email}</p>
      {#if p.createdAtMs}
        <p class="text-base-content/50 text-xs">
          grid online since {new Date(p.createdAtMs).toISOString().slice(0, 10)}
        </p>
      {/if}
    </section>

    <section class="flex flex-col gap-1 text-xs">
      <p>LV{p.progress.level} · {p.progress.title}</p>
      <p class="text-base-content/50">{p.xp} xp</p>
      {#if p.rank}
        <p class="text-base-content/50">
          rank <a class="underline" href="/leaderboard">#{p.rank}</a> of {p.totalPlayers}
        </p>
      {/if}
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="text-base-content/50 text-xs tracking-widest">CHANGE NICKNAME</h3>
      <form {...setNickname} class="flex max-w-xs flex-col gap-2">
        <input
          {...setNickname.fields.nickname.as("text")}
          class="input w-full bg-base-200"
          placeholder={p.nickname ?? "nickname"}
          autocomplete="off"
          maxlength={20}
        />
        {#each setNickname.fields.nickname.issues() ?? [] as issue (issue.message)}
          <p class="text-error text-xs">{issue.message}</p>
        {/each}
        <Button color="neutral" size="sm" loading={setNickname.pending > 0}>
          Save
        </Button>
      </form>
    </section>

    <section>
      <Button
        color="neutral"
        size="sm"
        type="button"
        loading={signingOut}
        onclick={() => void signOut()}
      >
        Sign out
      </Button>
    </section>
  {/if}
</main>
