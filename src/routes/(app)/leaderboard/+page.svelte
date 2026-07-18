<script lang="ts">
  import { getLeaderboard } from "$remotes/account.remote";

  const leaderboard = getLeaderboard();
  const lb = $derived(leaderboard.current);
</script>

<svelte:head><title>Leaderboard · Vryne</title></svelte:head>

<main class="flex flex-col gap-4">
  <h2 class="text-sm tracking-widest">LEADERBOARD</h2>

  {#if !lb}
    <p class="text-base-content/50 text-sm">loading ranks…</p>
  {:else}
    {#if lb.myRank}
      <p class="text-base-content/50 text-xs">
        you are rank #{lb.myRank} of {lb.totalPlayers} · {lb.myXp} xp
      </p>
    {/if}

    <table class="text-xs">
      <thead>
        <tr class="text-base-content/50 text-left">
          <th class="py-1 pr-4 font-normal">#</th>
          <th class="py-1 pr-4 font-normal">nickname</th>
          <th class="py-1 pr-4 font-normal max-sm:hidden">region</th>
          <th class="py-1 pr-4 font-normal">lv</th>
          <th class="py-1 text-right font-normal">xp</th>
        </tr>
      </thead>
      <tbody>
        {#each lb.entries as e (e.rank)}
          <tr class={e.me ? "bg-base-200" : ""}>
            <td class="py-1 pr-4">{e.rank}</td>
            <td class="py-1 pr-4">{e.nickname}{e.me ? " ← you" : ""}</td>
            <td class="text-base-content/50 py-1 pr-4 max-sm:hidden">{e.region}</td>
            <td class="py-1 pr-4">{e.level}</td>
            <td class="py-1 text-right">{e.xp}</td>
          </tr>
        {/each}
      </tbody>
    </table>

    {#if lb.myRank && lb.myRank > lb.entries.length}
      <p class="text-base-content/50 text-xs">
        … and you at #{lb.myRank}. Sell more energy to climb.
      </p>
    {/if}
  {/if}
</main>
