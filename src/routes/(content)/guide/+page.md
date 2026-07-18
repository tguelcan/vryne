<script>
  import Icon from "$components/elements/Icon.svelte";
  import AssetGlyph from "$components/game/AssetGlyph.svelte";
</script>

# How to play

Vryne is a _lazy_ game. Your grid produces around the clock — driven by the real
weather over your home region — and everything is settled when you come back.
You don't need to babysit it: check in once or twice a day, sell at a good
price, start an upgrade, done.

## The loop

1. **Produce** — sun and wind fill your storage, even while you sleep.
2. **Sell** — turn stored energy into credits at the current spot price.
3. **Fabricate** — your fabricator slowly turns time into building material.
4. **Upgrade** — spend material to grow production, storage and grid capacity.

## Resources

- <Icon name="Coins01Icon" size={14} /> <strong>Credits</strong> — earned by selling energy. Your score fuel.
- <Icon name="PackageIcon" size={14} /> <strong>Material</strong> — produced by the fabricator, spent on upgrades.
- <Icon name="FlashIcon" size={14} /> <strong>Energy</strong> — what your assets generate, capped by your storage.

## Your assets

<AssetGlyph type="SOLAR" size={28} /> <strong>Solar Array</strong> — produces by real sunlight.
Strong around midday, offline at night. Output follows the actual solar
radiation over your region.

<AssetGlyph type="WIND" size={28} /> <strong>Wind Turbine</strong> — produces by real wind
speed, day and night. Careful: at storm speeds (≥ 20 m/s) turbines cut off and
produce <strong>nothing</strong>.

<AssetGlyph type="STORAGE" size={28} /> <strong>Storage Bank</strong> — holds your energy.
When it's full, extra production is lost — upgrade it before long absences.

<AssetGlyph type="GRID" size={28} /> <strong>Grid Connection</strong> — limits how much you
can sell per action. A bigger connection means fewer clicks at the price peak.

<AssetGlyph type="FABRICATOR" size={28} /> <strong>Fabricator</strong> — steadily produces
material for upgrades. It's the quiet engine of your progress.

## Selling & prices <Icon name="ChartLineData01Icon" size={14} />

Energy is sold at the **real German day-ahead spot price**, which changes every
hour. The price chart shows the next 24 hours, including the expected peak —
usually in the evening. The trend arrow next to the current price tells you
whether waiting an hour pays off.

## News

Every few hours a news event can shake things up: price surges and drops, or a
boosted / slowed fabricator. Events are shown in the news tile with their
effect and duration — a price surge is a great moment to empty your storage.

## XP & leaderboard

You earn XP for every kWh sold and for every finished upgrade. XP raises your
level and your rank on the [leaderboard](/leaderboard).

## Tips & tricks

- **Sell at the peak.** Prices are often 30–50% higher in the evening than at
  noon. The chart shows you exactly when.
- **Don't waste the storm — but mind the cutoff.** Strong wind is great;
  storms (≥ 20 m/s) stop turbines entirely. Sunny _and_ breezy days are gold.
- **Upgrade storage before you log off.** A full storage bank produces nothing
  extra. Bigger storage = calmer sleep.
- **Watch solar noon.** Solar output peaks around midday — a good time for the
  first sell of the day.
- **Fabricator first.** Early on, a faster fabricator compounds: more material
  → faster upgrades → more of everything.
- **Use price-surge news.** A ×1.4 price event beats almost any regular peak.

Good luck, operator. <Icon name="FlashIcon" size={14} />
