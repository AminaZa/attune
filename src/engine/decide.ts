import type { CabinDecisions, DriverState, SupportProfile, TelemetryFrame } from '../types';

export function decide(
	state: DriverState,
	frame: TelemetryFrame,
	profile: SupportProfile,
): CabinDecisions {
	const alert =
		state.stress > profile.intervention.stressThreshold
			? {
					stage:
						state.stress > profile.intervention.stressThreshold + 0.2
							? 'firm_cue'
							: 'gentle_cue',
					channel: profile.intervention.preferredAlertChannel,
				}
			: undefined;

	return {
		noiseCancelLevel: state.overload,
		lightDimLevel: state.stress,
		engagementCue: state.attention < 0.4 && profile.attention.engagementCuesEnabled,
		alert,
		preservedSounds: frame.audioEvents,
	};
}
