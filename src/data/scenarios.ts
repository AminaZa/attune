import type { AudioEvent, ScenarioId, TelemetryFrame } from '@/types';

/**
 * THE SCRIPTED DATA FEED — `src/data/` (lead only).
 *
 * Four hand-shaped telemetry timelines (build plan §5) the presenter fires on
 * cue during the 4-minute pitch. Each scenario is an array of `TelemetryFrame`
 * sampled at 10 fps, 30–60s long, with the dramatic arc scripted so the story
 * reads clearly from across the room:
 *
 *   calm_drive      baseline; gauges breathe, cabin neutral.
 *   stress_spike    HR 70→115, grip 0.2→0.8 over ~10s, then holds. (Autism half.)
 *   attention_drop  gaze leaves the road, long fixation + low scan for ~8s. (ADHD half.)
 *   siren_event     elevated stress + a siren punches in from the right for ~6s. (The aha.)
 *
 * Every frame carries small per-frame jitter so the gauges look *alive*, never
 * robotic. The jitter is deterministic (a hash of the frame index), so the same
 * scenario replays identically every time — scripted + repeatable beats a
 * passively-playing file (dev-decisions §2): we control exactly when the aha lands.
 *
 * The real engine (team 02) consumes `SCENARIO_FRAMES[activeScenario]`, fuses
 * each frame into DriverState, and ticks the store. Until then the lead's
 * ScenarioPanel previews these timelines directly. Nothing here touches the
 * contract or the store — it just produces frames.
 */

/** Demo cadence: 10 frames per second (matches the engine's ~10x/sec tick). */
export const FPS = 10;
const FRAME_MS = 1000 / FPS; // 100ms

// ---- shaping helpers -------------------------------------------------------

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/**
 * Deterministic pseudo-random jitter in [-amp, amp] from the frame index — the
 * classic fract(sin) hash. Deterministic so replays are identical; `seed`
 * decorrelates the wobble across different fields in the same frame.
 */
function jit(i: number, amp: number, seed = 0): number {
  const n = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  return (n - Math.floor(n) - 0.5) * 2 * amp;
}

/** Slow sine "breathing" so signals drift gently between jitter, not just twitch. */
const breathe = (sec: number, periodSec: number, amp: number) =>
  amp * Math.sin((2 * Math.PI * sec) / periodSec);

/**
 * Smooth ramp from `a` to `b` across [startSec, endSec], flat-held outside the
 * window (before → a, after → b). The backbone of every scripted arc.
 */
const ramp = (sec: number, startSec: number, endSec: number, a: number, b: number) =>
  lerp(a, b, smoothstep((sec - startSec) / (endSec - startSec)));

/**
 * A smooth 0→1→0 "bump" that rises into [start, end] and falls back out, with
 * `edge`-second transitions. Used for transient episodes (the attention drop,
 * the siren's stress kick) so the cabin eases in and out, never snaps.
 */
function bump(sec: number, startSec: number, endSec: number, edge = 1.2): number {
  const rise = smoothstep((sec - startSec) / edge);
  const fall = 1 - smoothstep((sec - (endSec - edge)) / edge);
  return clamp01(Math.min(rise, fall));
}

const secToFrames = (sec: number) => Math.round(sec * FPS);

// ---- the four scenarios ----------------------------------------------------

/**
 * calm_drive (40s) — the baseline. Everything sits near rest and breathes: HR
 * ~72, relaxed grip, eyes on the road with healthy scanning. Nothing to act on;
 * this is what "attuned" looks like, and the contrast that makes the others read.
 */
function buildCalmDrive(): TelemetryFrame[] {
  const frames: TelemetryFrame[] = [];
  const total = secToFrames(40);
  for (let i = 0; i < total; i++) {
    const sec = i / FPS;
    frames.push({
      t: i * FRAME_MS,
      gaze: {
        onRoad: true,
        scanEntropy: clamp01(0.52 + breathe(sec, 11, 0.04) + jit(i, 0.04, 1)),
        fixationMs: 280 + breathe(sec, 8, 25) + jit(i, 30, 2),
      },
      biometrics: {
        heartRate: 72 + breathe(sec, 7, 2) + jit(i, 0.8, 3),
        gripPressure: clamp01(0.24 + breathe(sec, 9, 0.025) + jit(i, 0.015, 4)),
        tremor: clamp01(0.05 + jit(i, 0.015, 5)),
      },
      audioEvents: [],
    });
  }
  return frames;
}

/**
 * stress_spike (45s) — the autism half. Calm for ~5s, then HR ramps 70→115 and
 * grip 0.2→0.8 over ~10s with rising micro-tremor and more agitated (but still
 * on-road) scanning, then HOLDS high to the end. The driver-state stress gauge
 * climbs → the cabin should cancel more noise, soften light, and alert on the
 * profile's channel. Eyes stay on the road — this is overload, not inattention.
 */
function buildStressSpike(): TelemetryFrame[] {
  const frames: TelemetryFrame[] = [];
  const total = secToFrames(45);
  for (let i = 0; i < total; i++) {
    const sec = i / FPS;
    const heartRate = ramp(sec, 5, 15, 70, 115);
    const gripPressure = ramp(sec, 5, 15, 0.2, 0.8);
    const tremor = ramp(sec, 5, 15, 0.05, 0.42);
    const scanEntropy = ramp(sec, 5, 15, 0.5, 0.72); // hypervigilant, darting
    frames.push({
      t: i * FRAME_MS,
      gaze: {
        onRoad: true,
        scanEntropy: clamp01(scanEntropy + jit(i, 0.05, 1)),
        fixationMs: 250 + breathe(sec, 6, 20) + jit(i, 25, 2),
      },
      biometrics: {
        heartRate: heartRate + breathe(sec, 4, 1.2) + jit(i, 1.0, 3),
        gripPressure: clamp01(gripPressure + jit(i, 0.02, 4)),
        tremor: clamp01(tremor + jit(i, 0.02, 5)),
      },
      audioEvents: [],
    });
  }
  return frames;
}

