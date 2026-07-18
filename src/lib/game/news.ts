// ---------------------------------------------------------------------------
// News events: the SCHEDULE and EFFECTS are a pure, deterministic function of
// time (seeded like the price fallback) so settlement stays lazy and testable.
// Only the headline TEXT is LLM-generated and persisted (server/news.ts).
// ---------------------------------------------------------------------------

import { seededUnit } from "./price";

export type NewsKind =
  "PRICE_SURGE" | "PRICE_DROP" | "FABRICATOR_BOOST" | "FABRICATOR_SLOWDOWN";

export type NewsEventData = {
  /** Schedule block index — also the persistence key for the headline. */
  id: string;
  kind: NewsKind;
  /** Multiplier applied to the spot price while active (1 = none). */
  priceMult: number;
  /** Multiplier applied to the fabricator rate while active (1 = none). */
  fabricatorMult: number;
  startMs: number;
  endMs: number;
  /** Fallback headline when no LLM is available. */
  templateHeadline: string;
  /** Plain description of the effect, also used to prompt the LLM. */
  description: string;
};

/** One potential event per 6 h block; ~60 % of blocks have one. */
const BLOCK_MS = 6 * 3_600_000;
const KINDS: NewsKind[] = [
  "PRICE_SURGE",
  "PRICE_DROP",
  "FABRICATOR_BOOST",
  "FABRICATOR_SLOWDOWN",
];

const TEMPLATES: Record<NewsKind, (pct: number) => string> = {
  PRICE_SURGE: (pct) => `Grid congestion — spot price +${pct}%`,
  PRICE_DROP: (pct) => `Oversupply on the grid — spot price -${pct}%`,
  FABRICATOR_BOOST: (pct) => `Subsidy program — fabricator output +${pct}%`,
  FABRICATOR_SLOWDOWN: (pct) =>
    `Material shortage — fabricator output -${pct}%`,
};

/** Deterministic event for a schedule block, or null (quiet block). */
export function newsForBlock(block: number): NewsEventData | null {
  if (seededUnit(block * 7919 + 17) < 0.4) return null;

  const kind =
    KINDS[Math.floor(seededUnit(block * 104_729 + 5) * KINDS.length)];
  const m = seededUnit(block * 1_299_709 + 11); // 0..1 magnitude
  const durationH = 2 + Math.floor(seededUnit(block * 15_485_863 + 3) * 3); // 2..4 h

  let priceMult = 1;
  let fabricatorMult = 1;
  if (kind === "PRICE_SURGE") priceMult = 1.15 + 0.25 * m;
  else if (kind === "PRICE_DROP") priceMult = 0.7 + 0.15 * m;
  else if (kind === "FABRICATOR_BOOST") fabricatorMult = 1.2 + 0.4 * m;
  else fabricatorMult = 0.4 + 0.3 * m;

  priceMult = Math.round(priceMult * 100) / 100;
  fabricatorMult = Math.round(fabricatorMult * 100) / 100;
  const pct = Math.round(
    Math.abs((kind.startsWith("PRICE") ? priceMult : fabricatorMult) - 1) * 100,
  );

  const startMs = block * BLOCK_MS;
  return {
    id: String(block),
    kind,
    priceMult,
    fabricatorMult,
    startMs,
    endMs: startMs + durationH * 3_600_000,
    templateHeadline: TEMPLATES[kind](pct),
    description: `${TEMPLATES[kind](pct)} for ${durationH} hours`,
  };
}

/** The event active at `at`, or null. Events never span blocks. */
export function activeNews(at: Date): NewsEventData | null {
  const t = at.getTime();
  const event = newsForBlock(Math.floor(t / BLOCK_MS));
  return event && t >= event.startMs && t < event.endMs ? event : null;
}

/** The next scheduled event strictly after `at` (looks ahead up to 8 blocks). */
export function upcomingNews(at: Date): NewsEventData | null {
  const currentBlock = Math.floor(at.getTime() / BLOCK_MS);
  for (let b = currentBlock; b <= currentBlock + 8; b++) {
    const event = newsForBlock(b);
    if (event && event.startMs > at.getTime()) return event;
  }
  return null;
}

/** All events overlapping [from, to] — used to split settlement segments. */
export function newsWindows(from: Date, to: Date): NewsEventData[] {
  const events: NewsEventData[] = [];
  const first = Math.floor(from.getTime() / BLOCK_MS);
  const last = Math.floor(to.getTime() / BLOCK_MS);
  for (let b = first; b <= last; b++) {
    const event = newsForBlock(b);
    if (event && event.endMs > from.getTime() && event.startMs < to.getTime()) {
      events.push(event);
    }
  }
  return events;
}
