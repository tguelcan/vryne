<script lang="ts">
  import type { IconSvgElement } from "@hugeicons/svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { fade } from "svelte/transition";

  interface Props {
    name: string;
    size?: number;
    strokeWidth?: number;
  }

  let { name, size = 24, strokeWidth = 1.5 }: Props = $props();
  let icon: IconSvgElement | undefined = $state();

  $effect(() => {
    const currentName = name;
    icon = undefined;
    let cancelled = false;
    import("@hugeicons/core-free-icons").then((mod) => {
      if (!cancelled) {
        icon = (mod as Record<string, IconSvgElement>)[currentName];
      }
    });
    return () => {
      cancelled = true;
    };
  });
</script>

<!-- span, not div: icons must be valid inside <p> (e.g. markdown pages) -->
<span class="inline-flex shrink-0" style="width:{size}px;height:{size}px;">
  {#if icon}
    <span class="inline-flex" transition:fade>
      <HugeiconsIcon {icon} {size} {strokeWidth} color="currentColor" />
    </span>
  {/if}
</span>
