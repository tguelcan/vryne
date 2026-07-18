<script lang="ts">
  // Pure line glyphs — strokes only, no icons, no fills.
  import type { BuildingType } from "$lib/game/gameConfig";

  type Props = { type: BuildingType; size?: number; class?: string };

  let { type, size = 40, class: className = "" }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 40 40"
  class={className}
  stroke="currentColor"
  stroke-width="1.5"
  fill="none"
  aria-hidden="true"
>
  {#if type === "SOLAR"}
    <!-- Diagonal hatching in a frame -->
    <rect x="4" y="4" width="32" height="32" />
    <line x1="4" y1="14" x2="14" y2="4" />
    <line x1="4" y1="24" x2="24" y2="4" />
    <line x1="4" y1="34" x2="34" y2="4" />
    <line x1="14" y1="36" x2="36" y2="14" />
    <line x1="24" y1="36" x2="36" y2="24" />
  {:else if type === "WIND"}
    <!-- Stroke-Y -->
    <line x1="20" y1="36" x2="20" y2="18" />
    <line x1="20" y1="18" x2="8" y2="6" />
    <line x1="20" y1="18" x2="32" y2="6" />
  {:else if type === "STORAGE"}
    <!-- Horizontal stroke stack -->
    <rect x="6" y="4" width="28" height="32" />
    <line x1="10" y1="30" x2="30" y2="30" />
    <line x1="10" y1="24" x2="30" y2="24" />
    <line x1="10" y1="18" x2="30" y2="18" />
  {:else if type === "GRID"}
    <!-- Pylon lines -->
    <line x1="12" y1="36" x2="12" y2="6" />
    <line x1="28" y1="36" x2="28" y2="6" />
    <line x1="4" y1="12" x2="36" y2="12" />
    <line x1="8" y1="22" x2="32" y2="22" />
  {:else}
    <!-- Fabricator: crosshatch -->
    <rect x="4" y="4" width="32" height="32" />
    <line x1="4" y1="20" x2="20" y2="4" />
    <line x1="4" y1="36" x2="36" y2="4" />
    <line x1="20" y1="36" x2="36" y2="20" />
    <line x1="4" y1="4" x2="36" y2="36" />
  {/if}
</svg>
