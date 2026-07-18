<script lang="ts">
  // One asset: glyph, level, live stat line, and the upgrade action.
  import AssetGlyph from "./AssetGlyph.svelte";
  import Button from "$components/elements/Button.svelte";
  import type { BuildingType } from "$lib/game/gameConfig";

  type Props = {
    type: BuildingType;
    name: string;
    level: number;
    /** Live stat, e.g. "412 W" or "10.0 mat/h". */
    stat: string;
    /** Secondary detail line, e.g. "cutoff >= 20 m/s". */
    detail?: string;
    /** Remaining upgrade time, formatted — null when no upgrade running. */
    upgradeCountdown?: string | null;
    upgradeTargetLevel?: number | null;
    /** Next upgrade offer — null at max level. */
    next?: { materialCost: number; durationLabel: string } | null;
    canAfford?: boolean;
    busy?: boolean;
    loading?: boolean;
    onUpgrade?: () => void;
  };

  let {
    type,
    name,
    level,
    stat,
    detail,
    upgradeCountdown = null,
    upgradeTargetLevel = null,
    next = null,
    canAfford = false,
    busy = false,
    loading = false,
    onUpgrade,
  }: Props = $props();
</script>

<div class="border-base-content rounded-box flex flex-col gap-2 border p-3">
  <div class="flex items-start justify-between">
    <AssetGlyph {type} size={36} />
    <span class="text-xs">LV{level}</span>
  </div>
  <div class="text-sm">{name}</div>
  <div class="text-lg">{stat}</div>
  {#if detail}
    <div class="text-muted text-xs">{detail}</div>
  {/if}

  {#if upgradeCountdown !== null}
    <div class="border-base-content border-t pt-2 text-xs">
      &gt; LV{upgradeTargetLevel} in {upgradeCountdown}
    </div>
  {:else if next}
    <Button
      type="button"
      size="sm"
      class="btn-outline mt-auto"
      disabled={!canAfford || busy}
      {loading}
      onclick={onUpgrade}
      ariaLabel="Upgrade {name} to level {level + 1}"
    >
      LV{level + 1} — {next.materialCost} mat / {next.durationLabel}
    </Button>
  {:else}
    <div class="text-muted text-xs">max level</div>
  {/if}
</div>
