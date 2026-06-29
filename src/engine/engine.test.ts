import { describe, expect, it } from 'vitest';

import { decide } from './decide';
import { fuse } from './fuse';
import type { SupportProfile, TelemetryFrame } from '../types';

const profile: SupportProfile = {
	profileId: 'profile-1',
	version: 1,
	sensory: {
		noiseCancelStrength: 1,
		lightDimmingLevel: 1,
		temperaturePreferenceC: 22,
		hapticTolerance: 'medium',
	},
	attention: {
		zoneOutRisk: 'high',
		engagementCuesEnabled: true,
		distractionFilteringLevel: 1,
	},
	intervention: {
		stressThreshold: 0.3,
		overloadThreshold: 0.6,
		preferredAlertChannel: 'visual',
		escalationSteps: ['gentle_cue'],
	},
};

const baseFrame: TelemetryFrame = {
	t: 0,
	gaze: {
		onRoad: true,
		scanEntropy: 1,
		fixationMs: 0,
	},
	biometrics: {
		heartRate: 60,
		gripPressure: 0,
		tremor: 0,
	},
	audioEvents: [],
};

describe('engine', () => {
	it('heartRate 120 gives stress above 0.4', () => {
		const state = fuse({
			...baseFrame,
			biometrics: {
				...baseFrame.biometrics,
				heartRate: 120,
			},
		});

		expect(state.stress).toBeGreaterThan(0.4);
	});

	it('low attention with engagement cues enabled turns the cue on', () => {
		const state = fuse({
			...baseFrame,
			gaze: {
				onRoad: false,
				scanEntropy: 0.1,
				fixationMs: 2500,
			},
		});

		const decisions = decide(state, baseFrame, profile);

		expect(state.attention).toBeLessThan(0.4);
		expect(decisions.engagementCue).toBe(true);
	});

	it('preserves sirens even when overload is 1.0', () => {
		const frame: TelemetryFrame = {
			...baseFrame,
			audioEvents: [
				{
					type: 'siren',
					direction: 'front',
					intensity: 1,
				},
			],
		};

		const decisions = decide(
			{ stress: 0.9, overload: 1, attention: 0.8 },
			frame,
			profile,
		);

		expect(decisions.preservedSounds).toContainEqual(frame.audioEvents[0]);
	});
});
