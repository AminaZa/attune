import { create } from 'zustand';
import { broadcast } from './broadcast';
import type {
  CabinDecisions,
  DriverState,
  NotificationEvent,
  ScenarioId,
  SupportProfile,
} from '@/types';

/**
 * THE STORE — `src/store/` (lead only).
 *
 * The single shared state for the whole app, mirrored across browser tabs via
 * BroadcastChannel (see ./broadcast.ts). API verbatim from attune-build-plan §3:
 *
 *   useStore.getState().setProfile(profile)     // onboarding writes once
 *   useStore.getState().tick(state, decisions)  // engine writes ~10x/sec
 *   useStore.getState().pushEvent(event)        // notification producers write
 *   useStore.getState().setScenario(id)         // lead's control panel writes
 *
 *   const s = useStore(s => s.driverState)      // anyone reads
 *   const d = useStore(s => s.decisions)
 *   const p = useStore(s => s.profile)
 *   const e = useStore(s => s.events)            // queued, render ONE at a time
 *   const a = useStore(s => s.activeScenario)
 */
export interface AttuneState {
  // ---- state (mirrored across tabs) ----
  driverState: DriverState | null;
  decisions: CabinDecisions | null;
  profile: SupportProfile | null;
  events: NotificationEvent[];
  activeScenario: ScenarioId;

  // ---- actions (local; their effects are mirrored) ----
  /** Onboarding writes the Support Profile once (then the wizard is done). */
  setProfile: (profile: SupportProfile) => void;
  /** Engine writes the fused state + decision each frame (~10x/sec). */
  tick: (state: DriverState, decisions: CabinDecisions) => void;
  /** Notification producers enqueue an event (rendered one at a time). */
  pushEvent: (event: NotificationEvent) => void;
  /** Consume/clear the oldest event once it has finished displaying. */
  shiftEvent: () => void;
  /** Lead's control panel selects which scripted scenario the feed plays. */
  setScenario: (id: ScenarioId) => void;
}

/** Keys mirrored across tabs — data only, never the action functions. */
const SYNC_KEYS: (keyof AttuneState)[] = [
  'driverState',
  'decisions',
  'profile',
  'events',
  'activeScenario',
];

export const useStore = create<AttuneState>()(
  broadcast(
    (set) => ({
      driverState: null,
      decisions: null,
      profile: null,
      events: [],
      activeScenario: 'calm_drive',

      setProfile: (profile) => set({ profile }),

      tick: (state, decisions) => set({ driverState: state, decisions }),

      pushEvent: (event) => set((s) => ({ events: [...s.events, event] })),

      shiftEvent: () => set((s) => ({ events: s.events.slice(1) })),

      setScenario: (id) => set({ activeScenario: id }),
    }),
    { name: 'attune-sync', pick: SYNC_KEYS }
  )
);

/** Non-hook access for the engine / control panel (matches build plan usage). */
export const getStore = useStore.getState;
