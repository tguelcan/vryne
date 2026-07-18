<script lang="ts">
  // Storage level as a stack of horizontal strokes (1 stroke = value/strokeCount),
  // growing bottom-up. Strokes and lines only.
  type Props = {
    value: number;
    max: number;
    strokeCount?: number;
    class?: string;
  };

  let { value, max, strokeCount = 32, class: className = "" }: Props = $props();

  const ratio = $derived(max > 0 ? Math.min(1, Math.max(0, value / max)) : 0);
  const filledStrokes = $derived(Math.floor(ratio * strokeCount));
  const partialWidth = $derived(
    Math.round((ratio * strokeCount - filledStrokes) * 100),
  );
</script>

<div
  class="flex h-full w-full flex-col-reverse justify-start gap-0.75 {className}"
  role="meter"
  aria-valuenow={value}
  aria-valuemin={0}
  aria-valuemax={max}
>
  {#each Array(strokeCount), i (i)}
    {#if i < filledStrokes}
      <div class="bg-base-content h-0.5 w-full"></div>
    {:else if i === filledStrokes && partialWidth > 0}
      <div class="h-0.5">
        <div
          class="bg-base-content h-full"
          style="width: {partialWidth}%"
        ></div>
      </div>
    {:else}
      <div class="bg-base-300 h-0.5 w-full"></div>
    {/if}
  {/each}
</div>
