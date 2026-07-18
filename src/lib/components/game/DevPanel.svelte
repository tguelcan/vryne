<script lang="ts">
  // Dev panel — dev builds only. Time travel, resources, weather fixtures,
  // player reset. All actions are guarded remote commands.
  import Button from "$components/elements/Button.svelte";
  import Icon from "$components/elements/Icon.svelte";
  import {
    devAdvanceTime,
    devResetPlayer,
    devSetNewsOverride,
    devSetResources,
    devSetWeatherFixture,
  } from "$lib/game/dev.remote";
  import { WEATHER_FIXTURE_NAMES } from "$lib/game/fixtures";

  type NewsOverrideOption =
    | "live"
    | "none"
    | "PRICE_SURGE"
    | "PRICE_DROP"
    | "FABRICATOR_BOOST"
    | "FABRICATOR_SLOWDOWN";

  const NEWS_OPTIONS: { value: NewsOverrideOption; label: string }[] = [
    { value: "live", label: "live" },
    { value: "none", label: "none" },
    { value: "PRICE_SURGE", label: "price+" },
    { value: "PRICE_DROP", label: "price-" },
    { value: "FABRICATOR_BOOST", label: "fab+" },
    { value: "FABRICATOR_SLOWDOWN", label: "fab-" },
  ];

  type Props = {
    timeOffsetMs: number;
    weatherFixture: string | null;
    newsOverride: string | null;
  };

  let { timeOffsetMs, weatherFixture, newsOverride }: Props = $props();

  let busy = $state(false);

  async function run(action: () => Promise<unknown>) {
    busy = true;
    try {
      await action();
    } finally {
      busy = false;
    }
  }

  const offsetLabel = $derived(
    timeOffsetMs === 0 ? "+0" : `+${(timeOffsetMs / 3_600_000).toFixed(1)}h`,
  );
</script>

<section
  class="border-base-content rounded-box border border-dashed p-3 text-xs"
>
  <div class="flex items-baseline justify-between">
    <span class="flex items-center gap-1"
      ><Icon name="Settings01Icon" size={12} /> DEV PANEL</span
    >
    <span class="text-base-content/50">offset {offsetLabel}</span>
  </div>

  <div class="mt-2 flex flex-wrap gap-2">
    <span class="self-center">time:</span>
    {#each [["+15m", 900_000], ["+1h", 3_600_000], ["+6h", 21_600_000], ["+1d", 86_400_000]] as [label, ms] (label)}
      <Button
        type="button"
        size="sm"
        color="outline"
        disabled={busy}
        ariaLabel="Advance time {label}"
        onclick={() => run(() => devAdvanceTime({ ms: Number(ms) }))}
      >
        {label}
      </Button>
    {/each}
  </div>

  <div class="mt-2 flex flex-wrap gap-2">
    <span class="self-center">weather:</span>
    {#each ["live", ...WEATHER_FIXTURE_NAMES] as fixture (fixture)}
      <Button
        type="button"
        size="sm"
        color={(weatherFixture ?? "live") === fixture ? "neutral" : "outline"}
        disabled={busy}
        ariaLabel="Set weather fixture {fixture}"
        onclick={() =>
          run(() =>
            devSetWeatherFixture({
              fixture: fixture as
                "live" | (typeof WEATHER_FIXTURE_NAMES)[number],
            }),
          )}
      >
        {fixture}
      </Button>
    {/each}
  </div>

  <div class="mt-2 flex flex-wrap gap-2">
    <span class="self-center">news:</span>
    {#each NEWS_OPTIONS as option (option.value)}
      <Button
        type="button"
        size="sm"
        color={(newsOverride ?? "live") === option.value ? "neutral" : "outline"}
        disabled={busy}
        ariaLabel="Set news simulation {option.label}"
        onclick={() =>
          run(() => devSetNewsOverride({ override: option.value }))}
      >
        {option.label}
      </Button>
    {/each}
  </div>

  <div class="mt-2 flex flex-wrap gap-2">
    <span class="self-center">resources:</span>
    <Button
      type="button"
      size="sm"
      color="outline"
      disabled={busy}
      ariaLabel="Add 100 credits"
      onclick={() => run(() => devSetResources({ creditsCents: 100_000 }))}
    >
      credits=1000
    </Button>
    <Button
      type="button"
      size="sm"
      color="outline"
      disabled={busy}
      ariaLabel="Set material to 500"
      onclick={() => run(() => devSetResources({ material: 500 }))}
    >
      mat=500
    </Button>
    <Button
      type="button"
      size="sm"
      color="outline"
      disabled={busy}
      ariaLabel="Empty storage"
      onclick={() => run(() => devSetResources({ energyWh: 0 }))}
    >
      energy=0
    </Button>
    <Button
      type="button"
      size="sm"
      color="outline"
      disabled={busy}
      ariaLabel="Reset player"
      onclick={() => run(() => devResetPlayer())}
    >
      reset player
    </Button>
  </div>
</section>
