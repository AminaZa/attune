import { useStore } from '@/store';

/**
 * STUB — owned by the lead. The audio showpiece: a Web Audio mix of a cabin-drone
 * layer + a siren/horn layer. As `noiseCancelLevel` rises, duck the drone gain
 * while the siren punches through — "quiet the cabin, keep the siren"
 * (dev-decisions §3). Do NOT build real ANC; demonstrate the decision logic.
 *
 * This stub is mount-only (no audio yet) so the tree compiles. It exposes the
 * decision it would act on.
 */
export default function Audio() {
  const noiseCancel = useStore((s) => s.decisions?.noiseCancelLevel ?? 0);
  // Real version: droneGain = 1 - noiseCancel; sirenGain stays full/boosted.
  void noiseCancel;
  return null;
}
