<script lang="ts">
  // Weather: current conditions plus the next 24 h as stroke rows.
  import Icon from "$components/elements/Icon.svelte";
  import StrokeRow from "./StrokeRow.svelte";
  import { hourLabel } from "$lib/game/format";

  type ForecastHour = {
    hourMs: number;
    solarWm2: number;
    windMs: number;
    weatherEstimated: boolean;
  };

  type Props = {
    solarWm2: number;
    windMs: number;
    estimated: boolean;
    forecast: ForecastHour[];
  };

  let { solarWm2, windMs, estimated, forecast }: Props = $props();
</script>

<section class="border-base-content rounded-box border p-3 text-sm">
  <div class="flex items-baseline justify-between">
    <span>WEATHER</span>
    <span class="text-base-content/50 text-xs">
      {solarWm2} W/m² · {windMs} m/s
      {estimated ? "~" : ""}
    </span>
  </div>
  <div class="text-base-content/50 mt-2 flex items-center gap-1 text-xs">
    <Icon name="Sun03Icon" size={12} /> solar
  </div>
  <StrokeRow
    values={forecast.map((f) => f.solarWm2)}
    muted={forecast.map((f) => f.weatherEstimated)}
    labels={forecast.map(
      (f) =>
        `${hourLabel(f.hourMs)} · ${Math.round(f.solarWm2)} W/m²${f.weatherEstimated ? " ~" : ""}`,
    )}
    highlightIndex={0}
    height="h-10"
  />
  <div class="text-base-content/50 mt-2 flex items-center gap-1 text-xs">
    <Icon name="FastWindIcon" size={12} /> wind (cutoff at 20 m/s)
  </div>
  <StrokeRow
    values={forecast.map((f) => f.windMs)}
    max={25}
    muted={forecast.map((f) => f.weatherEstimated || f.windMs >= 20)}
    labels={forecast.map(
      (f) =>
        `${hourLabel(f.hourMs)} · ${f.windMs} m/s${f.windMs >= 20 ? " — cutoff" : ""}${f.weatherEstimated ? " ~" : ""}`,
    )}
    highlightIndex={0}
    height="h-10"
  />
</section>
