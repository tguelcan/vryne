<script lang="ts">
  // Spot price: current value plus the next 24 h as a vertical stroke row.
  import Icon from "$components/elements/Icon.svelte";
  import StrokeRow from "./StrokeRow.svelte";
  import { hourLabel } from "$lib/game/format";

  type ForecastHour = {
    hourMs: number;
    priceMilliCents: number;
    priceEstimated: boolean;
  };

  type Props = {
    priceMilliCents: number;
    /** News-modified price actually paid on sells (equals spot when no event). */
    effectiveMilliCents?: number;
    estimated: boolean;
    forecast: ForecastHour[];
  };

  let {
    priceMilliCents,
    effectiveMilliCents = priceMilliCents,
    estimated,
    forecast,
  }: Props = $props();

  const centsPerKwh = (milli: number) => (milli / 1000).toFixed(2);
  const values = $derived(forecast.map((f) => f.priceMilliCents));
  const muted = $derived(forecast.map((f) => f.priceEstimated));
  const labels = $derived(
    forecast.map(
      (f) =>
        `${hourLabel(f.hourMs)} · ${centsPerKwh(f.priceMilliCents)} ct${f.priceEstimated ? " ~" : ""}`,
    ),
  );
  const peak = $derived(
    forecast.reduce(
      (best, f) => (f.priceMilliCents > best.priceMilliCents ? f : best),
      forecast[0],
    ),
  );

  // Trend vs. the NEXT hour (the player plans with the forecast):
  // up = price will rise (good time to wait), down = will fall.
  const trend = $derived.by(() => {
    if (forecast.length < 2) return "flat";
    const now = forecast[0].priceMilliCents;
    const next = forecast[1].priceMilliCents;
    if (now === 0) return "flat";
    const delta = (next - now) / Math.abs(now);
    return delta > 0.02 ? "up" : delta < -0.02 ? "down" : "flat";
  });
</script>

<section class="border-base-content rounded-box flex flex-col border p-3">
  <div class="flex items-baseline justify-between">
    <span class="flex items-center gap-1 text-sm">
      <Icon name="ChartLineData01Icon" size={14} />
      SPOT PRICE
    </span>
    <span class="flex items-center gap-1 text-lg">
      {#if effectiveMilliCents !== priceMilliCents}
        <s class="text-muted text-sm">{centsPerKwh(priceMilliCents)}</s>
        {centsPerKwh(effectiveMilliCents)} ct/kWh{estimated ? " ~" : ""}
      {:else}
        {centsPerKwh(priceMilliCents)} ct/kWh{estimated ? " ~" : ""}
      {/if}
      <!-- Next-hour trend caret with a plain explanation on hover -->
      {#if trend === "up"}
        <span
          class="tooltip tooltip-left"
          data-tip="Price is expected to rise next hour — waiting may pay off"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            class="caret-up text-green-600"
            aria-label="price rising next hour"
          >
            <path
              d="M2 8 L6 4 L10 8"
              stroke="currentColor"
              stroke-width="1.5"
              fill="none"
            />
          </svg>
        </span>
      {:else if trend === "down"}
        <span
          class="tooltip tooltip-left"
          data-tip="Price is expected to fall next hour — selling now may be better"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            class="caret-down text-orange-500"
            aria-label="price falling next hour"
          >
            <path
              d="M2 4 L6 8 L10 4"
              stroke="currentColor"
              stroke-width="1.5"
              fill="none"
            />
          </svg>
        </span>
      {:else}
        <span
          class="tooltip tooltip-left"
          data-tip="Price is expected to stay flat next hour"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            class="text-base-content/40"
            aria-label="price steady next hour"
          >
            <path
              d="M2 6 L10 6"
              stroke="currentColor"
              stroke-width="1.5"
              fill="none"
            />
          </svg>
        </span>
      {/if}
    </span>
  </div>
  {#if forecast.length > 0}
    <StrokeRow
      {values}
      {muted}
      {labels}
      highlightIndex={0}
      height="h-24"
      class="mt-auto pt-2"
    />
    <div class="text-muted mt-1 flex justify-between text-xs">
      <span>now</span>
      {#if peak}
        <span
          >peak {centsPerKwh(peak.priceMilliCents)} at {hourLabel(
            peak.hourMs,
          )}</span
        >
      {/if}
      <span>+24h</span>
    </div>
  {/if}
</section>

<style>
  .caret-up {
    animation: nudge-up 1.4s ease-in-out infinite;
  }
  .caret-down {
    animation: nudge-down 1.4s ease-in-out infinite;
  }
  @keyframes nudge-up {
    0%,
    100% {
      transform: translateY(1px);
      opacity: 0.6;
    }
    50% {
      transform: translateY(-1px);
      opacity: 1;
    }
  }
  @keyframes nudge-down {
    0%,
    100% {
      transform: translateY(-1px);
      opacity: 0.6;
    }
    50% {
      transform: translateY(1px);
      opacity: 1;
    }
  }
</style>
