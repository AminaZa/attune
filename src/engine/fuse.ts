import type { DriverState, TelemetryFrame } from '../types';

export function clamp01(x: number): number {
	return Math.min(1, Math.max(0, x));
}

export function fuse(frame: TelemetryFrame): DriverState {
	const maxAudioIntensity = frame.audioEvents.reduce(
		(max, event) => Math.max(max, event.intensity),
		0,
	);

	const stress = clamp01(
		0.5 * ((frame.biometrics.heartRate - 60) / 60) +
			0.3 * frame.biometrics.gripPressure +
			0.2 * frame.biometrics.tremor,
	);

	const overload = clamp01(0.6 * stress + 0.4 * maxAudioIntensity);

	const attention = clamp01(
		1.0 -
			(frame.gaze.onRoad ? 0 : 0.4) -
			(frame.gaze.fixationMs > 2000 ? 0.3 : 0) -
			(frame.gaze.scanEntropy < 0.2 ? 0.3 : 0),
	);

	return { stress, overload, attention };
}
