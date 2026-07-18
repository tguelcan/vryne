// ---------------------------------------------------------------------------
// Minimal UI sound effects — tiny synthesized WebAudio blips, no asset files.
// Safe to call anywhere: no-ops on the server or when audio is unavailable.
// Calls happen inside user gestures (button clicks), satisfying autoplay
// policies.
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type BlipOptions = {
  /** Delay from now, seconds. */
  at?: number;
  durationS?: number;
  gain?: number;
  type?: OscillatorType;
};

function blip(
  freqHz: number,
  {
    at = 0,
    durationS = 0.04,
    gain = 0.03,
    type = "triangle",
  }: BlipOptions = {},
) {
  const ac = audioCtx();
  if (!ac) return;
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freqHz;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durationS);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durationS + 0.02);
}

/** Light generic click for button presses. */
export function clickSound() {
  blip(1800, { durationS: 0.025, gain: 0.02, type: "square" });
}

/** Sell confirmation: a soft two-note "coin" blip. */
export function sellSound() {
  blip(880, { durationS: 0.05, gain: 0.03 });
  blip(1320, { at: 0.07, durationS: 0.07, gain: 0.03 });
}

/** Upgrade started: a slightly deeper, mechanical double click. */
export function upgradeSound() {
  blip(520, { durationS: 0.04, gain: 0.035, type: "square" });
  blip(390, { at: 0.06, durationS: 0.05, gain: 0.03, type: "square" });
}
