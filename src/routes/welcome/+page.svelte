<script lang="ts">
  import Button from "$components/elements/Button.svelte";
  import { setNickname } from "$remotes/account.remote";
</script>

<svelte:head><title>Set up your grid · Vryne</title></svelte:head>

<main class="mx-auto flex w-full max-w-xs flex-1 flex-col justify-center gap-4">
  <h2 class="text-sm tracking-widest">SET UP YOUR GRID</h2>

  <form {...setNickname} class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <p class="text-muted text-xs">
        Your public handle on the leaderboard. 3–20 characters: letters, digits,
        - and _.
      </p>
      <input
        {...setNickname.fields.nickname.as("text")}
        class="input"
        placeholder="nickname"
        autocomplete="off"
        maxlength={20}
      />
      {#each setNickname.fields.nickname.issues() ?? [] as issue (issue.message)}
        <p class="text-error text-xs">{issue.message}</p>
      {/each}
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-muted text-xs">
        Your home town decides your real weather — sun and wind from your area
        power your grid. Only a coarse ~150 km region is stored, never the exact
        place. Set once.
      </p>
      <input
        {...setNickname.fields.location.as("text")}
        class="input"
        placeholder="home town, e.g. Braunschweig"
        autocomplete="off"
        maxlength={80}
      />
      {#each setNickname.fields.location.issues() ?? [] as issue (issue.message)}
        <p class="text-error text-xs">{issue.message}</p>
      {/each}
    </div>

    <Button block color="neutral" loading={setNickname.pending > 0}>
      Start your grid
    </Button>
  </form>
</main>
