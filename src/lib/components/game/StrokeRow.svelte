<script lang="ts">
  // A row of vertical strokes (barcode look) — used for the 24 h price and
  // weather forecast. Height encodes the value; the current hour is accented.
  // Strokes distribute across the full width; hovering reveals the value.
  type Props = {
    values: number[];
    max?: number;
    /** Indices rendered muted (e.g. "estimated" hours). */
    muted?: boolean[];
    highlightIndex?: number;
    /** Optional hover labels, one per value (e.g. "18:00 · 12.34 ct"). */
    labels?: string[];
    /** Tailwind height class for the row. */
    height?: string;
    class?: string;
  };

  let {
    values,
    max,
    muted = [],
    highlightIndex = -1,
    labels = [],
    height = "h-16",
    class: className = "",
  }: Props = $props();

  const effectiveMax = $derived(max ?? Math.max(1, ...values));
  const heights = $derived(
    values.map((v) =>
      Math.max(4, Math.round((Math.max(0, v) / effectiveMax) * 100)),
    ),
  );

  let hovered = $state(-1);
</script>

<div
  class="relative flex {height} w-full items-end {className}"
  role="img"
  aria-label="value chart"
  onmouseleave={() => (hovered = -1)}
>
  {#if hovered >= 0 && labels[hovered]}
    <span
      class="bg-base-100 text-muted pointer-events-none absolute -top-1 right-0 z-10 px-1 text-xs"
    >
      {labels[hovered]}
    </span>
  {/if}
  {#each heights as h, i (i)}
    <!-- Wide invisible hitbox, thin visible stroke -->
    <div
      class="flex h-full flex-1 items-end justify-center"
      role="presentation"
      onmouseenter={() => (hovered = i)}
    >
      <div
        class="w-0.75 {i === highlightIndex
          ? 'bg-primary'
          : 'bg-base-content'} {muted[i] &&
        i !== highlightIndex &&
        hovered !== i
          ? 'opacity-30'
          : ''}"
        style="height: {h}%"
      ></div>
    </div>
  {/each}
</div>
