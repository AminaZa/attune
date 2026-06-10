import type { ScenarioId } from '@/types';

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
