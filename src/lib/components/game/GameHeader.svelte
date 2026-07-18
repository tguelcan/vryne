<script lang="ts">
  // Title, weather glyph, overall level + XP bar, and the production pulse
  // line with the current total collection rate.
  import { Tween } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import Icon from "$components/elements/Icon.svelte";
  import ScanLine from "./ScanLine.svelte";

  type Props = {
    nickname: string;
    regionName: string;
    timeLabel: string;
    weatherIcon: string;
    progress: {
      level: number;
      title: string;
      xp: number;
      xpIntoLevel: number;
      xpForNext: number | null;
    };
    /** Current total production rate in watts (drives the pulse speed). */
    fillRateW: number;
  };

  let {
    nickname,
    regionName,
    timeLabel,
    weatherIcon,
    progress,
    fillRateW,
  }: Props = $props();

  const xpPct = $derived(
    progress.xpForNext !== null
      ? Math.min(100, (progress.xpIntoLevel / progress.xpForNext) * 100)
      : 100,
  );
  const xpTween = Tween.of(() => xpPct, { duration: 600, easing: cubicOut });

  // Knight-Rider scan speed ∝ production rate; standstill at 0 W.
  const scanSpeed = $derived(Math.min(24, fillRateW / 100));
</script>

<header>
  <!-- Nickname (→ profile) + overall level, weather/region/time on the right -->
  <div class="flex items-baseline justify-between text-xs">
    <span>
      <a href="/profile" class="hover:underline">{nickname}</a>
      · LV{progress.level} · {progress.title}
    </span>
    <span class="text-base-content/50 flex items-center gap-2">
      <Icon name={weatherIcon} size={16} />
      {regionName} · {timeLabel}
    </span>
  </div>

  <!-- Thin XP progress bar -->
  <div class="mt-2 flex justify-end text-xs">
    <span class="text-base-content/50">
      {progress.xpForNext === null
        ? `${progress.xp} xp · max`
        : `${progress.xpIntoLevel}/${progress.xpForNext} xp`}
    </span>
  </div>
  <div class="bg-base-300 mt-1 h-0.5 w-full rounded-full">
    <div
      class="bg-base-content h-full rounded-full"
      style="width: {xpTween.current}%"
    ></div>
  </div>

  <!-- Production pulse + current total collection rate -->
  <div class="mt-2 flex items-center gap-3">
    <ScanLine speed={scanSpeed} class="min-w-0 flex-1" />
    <span class="flex shrink-0 items-center gap-1 text-xs">
      <Icon name="FlashIcon" size={12} />
      {fillRateW > 0 ? `+${fillRateW} W` : "0 W"}
    </span>
  </div>
</header>
