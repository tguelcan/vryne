<script lang="ts">
  // Sell energy to the grid at the current spot price.
  import Button from "$components/elements/Button.svelte";
  import Icon from "$components/elements/Icon.svelte";
  import { kwh } from "$lib/game/format";

  type SellAction = "quarter" | "max";

  type Props = {
    maxSellWh: number;
    energyNowWh: number;
    busy: boolean;
    sellAction: SellAction | null;
    message: string;
    onSell: (amountWh: number, action: SellAction) => void;
  };

  let { maxSellWh, energyNowWh, busy, sellAction, message, onSell }: Props =
    $props();
</script>

<section class="border-base-content rounded-box border p-3">
  <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
    <span class="flex items-center gap-1">
      <Icon name="ElectricTower01Icon" size={14} />
      SELL — max {kwh(Math.min(maxSellWh, energyNowWh))} kWh/action
    </span>
    <div class="flex gap-2">
      <Button
        type="button"
        size="sm"
        class="btn-outline"
        icon="DiscountIcon"
        disabled={busy || energyNowWh < 1}
        loading={sellAction === "quarter"}
        ariaLabel="Sell a quarter of storage"
        onclick={() => onSell(Math.floor(energyNowWh / 4), "quarter")}
      >
        sell 25%
      </Button>
      <Button
        type="button"
        size="sm"
        class="btn-neutral"
        icon="CoinsDollarIcon"
        disabled={busy || energyNowWh < 1}
        loading={sellAction === "max"}
        ariaLabel="Sell the maximum amount"
        onclick={() =>
          onSell(Math.floor(Math.min(maxSellWh, energyNowWh)), "max")}
      >
        sell max
      </Button>
    </div>
  </div>
  {#if message}
    <p class="text-muted mt-2 text-xs">{message}</p>
  {/if}
</section>
