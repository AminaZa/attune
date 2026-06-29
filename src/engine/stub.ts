import { getStore } from '@/store';
import type { CabinDecisions, DriverState, SupportProfile } from '@/types';

/**
 * REFERENCE STUB ENGINE (`src/engine/stub.ts`).
 *
 * This is the lead's Day-1 stand-in so the whole app runs end-to-end TODAY,
 * before the real `fuse()` / `decide()` / loop (owned by team 02) exist. It
 * emits plausible fake DriverState + CabinDecisions on a smooth sine-wave loop,
 * driving the store ~10x/sec exactly like the real engine will.
 *
 * The real engine replaces this entirely — it must keep calling
 * `getStore().tick(state, decisions)` the same way. Everything downstream
 * (dashboard, cabin, notifications) reads the store and never knows the
 * difference. If team 02 stalls, this keeps the demo alive (build plan §4).
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

const TICK_MS = 100; // ~10x/sec, matching the real engine cadence
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Fake fused state on smooth, out-of-phase sine waves so the gauges look alive
 * and "breathe" between triggers (design system §4). `tSec` is seconds elapsed.
 * Calm baseline: low stress/overload, high attention — gently oscillating.
 */
function fakeDriverState(tSec: number): DriverState {
  // 2*pi*t = one full sine per second; we slow each axis to a calm multi-second breathe.
  const stress = clamp01(0.28 + 0.18 * Math.sin((2 * Math.PI * tSec) / 7));
  const overload = clamp01(0.22 + 0.15 * Math.sin((2 * Math.PI * tSec) / 9 + 1.1));
  const attention = clamp01(0.78 + 0.14 * Math.sin((2 * Math.PI * tSec) / 5 + 2.3));
  return { stress, overload, attention };
}

/**
 * Plausible decisions derived from the fake state + the dummy profile, so the
 * "act" side visibly tracks the "sense" side (the real-time-agent story).
 */
function fakeDecisions(state: DriverState, profile: SupportProfile): CabinDecisions {
  const noiseCancelLevel = clamp01(profile.sensory.noiseCancelStrength * (0.4 + state.stress));
  const lightDimLevel = clamp01(profile.sensory.lightDimmingLevel * (0.5 + state.overload));
  const engagementCue =
    profile.attention.engagementCuesEnabled && state.attention < 0.45;

  const alert =
    state.stress > profile.intervention.stressThreshold
      ? { stage: profile.intervention.escalationSteps[0] ?? 'gentle_cue', channel: profile.intervention.preferredAlertChannel }
      : undefined;

  return {
    noiseCancelLevel,
    lightDimLevel,
    engagementCue,
    alert,
    preservedSounds: [], // the audio showpiece / siren scenario fills this later
  };
}

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the stub loop. Seeds the dummy profile if none is set, then ticks the
 * store ~10x/sec on a smooth sine loop. Returns a stop function.
 */
export function startStubEngine(): () => void {
  if (timer) return stopStubEngine; // idempotent

  if (!getStore().profile) {
    getStore().setProfile(DUMMY_PROFILE);
  }

  const start = performance.now();
  timer = setInterval(() => {
    const tSec = (performance.now() - start) / 1000;
    const profile = getStore().profile ?? DUMMY_PROFILE;
    const state = fakeDriverState(tSec);
    const decisions = fakeDecisions(state, profile);
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
