<script lang="ts">
  // Knight-Rider-style dotted line: a bright head with a fading trail sweeps
  // left to right. Sweep speed is proportional to the current production
  // rate — at 0 W the line stands still and dim. Purely cosmetic.
  type Props = {
    /** Dots per second the head advances. 0 = standstill. */
    speed: number;
    class?: string;
  };

  let { speed, class: className = "" }: Props = $props();

  const DOTS = 48;
  const TRAIL = 10;

  let pos = $state(0);

  $effect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      // `speed` is read untracked inside the frame loop on purpose.
      pos = (pos + dt * speed) % DOTS;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });

  const head = $derived(Math.floor(pos));
  const opacityFor = (i: number) => {
    if (speed <= 0) return 0.15;
    const distance = (head - i + DOTS) % DOTS;
    return distance < TRAIL ? Math.max(0.15, 1 - distance / TRAIL) : 0.15;
  };
</script>

<div class="flex w-full justify-between {className}" aria-hidden="true">
  {#each Array(DOTS), i (i)}
    <div class="bg-base-content h-1 w-1" style="opacity: {opacityFor(i)}"></div>
  {/each}
</div>
