<script lang="ts">
  // News tile: LLM-generated headline for a deterministically scheduled
  // event that modulates the game (spot price / fabricator rate).
  type Props = {
    headline: string | null;
    effectLabel: string | null;
    remaining: string | null;
    upcomingIn: string | null;
  };

  let { headline, effectLabel, remaining, upcomingIn }: Props = $props();
</script>

<div class="border-base-content rounded-box flex flex-col gap-2 border p-3">
  <div class="flex items-start justify-between">
    <svg
      width="36"
      height="36"
      viewBox="0 0 40 40"
      stroke="currentColor"
      stroke-width="1.5"
      fill="none"
      aria-hidden="true"
    >
      <rect x="4" y="8" width="32" height="24" />
      <line x1="8" y1="14" x2="26" y2="14" />
      <line x1="8" y1="20" x2="32" y2="20" />
      <line x1="8" y1="26" x2="22" y2="26" />
    </svg>
    <span class="text-xs">NEWS</span>
  </div>
  {#if headline}
    <div class="animate-fade-in text-sm" aria-live="polite">{headline}</div>
    {#if effectLabel}
      <div class="text-lg">{effectLabel}</div>
    {/if}
    {#if remaining}
      <div class="text-muted text-xs">ends in {remaining}</div>
    {/if}
  {:else}
    <div class="text-sm">No disruptions</div>
    <div class="text-muted text-xs">
      {upcomingIn ? `next event in ${upcomingIn}` : "grid running steady"}
    </div>
  {/if}
</div>
