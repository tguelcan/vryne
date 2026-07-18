import { describe, expect, it } from "vitest";
import { activeNews, newsForBlock, newsWindows, upcomingNews } from "./news";
import { progressFromXp, xpThreshold, MAX_PLAYER_LEVEL } from "./gameConfig";
import { computeFabrication } from "./production";

const BLOCK_MS = 6 * 3_600_000;

describe("news schedule", () => {
  it("is deterministic", () => {
    for (let b = 100; b < 120; b++) {
      expect(newsForBlock(b)).toEqual(newsForBlock(b));
    }
  });

  it("produces both quiet blocks and events", () => {
    const events = [];
    for (let b = 0; b < 200; b++) events.push(newsForBlock(b));
    const some = events.filter((e) => e !== null);
    expect(some.length).toBeGreaterThan(0);
    expect(some.length).toBeLessThan(200);
  });

  it("keeps multipliers in sane ranges and inside the block", () => {
    for (let b = 0; b < 200; b++) {
      const e = newsForBlock(b);
      if (!e) continue;
      expect(e.priceMult).toBeGreaterThanOrEqual(0.7);
      expect(e.priceMult).toBeLessThanOrEqual(1.4);
      expect(e.fabricatorMult).toBeGreaterThanOrEqual(0.4);
      expect(e.fabricatorMult).toBeLessThanOrEqual(1.6);
      expect(e.startMs).toBe(b * BLOCK_MS);
      expect(e.endMs - e.startMs).toBeLessThanOrEqual(4 * 3_600_000);
    }
  });

  it("activeNews respects the event window", () => {
    // Find a block with an event.
    const b = Array.from({ length: 200 }, (_, i) => i).find((i) =>
      newsForBlock(i),
    )!;
    const e = newsForBlock(b)!;
    expect(activeNews(new Date(e.startMs))).toEqual(e);
    expect(activeNews(new Date(e.endMs))).toBeNull();
  });

  it("upcomingNews finds the next future event", () => {
    const at = new Date(0);
    const next = upcomingNews(at);
    expect(next).not.toBeNull();
    expect(next!.startMs).toBeGreaterThan(at.getTime());
  });

  it("newsWindows returns overlapping events only", () => {
    const b = Array.from({ length: 200 }, (_, i) => i).find((i) =>
      newsForBlock(i),
    )!;
    const e = newsForBlock(b)!;
    const hits = newsWindows(new Date(e.startMs), new Date(e.endMs));
    expect(hits).toContainEqual(e);
    const misses = newsWindows(new Date(e.endMs + 1), new Date(e.endMs + 2));
    expect(misses.find((x) => x.id === e.id)).toBeUndefined();
  });
});

describe("fabricator news multiplier", () => {
  it("scales material output", () => {
    const from = new Date(0);
    const to = new Date(3_600_000);
    const base = computeFabrication(1, 10_000, 5, 0, from, to, 1);
    const boosted = computeFabrication(1, 10_000, 5, 0, from, to, 1.5);
    expect(boosted.material).toBe(Math.round(base.material * 1.5));
  });
});

describe("progression", () => {
  it("level 1 starts at 0 XP", () => {
    expect(xpThreshold(1)).toBe(0);
    expect(progressFromXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0 });
  });

  it("levels up at thresholds", () => {
    const t2 = xpThreshold(2);
    expect(progressFromXp(t2 - 1).level).toBe(1);
    expect(progressFromXp(t2).level).toBe(2);
    expect(progressFromXp(t2).title).toBe("Hobbyist");
  });

  it("caps at max level with no next threshold", () => {
    const p = progressFromXp(xpThreshold(MAX_PLAYER_LEVEL) + 999_999);
    expect(p.level).toBe(MAX_PLAYER_LEVEL);
    expect(p.xpForNext).toBeNull();
  });
});
