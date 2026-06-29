import type { ScenarioId, TelemetryFrame } from '@/types';

/**
 * STUB — owned by the lead. The scripted scenario data feed + demo control panel
 * (build plan §5). Each scenario scripts a telemetry timeline the presenter fires
 * on cue: calm_drive · stress_spike · attention_drop · siren_event. For Day-1 the
 * reference stub engine (src/engine/stub.ts) drives the store instead; this file
 * is where the real scriptable feed lands.
 */
export const SCENARIOS: ScenarioId[] = [
  'calm_drive',
  'stress_spike',
  'attention_drop',
  'siren_event',
];

/**
 * Scenario frame data — keyed by ScenarioId. Each is a list of TelemetryFrames
 * that the engine steps through at 100ms intervals. Placeholder data; the lead
 * will replace these with real recordings or fine-tuned timelines.
 */
export const SCENARIO_FRAMES: Record<ScenarioId, TelemetryFrame[]> = {
  calm_drive: [
    {
      t: 0,
      gaze: { onRoad: true, scanEntropy: 0.6, fixationMs: 400 },
      biometrics: { heartRate: 65, gripPressure: 0.2, tremor: 0.05 },
      audioEvents: [],
    },
    {
      t: 100,
      gaze: { onRoad: true, scanEntropy: 0.65, fixationMs: 450 },
      biometrics: { heartRate: 67, gripPressure: 0.22, tremor: 0.06 },
      audioEvents: [],
    },
    {
      t: 200,
      gaze: { onRoad: true, scanEntropy: 0.62, fixationMs: 420 },
      biometrics: { heartRate: 66, gripPressure: 0.21, tremor: 0.05 },
      audioEvents: [],
    },
  ],

  stress_spike: [
    {
      t: 0,
      gaze: { onRoad: true, scanEntropy: 0.5, fixationMs: 600 },
      biometrics: { heartRate: 90, gripPressure: 0.6, tremor: 0.3 },
      audioEvents: [],
    },
    {
      t: 100,
      gaze: { onRoad: true, scanEntropy: 0.45, fixationMs: 700 },
      biometrics: { heartRate: 110, gripPressure: 0.75, tremor: 0.45 },
      audioEvents: [],
    },
    {
      t: 200,
      gaze: { onRoad: true, scanEntropy: 0.4, fixationMs: 800 },
      biometrics: { heartRate: 120, gripPressure: 0.8, tremor: 0.5 },
      audioEvents: [],
    },
  ],

  attention_drop: [
    {
      t: 0,
      gaze: { onRoad: true, scanEntropy: 0.6, fixationMs: 400 },
      biometrics: { heartRate: 68, gripPressure: 0.25, tremor: 0.05 },
      audioEvents: [],
    },
    {
      t: 100,
      gaze: { onRoad: false, scanEntropy: 0.3, fixationMs: 1500 },
      biometrics: { heartRate: 70, gripPressure: 0.27, tremor: 0.06 },
      audioEvents: [],
    },
    {
      t: 200,
      gaze: { onRoad: false, scanEntropy: 0.15, fixationMs: 2500 },
      biometrics: { heartRate: 72, gripPressure: 0.28, tremor: 0.07 },
      audioEvents: [],
    },
  ],

  siren_event: [
    {
      t: 0,
      gaze: { onRoad: true, scanEntropy: 0.6, fixationMs: 400 },
      biometrics: { heartRate: 70, gripPressure: 0.25, tremor: 0.05 },
      audioEvents: [],
    },
    {
      t: 100,
      gaze: { onRoad: true, scanEntropy: 0.5, fixationMs: 500 },
      biometrics: { heartRate: 95, gripPressure: 0.65, tremor: 0.35 },
      audioEvents: [
        {
          type: 'siren',
          direction: 'front',
          intensity: 0.9,
        },
      ],
    },
    {
      t: 200,
      gaze: { onRoad: true, scanEntropy: 0.4, fixationMs: 600 },
      biometrics: { heartRate: 110, gripPressure: 0.7, tremor: 0.4 },
      audioEvents: [
        {
          type: 'siren',
          direction: 'front',
          intensity: 0.95,
        },
      ],
    },
  ],
};
