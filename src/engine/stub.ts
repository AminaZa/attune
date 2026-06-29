import { getStore } from '@/store';
import { FPS, SCENARIO_FRAMES } from '@/data/scenarios';
import type { CabinDecisions, DriverState, SupportProfile, TelemetryFrame } from '@/types';

/**
 * REFERENCE STUB ENGINE (`src/engine/stub.ts`).
 *
 * The lead's Day-1 stand-in so the whole app runs end-to-end TODAY, before team
 * 02's real `fuse()` / `decide()` / loop exist. It now PLAYS the scripted data
 * feed (`src/data/scenarios.ts`): each tick it reads the current frame of the
 * active scenario, fuses it into a DriverState, decides cabin actions, and ticks
 * the store ~10x/sec. Switching scenarios from the control panel visibly changes
 * the numbers, because the scenarios are genuinely different telemetry.
 *
 * The real engine replaces this entirely — it must keep reading
 * `SCENARIO_FRAMES[activeScenario]` and calling `getStore().tick(state,
 * decisions)` the same way. Everything downstream (dashboard, cabin, audio,
 * notifications) reads the store and never knows the difference.
 */

/** Hardcoded dummy Support Profile (brief §4.3 example, v7), so the app has a profile out of the box. */
export const DUMMY_PROFILE: SupportProfile = {
  profileId: 'anon-demo-0001',
  version: 7,
  sensory: {
    noiseCancelStrength: 0.8,
    lightDimmingLevel: 0.6,
    temperaturePreferenceC: 21,
    hapticTolerance: 'low',
  },
  attention: {
    zoneOutRisk: 'high',
    engagementCuesEnabled: true,
    distractionFilteringLevel: 0.7,
  },
  intervention: {
    stressThreshold: 0.65,
    overloadThreshold: 0.7,
    preferredAlertChannel: 'haptic',
    escalationSteps: ['gentle_cue', 'firm_cue', 'suggest_pull_over'],
  },
};

const TICK_MS = 1000 / FPS; // ~10x/sec, matching the feed cadence
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Fuse one telemetry frame into a driver-state estimate (stress, overload,
 * attention; all 0..1). A deliberately simple rule-based stand-in for team 02's
 * real `fuse()` — but driven by the REAL feed, so each scenario reads distinctly:
 *   · stress     rises with heart rate, grip, tremor (stress_spike).
 *   · overload   rises with stress, chaotic scanning, and loud audio (siren_event).
 *   · attention  falls when gaze leaves the road and fixation glazes (attention_drop).
 */
function fuseFrame(f: TelemetryFrame): DriverState {
  const hrNorm = clamp01((f.biometrics.heartRate - 60) / 60); // 60bpm→0, 120→1
  const stress = clamp01(0.5 * hrNorm + 0.35 * f.biometrics.gripPressure + 0.15 * f.biometrics.tremor);

  const audioIntensity = f.audioEvents.reduce((m, e) => Math.max(m, e.intensity), 0);
  const scanExcess = clamp01((f.gaze.scanEntropy - 0.5) / 0.4); // hypervigilant darting
  const overload = clamp01(0.45 * stress + 0.3 * scanExcess + 0.45 * audioIntensity);

  const base = f.gaze.onRoad ? 0.85 : 0.2;
  const fixationPenalty = clamp01((f.gaze.fixationMs - 500) / 2000) * 0.6; // glazed stare
  const attention = clamp01(base - fixationPenalty);

  return { stress, overload, attention };
}

/**
 * Decide cabin actions from the fused state + the profile — the "act" side that
 * visibly tracks "sense". Safety-critical sounds in the frame are passed straight
 * into `preservedSounds` (the audio showpiece plays them at full gain regardless
 * of how hard the cabin is calming — "quiet the cabin, keep the siren").
 */
function decideFrame(state: DriverState, profile: SupportProfile, f: TelemetryFrame): CabinDecisions {
  const load = Math.max(state.stress, state.overload);
  const noiseCancelLevel = clamp01(profile.sensory.noiseCancelStrength * (0.25 + 0.9 * load));
  const lightDimLevel = clamp01(profile.sensory.lightDimmingLevel * (0.4 + state.overload));

  const engagementCue =
    profile.attention.engagementCuesEnabled &&
    profile.attention.zoneOutRisk === 'high' &&
    state.attention < 0.4;

  const alert =
    state.stress > profile.intervention.stressThreshold
      ? {
          stage: profile.intervention.escalationSteps[0] ?? 'gentle_cue',
          channel: profile.intervention.preferredAlertChannel,
        }
      : undefined;

  // Everything in our AudioEvent union is safety-critical, so all of it is preserved.
  const preservedSounds = f.audioEvents.filter(
    (e) => e.type === 'siren' || e.type === 'horn' || e.type === 'tyre_screech'
  );

  return { noiseCancelLevel, lightDimLevel, engagementCue, alert, preservedSounds };
}

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the stub loop. Seeds the dummy profile if none is set, then plays the
 * active scenario's frames into the store ~10x/sec, looping. Selecting a new
 * scenario (control panel → `setScenario`) restarts its timeline from frame 0.
 * Returns a stop function.
 */
export function startStubEngine(): () => void {
  if (timer) return stopStubEngine; // idempotent

  if (!getStore().profile) {
    getStore().setProfile(DUMMY_PROFILE);
  }

  let lastScenario = getStore().activeScenario;
  let index = 0;

  timer = setInterval(() => {
    const scenario = getStore().activeScenario;
    if (scenario !== lastScenario) {
      lastScenario = scenario;
      index = 0; // new scenario → rewind to the start of its arc
    }

    const frames = SCENARIO_FRAMES[scenario];
    const frame = frames[index % frames.length];
    index++;

    const profile = getStore().profile ?? DUMMY_PROFILE;
    const state = fuseFrame(frame);
    const decisions = decideFrame(state, profile, frame);
    getStore().tick(state, decisions);
  }, TICK_MS);

  return stopStubEngine;
}

export function stopStubEngine(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
