/**
 * THE CONTRACT — `src/types/` (lead only).
 *
 * These interfaces are the agreed boundary between every module (engine,
 * onboarding, dashboard, cabin, notifications, audio, data feed). They come
 * verbatim from attune-build-plan.md §3. The contract never changes silently:
 * any change is announced by the lead in the group chat.
 *
 * Mental model: sense → decide → act → learn, around a per-driver Support Profile.
 */

/**
 * The Support Profile — the single per-driver settings object the whole system
 * reads at runtime. Settings & thresholds only: NEVER live biometrics, NEVER the
 * raw diagnosis (privacy-first; see brief §6). Onboarding builds it; the engine
 * consults it; the learning loop versions it.
 */
export interface SupportProfile {
  profileId: string;
  version: number;
  /** Group A — sensory comfort knobs (driver preferences). */
  sensory: {
    /** 0..1 — how aggressively to cancel background drone. */
    noiseCancelStrength: number;
    /** 0..1 — target cabin brightness / glare reduction. */
    lightDimmingLevel: number;
    temperaturePreferenceC: number;
    hapticTolerance: 'low' | 'medium' | 'high';
  };
  /** Group B — attention / engagement axis (the autism-vs-ADHD difference). */
  attention: {
    zoneOutRisk: 'low' | 'medium' | 'high';
    engagementCuesEnabled: boolean;
    /** 0..1 — how aggressively to suppress non-essential notifications. */
    distractionFilteringLevel: number;
  };
  /** Group C — intervention rules (how the car responds in a hard moment). */
  intervention: {
    /** 0..1 — how high stress before the agent acts. */
    stressThreshold: number;
    /** 0..1 — how much overload before the agent acts. */
    overloadThreshold: number;
    preferredAlertChannel: 'visual' | 'haptic' | 'voice';
    /** The ladder, e.g. ['gentle_cue', 'firm_cue', 'suggest_pull_over']. */
    escalationSteps: string[];
  };
}

/** One frame of live, transient sensor input. Never persisted. */
export interface TelemetryFrame {
  /** Timestamp (ms). */
  t: number;
  gaze: { onRoad: boolean; scanEntropy: number; fixationMs: number };
  /** grip & tremor are 0..1. */
  biometrics: { heartRate: number; gripPressure: number; tremor: number };
  audioEvents: AudioEvent[];
}

export interface AudioEvent {
  type: 'siren' | 'horn' | 'tyre_screech';
  direction?: 'left' | 'right' | 'front' | 'rear';
  /** 0..1. */
  intensity: number;
}

/** The fused driver-state estimate. All values 0..1. */
export interface DriverState {
  stress: number;
  overload: number;
  attention: number;
}

/** What the cabin should do right now — the engine's decision, the act layer's input. */
export interface CabinDecisions {
  /** 0..1. */
  noiseCancelLevel: number;
  /** 0..1. */
  lightDimLevel: number;
  engagementCue: boolean;
  alert?: { stage: string; channel: 'visual' | 'haptic' | 'voice' };
  /** Safety-critical sounds kept/boosted even at max calming. */
  preservedSounds: AudioEvent[];
}

/**
 * A notification event — the visible trace of a controller decision. Producers
 * emit these; the notification layer renders ONE at a time (queued, never
 * stacked). `channel` is resolved from the profile before it reaches here.
 */
export interface NotificationEvent {
  id: string;
  type: 'safety_alert' | 'mode_change' | 'intervention' | 'reengagement' | 'indicator';
  severity: 'info' | 'warn' | 'critical';
  message: string;
  direction?: 'left' | 'right' | 'front' | 'rear';
  /** Resolved from profile.intervention.preferredAlertChannel. */
  channel: 'visual' | 'haptic' | 'voice';
  durationMs: number;
}

/** The four scripted demo scenarios the lead's control panel fires (build plan §5). */
export type ScenarioId = 'calm_drive' | 'stress_spike' | 'attention_drop' | 'siren_event';
