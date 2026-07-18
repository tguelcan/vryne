// ---------------------------------------------------------------------------
// Shared display formatters. Pure — usable by the page and all components.
// ---------------------------------------------------------------------------

/** Watt-hours → "1.23" (kWh, two decimals). */
export const kwh = (wh: number) => (wh / 1000).toFixed(2);

/** Watt-hours → "1.234" (kWh, three decimals = 1 Wh resolution). */
export const kwh3 = (wh: number) => (wh / 1000).toFixed(3);

/** Cents → "12.34" (credits, two decimals). */
export const credits = (cents: number) => (cents / 100).toFixed(2);

/** Epoch ms → "18:00" (full hour, viewer's local timezone). */
export const hourLabel = (ms: number) =>
  `${String(new Date(ms).getHours()).padStart(2, "0")}:00`;

/** Epoch ms → "18:42" (viewer's local timezone). */
export const timeLabel = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** Remaining time until `doneAtMs`, relative to `nowMs`. */
export const countdown = (doneAtMs: number, nowMs: number) => {
  const rest = Math.max(0, doneAtMs - nowMs);
  const h = Math.floor(rest / 3_600_000);
  const m = Math.floor((rest % 3_600_000) / 60_000);
  const sec = Math.floor((rest % 60_000) / 1000);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${String(sec).padStart(2, "0")}s`;
};

/** Duration in ms → "15m" / "2.0h". */
export const durationLabel = (ms: number) => {
  const min = Math.round(ms / 60_000);
  return min >= 60 ? `${(min / 60).toFixed(1)}h` : `${min}m`;
};
