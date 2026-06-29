import { useStore } from '@/store';
import { SCENARIO_FRAMES } from '@/data/scenarios';
import { fuse } from './fuse';
import { decide } from './decide';
import type { ScenarioId } from '@/types';

/**
 * THE REAL ENGINE LOOP (`src/engine/startEngine.ts`).
 *
 * Reads the active scenario's TelemetryFrames from src/data/scenarios.ts,
 * steps through them at 100ms intervals (~10x/sec), runs fuse → decide each
 * tick, and pushes state + decisions to the Zustand store. Loops back to
 * frame 0 at the end, and restarts whenever activeScenario changes.
 *
 * Returns a stop() function that halts the loop cleanly.
 */

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let currentScenarioId: ScenarioId | null = null;
let currentFrameIndex = 0;

/**
 * Stop the engine loop and clean up.
 */
function stop() {
  if (intervalHandle !== null) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  currentFrameIndex = 0;
  currentScenarioId = null;
}

/**
 * Start the engine loop. Reads scenarios + profile from the store,
 * ticks fuse/decide at 100ms, and syncs to store.tick(). Restarts when
 * activeScenario changes. Returns a stop() function to halt the loop.
 */
export function startEngine(): () => void {
  // If already running, just return the stop function.
  if (intervalHandle !== null) {
    return stop;
  }

  // Initialize profile if missing (fallback).
  if (!useStore.getState().profile) {
    console.warn('startEngine: no profile in store, waiting for onboarding.');
  }

  // Start the interval loop at 100ms.
  intervalHandle = setInterval(() => {
    const state = useStore.getState();
    const activeScenario = state.activeScenario;
    const profile = state.profile;

    // If scenario changed, restart from frame 0.
    if (activeScenario !== currentScenarioId) {
      currentScenarioId = activeScenario;
      currentFrameIndex = 0;
    }

    // Get the frames for the active scenario.
    const frames = SCENARIO_FRAMES[activeScenario];
    if (!frames || frames.length === 0) {
      console.warn(`startEngine: no frames for scenario "${activeScenario}".`);
      return;
    }

    // Get the current frame.
    const frame = frames[currentFrameIndex];

    // If profile exists, fuse + decide; otherwise skip.
    if (profile) {
      const driverState = fuse(frame);
      const decisions = decide(driverState, frame, profile);
      useStore.getState().tick(driverState, decisions);
    }

    // Advance to next frame, wrapping around to 0.
    currentFrameIndex = (currentFrameIndex + 1) % frames.length;
  }, 100);

  return stop;
}
