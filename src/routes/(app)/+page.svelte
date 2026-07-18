<script lang="ts">
  import { Tween } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { page } from "$app/state";
  import AssetCard from "$components/game/AssetCard.svelte";
  import DevPanel from "$components/game/DevPanel.svelte";
  import GameHeader from "$components/game/GameHeader.svelte";
  import NewsCard from "$components/game/NewsCard.svelte";
  import PriceBar from "$components/game/PriceBar.svelte";
  import ResourceTile from "$components/game/ResourceTile.svelte";
  import SellPanel from "$components/game/SellPanel.svelte";
  import StoragePanel from "$components/game/StoragePanel.svelte";
  import WeatherPanel from "$components/game/WeatherPanel.svelte";
  import {
    getGameState,
    sellEnergy,
    startUpgrade,
  } from "$lib/game/game.remote";
  import type { BuildingType } from "$lib/game/gameConfig";
  import { FABRICATOR_CENTS_PER_MATERIAL } from "$lib/game/gameConfig";
  import {
    countdown,
    credits,
    durationLabel,
    kwh,
    kwh3,
    timeLabel,
  } from "$lib/game/format";
  import { clickSound, sellSound, upgradeSound } from "$lib/game/sound";

  const gameState = getGameState();
  const s = $derived(gameState.current);

  // --- Server time is authoritative: derive a clock offset per response ----
  let clientNowMs = $state(Date.now());
  const clockOffsetMs = $derived(s ? s.serverNow - Date.now() : 0);
  const gameNowMs = $derived(clientNowMs + clockOffsetMs);

  $effect(() => {
    // 4 Hz keeps the Wh-level digits visibly moving; server stays authoritative.
    const tick = setInterval(() => (clientNowMs = Date.now()), 250);
    const refresh = setInterval(() => void gameState.refresh(), 60_000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  });

  // --- Cosmetic interpolation between reads (server recomputes on next call)
  const elapsedH = $derived(
    s ? Math.max(0, gameNowMs - s.serverNow) / 3_600_000 : 0,
  );
  const energyNowWh = $derived(
    s
      ? Math.min(
          s.storage.capacityWh,
          s.resources.energyWh + s.storage.fillRateW * elapsedH,
        )
      : 0,
  );
  const storageFull = $derived(s ? energyNowWh >= s.storage.capacityWh : false);

  // Fabricator runs continuously — interpolate material/credits cosmetically
  // too, limited by affordable credits. The server stays authoritative.
  const fabGain = $derived.by(() => {
    if (!s || !s.rates.fabricatorActive) return 0;
    const byTime = s.rates.fabricatorPerHour * elapsedH;
    const byCredits = s.resources.creditsCents / FABRICATOR_CENTS_PER_MATERIAL;
    return Math.min(byTime, byCredits);
  });
  const materialNow = $derived((s?.resources.material ?? 0) + fabGain);
  const creditsNowCents = $derived(
    Math.max(
      0,
      (s?.resources.creditsCents ?? 0) -
        fabGain * FABRICATOR_CENTS_PER_MATERIAL,
    ),
  );

  // --- Animated numbers (svelte/motion) ------------------------------------
  const tweenOpts = { duration: 600, easing: cubicOut };
  const creditsTween = Tween.of(() => creditsNowCents, tweenOpts);
  const materialTween = Tween.of(() => materialNow, tweenOpts);
  const energyTween = Tween.of(() => energyNowWh, {
    duration: 900,
    easing: cubicOut,
  });

  // --- News helpers ---------------------------------------------------------
  const newsEffectLabel = $derived.by(() => {
    const a = s?.news.active;
    if (!a) return null;
    const mult = a.priceMult !== 1 ? a.priceMult : a.fabricatorMult;
    const target = a.priceMult !== 1 ? "spot price" : "fabricator";
    const pct = Math.round((mult - 1) * 100);
    return `${target} ${pct > 0 ? "+" : ""}${pct}%`;
  });

  // --- Formatting ----------------------------------------------------------
  const cd = (doneAtMs: number) => countdown(doneAtMs, gameNowMs);

  // Current conditions → a single plain weather glyph (hugeicons).
  const weatherIcon = $derived.by(() => {
    if (!s) return "CloudIcon";
    const w = s.weatherNow;
    if (w.windMs >= 20) return "CloudAngledZapIcon"; // storm cutoff
    if (w.windMs >= 12) return "FastWindIcon";
    if (!w.isDaylight) return "Moon02Icon";
    if (w.solarWm2 >= 160) return "Sun03Icon";
    return "SunCloud02Icon";
  });

  const statFor = (type: BuildingType) => {
    if (!s) return "";
    switch (type) {
      case "SOLAR":
        return `${s.rates.solarW} W`;
      case "WIND":
        return `${s.rates.windW} W`;
      case "STORAGE":
        return `${kwh(s.storage.capacityWh)} kWh cap`;
      case "GRID":
        return `${kwh(s.grid.maxSellWh)} kWh/sell`;
      case "FABRICATOR":
        return `${s.rates.fabricatorPerHour.toFixed(1)} mat/h`;
    }
  };

  const detailFor = (type: BuildingType) => {
    if (!s) return undefined;
    switch (type) {
      case "SOLAR":
        return s.weatherNow.isDaylight ? "daylight" : "night — offline";
      case "WIND":
        return s.weatherNow.windMs >= 20
          ? "STORM CUTOFF"
          : `${s.weatherNow.windMs} m/s`;
      case "STORAGE":
        return storageFull ? "FULL — production is lost" : undefined;
      case "GRID":
        return undefined;
      case "FABRICATOR":
        return s.rates.fabricatorActive
          ? "running"
          : "out of credits — stalled";
    }
  };

  // --- Actions --------------------------------------------------------------
  let busy = $state(false);
  let sellAction = $state<"quarter" | "max" | null>(null);
  let upgradingId = $state<string | null>(null);
  let message = $state("");

  async function run(action: () => Promise<string | void>) {
    busy = true;
    message = "";
    try {
      const result = await action();
      if (result) message = result;
    } catch (e) {
      message = e instanceof Error ? e.message : "Action failed.";
    } finally {
      busy = false;
    }
  }

  function handleSell(amountWh: number, action: "quarter" | "max") {
    if (amountWh < 1) return;
    clickSound();
    sellAction = action;
    void run(async () => {
      const r = await sellEnergy({ amountWh });
      sellSound();
      return `sold ${kwh(r.soldWh)} kWh for ${credits(r.revenueCents)} cr`;
    }).finally(() => (sellAction = null));
  }

  function handleUpgrade(buildingId: string) {
    clickSound();
    upgradingId = buildingId;
    void run(async () => {
      await startUpgrade({ buildingId });
      upgradeSound();
    }).finally(() => (upgradingId = null));
  }
</script>

<svelte:head><title>Vryne</title></svelte:head>

<main class="flex flex-col gap-4">
  {#if !s}
    <p class="text-base-content/50 text-sm">loading grid…</p>
  {:else}
    <GameHeader
      nickname={page.data.user?.nickname ?? ""}
      regionName={s.region.name}
      timeLabel={timeLabel(gameNowMs)}
      {weatherIcon}
      progress={s.progress}
      fillRateW={s.storage.fillRateW}
    />

    <!-- Resources -->
    <section class="grid grid-cols-3 gap-4 text-sm">
      <ResourceTile
        label="CREDITS"
        value={credits(creditsTween.current)}
        icon="Coins01Icon"
      />
      <ResourceTile
        label="MATERIAL"
        value={materialTween.current.toFixed(1)}
        icon="PackageIcon"
      />
      <ResourceTile
        label="ENERGY"
        value="{kwh3(energyTween.current)} kWh"
        icon="FlashIcon"
      />
    </section>

    <StoragePanel
      {energyNowWh}
      capacityWh={s.storage.capacityWh}
      fillRateW={s.storage.fillRateW}
      full={storageFull}
    />

    <SellPanel
      maxSellWh={s.grid.maxSellWh}
      {energyNowWh}
      {busy}
      {sellAction}
      {message}
      onSell={handleSell}
    />

    <!-- Price + weather side by side on wider screens -->
    <div class="grid gap-4 sm:grid-cols-2">
      <PriceBar
        priceMilliCents={s.priceNow.milliCentsPerKwh}
        effectiveMilliCents={s.priceNow.effectiveMilliCents}
        estimated={s.priceNow.estimated}
        forecast={s.forecast}
      />
      <WeatherPanel
        solarWm2={s.weatherNow.solarWm2}
        windMs={s.weatherNow.windMs}
        estimated={s.weatherNow.estimated}
        forecast={s.forecast}
      />
    </div>

    <!-- Assets + news: 6 tiles -->
    <section class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {#each s.buildings as b (b.id)}
        <AssetCard
          type={b.type}
          name={b.name}
          level={b.level}
          stat={statFor(b.type)}
          detail={detailFor(b.type)}
          upgradeCountdown={b.upgrade ? cd(b.upgrade.doneAtMs) : null}
          upgradeTargetLevel={b.upgrade?.targetLevel ?? null}
          next={b.next
            ? {
                materialCost: b.next.materialCost,
                durationLabel: durationLabel(b.next.durationMs),
              }
            : null}
          canAfford={b.next
            ? s.resources.material >= b.next.materialCost
            : false}
          {busy}
          loading={upgradingId === b.id}
          onUpgrade={() => handleUpgrade(b.id)}
        />
      {/each}
      <NewsCard
        headline={s.news.active?.headline ?? null}
        effectLabel={newsEffectLabel}
        remaining={s.news.active ? cd(s.news.active.endMs) : null}
        upcomingIn={s.news.upcoming ? cd(s.news.upcoming.startMs) : null}
      />
    </section>

    {#if s.dev}
      <DevPanel
        timeOffsetMs={s.dev.timeOffsetMs}
        weatherFixture={s.dev.weatherFixture}
        newsOverride={s.dev.newsOverride}
      />
    {/if}
  {/if}
</main>