/**
 * attention_drop (40s) — the ADHD half. Normal for ~12s, then for ~8s the gaze
 * leaves the road: `onRoad` false, fixation stretches toward a glazed ~2.2s
 * stare, scan entropy collapses (no road-scanning), and HR/grip drift *down*
 * with understimulation. Attention gauge falls → the engagement cue should fire.
 * Then the driver re-engages and it eases back to baseline.
 */
function buildAttentionDrop(): TelemetryFrame[] {
  const frames: TelemetryFrame[] = [];
  const total = secToFrames(40);
  for (let i = 0; i < total; i++) {
    const sec = i / FPS;
    const d = bump(sec, 12, 20, 1.2); // 0..1 "zoned out" factor across the ~8s window
    frames.push({
      t: i * FRAME_MS,
      gaze: {
        onRoad: d < 0.5,
        scanEntropy: clamp01(lerp(0.5, 0.08, d) + jit(i, 0.03, 1)),
        fixationMs: lerp(300, 2200, d) + breathe(sec, 7, 20) + jit(i, 40, 2),
      },
      biometrics: {
        heartRate: lerp(72, 67, d) + breathe(sec, 8, 1.5) + jit(i, 0.8, 3),
        gripPressure: clamp01(lerp(0.24, 0.17, d) + jit(i, 0.015, 4)),
        tremor: clamp01(0.05 + jit(i, 0.015, 5)),
      },
      audioEvents: [],
    });
  }
  return frames;
}

/** The scripted siren: emergency vehicle approaching from the right. */
const SIREN: AudioEvent = { type: 'siren', direction: 'right', intensity: 0.9 };

/**
 * siren_event (40s) — the 5-second aha. Stress runs elevated throughout (HR ~96,
 * firm grip), so the cabin is already calming hard. Then from ~18–24s a siren
 * punches in from the right (intensity 0.9) and stress kicks higher with it. The
 * payoff: at maximum cabin calming the drone stays ducked but the siren is
 * PRESERVED and cued — "quiet the cabin, keep the siren" (brief §5, audio §3).
 */
function buildSirenEvent(): TelemetryFrame[] {
  const frames: TelemetryFrame[] = [];
  const total = secToFrames(40);
  const sirenStart = 18;
  const sirenEnd = 24;
  for (let i = 0; i < total; i++) {
    const sec = i / FPS;
    const s = bump(sec, sirenStart, sirenEnd, 0.8); // stress kick around the siren
    const sirenAudible = sec >= sirenStart && sec < sirenEnd;
    frames.push({
      t: i * FRAME_MS,
      gaze: {
        onRoad: true,
        scanEntropy: clamp01(lerp(0.58, 0.7, s) + jit(i, 0.05, 1)),
        fixationMs: 240 + breathe(sec, 5, 20) + jit(i, 25, 2),
      },
      biometrics: {
        heartRate: lerp(96, 108, s) + breathe(sec, 4, 1.2) + jit(i, 1.0, 3),
        gripPressure: clamp01(lerp(0.5, 0.66, s) + jit(i, 0.02, 4)),
        tremor: clamp01(lerp(0.28, 0.4, s) + jit(i, 0.02, 5)),
      },
      // The siren is crisp on/off (not faded) so detection + the cue read cleanly.
      audioEvents: sirenAudible ? [SIREN] : [],
    });
  }
  return frames;
}

// ---- registry --------------------------------------------------------------

/** Canonical scenario order — drives the control-panel button row. */
export const SCENARIOS: ScenarioId[] = [
  'calm_drive',
  'stress_spike',
  'attention_drop',
  'siren_event',
];

/** Display metadata for each scenario (the panel's labels + one-line story). */
export const SCENARIO_META: Record<
  ScenarioId,
  { label: string; blurb: string }
> = {
  calm_drive: { label: 'Calm Drive', blurb: 'Baseline — gauges breathe, cabin neutral.' },
  stress_spike: { label: 'Stress Spike', blurb: 'HR & grip climb → cabin calms. (Autism)' },
  attention_drop: { label: 'Attention Drop', blurb: 'Gaze drifts → engagement cue. (ADHD)' },
  siren_event: { label: 'Siren Event', blurb: 'Quiet the cabin, keep the siren. (Aha)' },
};

/**
 * The scripted feed: every scenario fully materialised as a frame array. Built
 * once at module load (cheap — a few thousand small objects) so playback and the
 * engine just index into a ready array; no per-frame allocation at 10 fps.
 */
export const SCENARIO_FRAMES: Record<ScenarioId, TelemetryFrame[]> = {
  calm_drive: buildCalmDrive(),
  stress_spike: buildStressSpike(),
  attention_drop: buildAttentionDrop(),
  siren_event: buildSirenEvent(),
};

/** Convenience: how many frames (and seconds) a scenario runs. */
export const scenarioDurationSec = (id: ScenarioId) => SCENARIO_FRAMES[id].length / FPS;
