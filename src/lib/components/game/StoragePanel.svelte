<script lang="ts">
  // Storage: the level IS a stack of strokes, growing in real time.
  import Icon from "$components/elements/Icon.svelte";
  import StrokeStack from "./StrokeStack.svelte";
  import { kwh, kwh3 } from "$lib/game/format";

  type Props = {
    energyNowWh: number;
    capacityWh: number;
    fillRateW: number;
    full: boolean;
  };

  let { energyNowWh, capacityWh, fillRateW, full }: Props = $props();
</script>

<section class="border-base-content rounded-box border p-3">
  <div class="flex items-baseline justify-between text-sm">
    <span class="flex items-center gap-1">
      <Icon
        name={full ? "BatteryFullIcon" : "BatteryCharging01Icon"}
        size={14}
      />
      STORAGE
    </span>
    <span class={full ? "text-error" : ""}>
      {kwh3(energyNowWh)} / {kwh(capacityWh)} kWh
      {full ? "— FULL, production lost" : `· +${fillRateW} W`}
    </span>
  </div>
  <div class="mt-2 h-24">
    <StrokeStack value={energyNowWh} max={capacityWh} strokeCount={32} />
  </div>
</section>
