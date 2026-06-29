import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import type { SupportProfile } from '@/types';

const TOTAL_STEPS = 5;

const stepLabels = [
  'Welcome',
  'Sensory comfort',
  'Attention support',
  'Intervention preferences',
  'Review and save',
];

type DraftProfile = {
  profileId?: SupportProfile['profileId'];
  version?: SupportProfile['version'];
  sensory?: Partial<SupportProfile['sensory']>;
  attention?: Partial<SupportProfile['attention']>;
  intervention?: Partial<SupportProfile['intervention']>;
};
type StarterKey = 'autism' | 'adhd' | 'audhd';
type HapticTolerance = SupportProfile['sensory']['hapticTolerance'];
type ZoneOutRisk = SupportProfile['attention']['zoneOutRisk'];
type PreferredAlertChannel = SupportProfile['intervention']['preferredAlertChannel'];

const sensoryDefaults: SupportProfile['sensory'] = {
  noiseCancelStrength: 0.5,
  lightDimmingLevel: 0.5,
  temperaturePreferenceC: 22,
  hapticTolerance: 'medium',
};

const attentionDefaults: SupportProfile['attention'] = {
  zoneOutRisk: 'medium',
  engagementCuesEnabled: true,
  distractionFilteringLevel: 0.5,
};

const interventionDefaults: SupportProfile['intervention'] = {
  stressThreshold: 0.65,
  overloadThreshold: 0.82,
  preferredAlertChannel: 'visual',
  escalationSteps: [],
};

const hapticOptions: HapticTolerance[] = ['low', 'medium', 'high'];
const zoneOutOptions: ZoneOutRisk[] = ['low', 'medium', 'high'];
const alertChannelOptions: Array<{
  value: PreferredAlertChannel;
  label: string;
  description: string;
}> = [
  {
    value: 'visual',
    label: 'Visual flash',
    description: 'A calm pulse on the dash when attention needs a visual nudge.',
  },
  {
    value: 'haptic',
    label: 'Haptic (vibration)',
    description: 'A gentle steering-wheel vibration when sound would feel too much.',
  },
  {
    value: 'voice',
    label: 'Calm voice',
    description: 'A short spoken cue when your eyes should stay on the road.',
  },
];

const starterProfiles: Record<
  StarterKey,
  {
    label: string;
    shortLabel: string;
    icon: string;
    draft: DraftProfile;
  }
> = {
  autism: {
    label: 'Autism',
    shortLabel: 'Starts with calmer sensory defaults',
    icon: '8',
    draft: {
      sensory: {
        noiseCancelStrength: 0.8,
        lightDimmingLevel: 0.7,
      },
      attention: {
        zoneOutRisk: 'low',
        engagementCuesEnabled: false,
      },
      intervention: {
        preferredAlertChannel: 'haptic',
      },
    },
  },
  adhd: {
    label: 'ADHD',
    shortLabel: 'Starts with engagement defaults',
    icon: 'A',
    draft: {
      sensory: {
        noiseCancelStrength: 0.4,
        lightDimmingLevel: 0.3,
      },
      attention: {
        zoneOutRisk: 'high',
        engagementCuesEnabled: true,
      },
      intervention: {
        preferredAlertChannel: 'voice',
      },
    },
  },
  audhd: {
    label: 'Both (AuDHD)',
    shortLabel: 'Balanced defaults, two extra questions',
    icon: 'B',
    draft: {
      sensory: {
        noiseCancelStrength: 0.7,
        lightDimmingLevel: 0.6,
      },
      attention: {
        zoneOutRisk: 'medium',
        engagementCuesEnabled: true,
      },
      intervention: {
        preferredAlertChannel: 'haptic',
      },
    },
  },
};

const starterOrder: StarterKey[] = ['autism', 'adhd', 'audhd'];

const formatLevel = (value: number) => value.toFixed(2);
const formatTemperature = (value: number) => `${value}°C`;
const formatToggle = (value: boolean) => (value ? 'On' : 'Off');

export function OnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<DraftProfile>({});
  const [selectedStarter, setSelectedStarter] = useState<StarterKey | null>(null);

  const currentLabel = stepLabels[step - 1];
  const canGoBack = step > 1;
  const isFirstStep = step === 1;
  const isFinalStep = step === TOTAL_STEPS;
  const sensoryDraft = {
    ...sensoryDefaults,
    ...draft.sensory,
  };
  const attentionDraft = {
    ...attentionDefaults,
    ...draft.attention,
  };
  const interventionDraft = {
    ...interventionDefaults,
    ...draft.intervention,
  };

  const updateSensory = <Key extends keyof SupportProfile['sensory']>(
    key: Key,
    value: SupportProfile['sensory'][Key],
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      sensory: {
        ...currentDraft.sensory,
        [key]: value,
      },
    }));
  };

  const updateAttention = <Key extends keyof SupportProfile['attention']>(
    key: Key,
    value: SupportProfile['attention'][Key],
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      attention: {
        ...currentDraft.attention,
        [key]: value,
      },
    }));
  };

  const updateIntervention = <Key extends keyof SupportProfile['intervention']>(
    key: Key,
    value: SupportProfile['intervention'][Key],
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      intervention: {
        ...currentDraft.intervention,
        [key]: value,
      },
    }));
  };

  const applyStarter = (starter: StarterKey) => {
    setSelectedStarter(starter);
    setDraft((currentDraft) => ({
      ...currentDraft,
      sensory: {
        ...currentDraft.sensory,
        ...starterProfiles[starter].draft.sensory,
      },
      attention: {
        ...currentDraft.attention,
        ...starterProfiles[starter].draft.attention,
      },
      intervention: {
        ...currentDraft.intervention,
        ...starterProfiles[starter].draft.intervention,
      },
    }));
  };

  const continueFromStarter = () => {
    if (selectedStarter) setStep(2);
  };

  const finishOnboarding = () => {
    const profile: SupportProfile = {
      profileId: crypto.randomUUID(),
      version: 1,
      sensory: sensoryDraft,
      attention: attentionDraft,
      intervention: {
        ...interventionDraft,
        escalationSteps: ['gentle_cue', 'firm_cue', 'suggest_pull_over'],
      },
    };

    useStore.getState().setProfile(profile);
    navigate('/dashboard');
  };

  const goToNextStep = () => {
    setStep((currentStep) => Math.min(TOTAL_STEPS, currentStep + 1));
  };

  return (
    <main className="bg-attune flex min-h-screen justify-center px-5 py-10 text-text sm:px-8">
      <section className="flex min-h-[calc(100vh-5rem)] w-full max-w-3xl flex-col">
        <p className="mb-12 font-sans text-2xl font-semibold tracking-labelWide text-text">
          ATTUNE
        </p>

        <div className="mb-10">
          <h1 className="max-w-xl font-sans text-5xl font-semibold leading-[1.08] text-text sm:text-6xl">
            Set up your Support Profile
          </h1>
        </div>

        <div className="mb-14 flex items-center gap-4">
          <p className="shrink-0 font-mono text-lg uppercase tracking-labelWide text-textDim">
            Step {step} / {TOTAL_STEPS}
          </p>
          <div className="grid w-full max-w-md grid-cols-5 gap-3">
            {Array.from({ length: TOTAL_STEPS }, (_, index) => {
              const isActive = index + 1 <= step;

              return (
                <span
                  key={index}
                  className={`h-2 rounded-full transition ${
                    isActive
                      ? 'bg-accent shadow-[0_0_22px_rgba(52,222,242,0.65)]'
                      : 'bg-white/10'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex-1">
          {isFirstStep ? (
            <div>
              <div className="mb-8">
                <h2 className="mb-4 font-sans text-3xl font-semibold leading-tight text-text sm:text-4xl">
                  What did your specialist diagnose?
                </h2>
                <p className="max-w-2xl text-xl leading-8 text-textDim">
                  This seeds your starting settings — you tune everything next.
                </p>
              </div>

              <div className="space-y-5">
                {starterOrder.map((starter) => {
                  const option = starterProfiles[starter];
                  const isSelected = selectedStarter === starter;

                  return (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => applyStarter(starter)}
                      className={`flex min-h-36 w-full items-center gap-6 rounded-card border p-7 text-left transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        isSelected
                          ? 'border-accent bg-surface shadow-[0_0_34px_rgba(52,222,242,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]'
                          : 'border-hairline bg-raised/30 hover:border-accent/70 hover:bg-raised/50'
                      }`}
                    >
                      <span
                        className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-inner border font-mono text-3xl ${
                          isSelected
                            ? 'border-accent text-accent shadow-[0_0_24px_rgba(52,222,242,0.24)]'
                            : 'border-hairline2 text-textDim'
                        }`}
                        aria-hidden="true"
                      >
                        {option.icon}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-3xl font-semibold leading-tight text-text">
                          {option.label}
                        </span>
                        <span className="mt-2 block max-w-md text-xl leading-7 text-textDim">
                          {option.shortLabel}
                        </span>
                      </span>

                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-2xl font-bold transition ${
                          isSelected
                            ? 'border-accent bg-accent text-onAccent shadow-[0_0_28px_rgba(52,222,242,0.75)]'
                            : 'border-hairline2 text-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mx-auto mt-16 max-w-lg text-center text-xl leading-8 text-textDim">
                <p>Your diagnosis only pre-fills settings.</p>
                <p className="font-semibold text-text">It is never stored.</p>
              </div>
            </div>
          ) : step === 2 ? (
            <div>
              <div className="mb-8">
                <h2 className="mb-4 font-sans text-3xl font-semibold leading-tight text-text sm:text-4xl">
                  Tune sensory comfort
                </h2>
                <p className="max-w-2xl text-xl leading-8 text-textDim">
                  Set the cabin baseline for noise, light, temperature, and touch feedback.
                </p>
              </div>

              <div className="space-y-5">
                <label className="block rounded-card border border-hairline bg-surface p-6 shadow-glass backdrop-blur">
                  <span className="flex items-start justify-between gap-6">
                    <span className="text-xl font-semibold leading-7 text-text">
                      How much should the cabin quiet background noise?
                    </span>
                    <span className="shrink-0 font-mono text-2xl text-accent">
                      {sensoryDraft.noiseCancelStrength.toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={sensoryDraft.noiseCancelStrength}
                    onChange={(event) =>
                      updateSensory('noiseCancelStrength', Number(event.target.value))
                    }
                    className="mt-7 h-3 w-full accent-accent"
                  />
                </label>

                <label className="block rounded-card border border-hairline bg-surface p-6 shadow-glass backdrop-blur">
                  <span className="flex items-start justify-between gap-6">
                    <span className="text-xl font-semibold leading-7 text-text">
                      Light dimming level
                    </span>
                    <span className="shrink-0 font-mono text-2xl text-accent">
                      {sensoryDraft.lightDimmingLevel.toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={sensoryDraft.lightDimmingLevel}
                    onChange={(event) =>
                      updateSensory('lightDimmingLevel', Number(event.target.value))
                    }
                    className="mt-7 h-3 w-full accent-accent"
                  />
                </label>

                <label className="block rounded-card border border-hairline bg-surface p-6 shadow-glass backdrop-blur">
                  <span className="flex items-start justify-between gap-6">
                    <span className="text-xl font-semibold leading-7 text-text">
                      Preferred cabin temperature
                    </span>
                    <span className="shrink-0 font-mono text-2xl text-accent">
                      {sensoryDraft.temperaturePreferenceC}°C
                    </span>
                  </span>
                  <input
                    type="range"
                    min="18"
                    max="26"
                    step="1"
                    value={sensoryDraft.temperaturePreferenceC}
                    onChange={(event) =>
                      updateSensory('temperaturePreferenceC', Number(event.target.value))
                    }
                    className="mt-7 h-3 w-full accent-accent"
                  />
                </label>

                <div className="rounded-card border border-hairline bg-surface p-6 shadow-glass backdrop-blur">
                  <div className="mb-5 flex items-start justify-between gap-6">
                    <p className="text-xl font-semibold leading-7 text-text">
                      Haptic feedback tolerance
                    </p>
                    <p className="shrink-0 font-mono text-2xl capitalize text-accent">
                      {sensoryDraft.hapticTolerance}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {hapticOptions.map((option) => {
                      const isSelected = sensoryDraft.hapticTolerance === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateSensory('hapticTolerance', option)}
                          className={`min-h-20 rounded-inner border px-5 text-xl font-semibold capitalize transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                            isSelected
                              ? 'border-accent bg-accent text-onAccent shadow-[0_0_28px_rgba(52,222,242,0.32)]'
                              : 'border-hairline2 bg-raised/30 text-textDim hover:border-accent/70 hover:text-text'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : step === 3 ? (
            <div>
              <div className="mb-8">
                <h2 className="mb-4 font-sans text-3xl font-semibold leading-tight text-text sm:text-4xl">
                  Tune attention support
                </h2>
                <p className="max-w-2xl text-xl leading-8 text-textDim">
                  Choose how Attune keeps the drive quiet without letting focus drift.
                </p>
              </div>

              <div className="space-y-5">
                <div className="rounded-card border border-hairline bg-surface p-6 shadow-glass backdrop-blur">
                  <div className="mb-5 flex items-start justify-between gap-6">
                    <p className="text-xl font-semibold leading-7 text-text">
                      Do quiet drives make you zone out?
                    </p>
                    <p className="shrink-0 font-mono text-2xl capitalize text-accent">
                      {attentionDraft.zoneOutRisk}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {zoneOutOptions.map((option) => {
                      const isSelected = attentionDraft.zoneOutRisk === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateAttention('zoneOutRisk', option)}
                          className={`min-h-20 rounded-inner border px-5 text-xl font-semibold capitalize transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                            isSelected
                              ? 'border-accent bg-accent text-onAccent shadow-[0_0_28px_rgba(52,222,242,0.32)]'
                              : 'border-hairline2 bg-raised/30 text-textDim hover:border-accent/70 hover:text-text'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-card border border-hairline bg-surface p-6 shadow-glass backdrop-blur">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="text-xl font-semibold leading-7 text-text">
                        Gentle cues to keep you engaged
                      </p>
                      <p className="mt-2 font-mono text-lg uppercase tracking-labelWide text-textDim">
                        {attentionDraft.engagementCuesEnabled ? 'On' : 'Off'}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={attentionDraft.engagementCuesEnabled}
                      onClick={() =>
                        updateAttention(
                          'engagementCuesEnabled',
                          !attentionDraft.engagementCuesEnabled,
                        )
                      }
                      className={`flex h-16 w-32 shrink-0 items-center rounded-full border p-2 transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        attentionDraft.engagementCuesEnabled
                          ? 'border-accent bg-accent/20 shadow-[0_0_28px_rgba(52,222,242,0.28)]'
                          : 'border-hairline2 bg-raised/40'
                      }`}
                    >
                      <span
                        className={`h-12 w-12 rounded-full transition duration-300 ${
                          attentionDraft.engagementCuesEnabled
                            ? 'translate-x-16 bg-accent shadow-[0_0_18px_rgba(52,222,242,0.65)]'
                            : 'translate-x-0 bg-textDim'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <label className="block rounded-card border border-hairline bg-surface p-6 shadow-glass backdrop-blur">
                  <span className="flex items-start justify-between gap-6">
                    <span className="text-xl font-semibold leading-7 text-text">
                      How aggressively should we mute non-essential notifications?
                    </span>
                    <span className="shrink-0 font-mono text-2xl text-accent">
                      {attentionDraft.distractionFilteringLevel.toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={attentionDraft.distractionFilteringLevel}
                    onChange={(event) =>
                      updateAttention('distractionFilteringLevel', Number(event.target.value))
                    }
                    className="mt-7 h-3 w-full accent-accent"
                  />
                </label>
              </div>
            </div>
          ) : step === 4 ? (
            <div>
              <div className="mb-8">
                <h2 className="mb-4 font-sans text-3xl font-semibold leading-tight text-text sm:text-4xl">
                  Choose alert style
                </h2>
                <p className="max-w-2xl text-xl leading-8 text-textDim">
                  Pick the channel Attune should use first when it needs your attention.
                </p>
              </div>

              <div className="grid gap-5">
                {alertChannelOptions.map((option) => {
                  const isSelected =
                    interventionDraft.preferredAlertChannel === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateIntervention('preferredAlertChannel', option.value)
                      }
                      className={`flex min-h-32 w-full items-center gap-6 rounded-card border p-7 text-left transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        isSelected
                          ? 'border-accent bg-surface shadow-[0_0_34px_rgba(52,222,242,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]'
                          : 'border-hairline bg-raised/30 hover:border-accent/70 hover:bg-raised/50'
                      }`}
                    >
                      <span
                        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border font-mono text-2xl uppercase ${
                          isSelected
                            ? 'border-accent bg-accent text-onAccent shadow-[0_0_24px_rgba(52,222,242,0.45)]'
                            : 'border-hairline2 text-textDim'
                        }`}
                        aria-hidden="true"
                      >
                        {option.value.slice(0, 1)}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-2xl font-semibold leading-tight text-text">
                          {option.label}
                        </span>
                        <span className="mt-2 block text-lg leading-7 text-textDim">
                          {option.description}
                        </span>
                      </span>

                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xl font-bold transition ${
                          isSelected
                            ? 'border-accent bg-accent text-onAccent shadow-[0_0_24px_rgba(52,222,242,0.65)]'
                            : 'border-hairline2 text-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : step === 5 ? (
            <div>
              <div className="mb-8">
                <h2 className="mb-4 font-sans text-3xl font-semibold leading-tight text-text sm:text-4xl">
                  Review your Support Profile
                </h2>
                <p className="max-w-2xl text-xl leading-8 text-textDim">
                  These settings are saved as preferences, not medical records.
                </p>
              </div>

              <div className="space-y-5">
                <section className="rounded-card border border-hairline bg-surface p-6 shadow-glass backdrop-blur">
                  <h3 className="mb-5 font-sans text-2xl font-semibold text-text">
                    Sensory
                  </h3>
                  <dl className="space-y-4">
                    <div className="flex items-center justify-between gap-6 border-b border-hairline pb-4">
                      <dt className="text-lg text-textDim">Noise quieting</dt>
                      <dd className="font-mono text-xl text-accent">
                        {formatLevel(sensoryDraft.noiseCancelStrength)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-6 border-b border-hairline pb-4">
                      <dt className="text-lg text-textDim">Light dimming</dt>
                      <dd className="font-mono text-xl text-accent">
                        {formatLevel(sensoryDraft.lightDimmingLevel)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-6 border-b border-hairline pb-4">
                      <dt className="text-lg text-textDim">Temperature</dt>
                      <dd className="font-mono text-xl text-accent">
                        {formatTemperature(sensoryDraft.temperaturePreferenceC)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <dt className="text-lg text-textDim">Haptic tolerance</dt>
                      <dd className="font-mono text-xl capitalize text-accent">
                        {sensoryDraft.hapticTolerance}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-card border border-hairline bg-surface p-6 shadow-glass backdrop-blur">
                  <h3 className="mb-5 font-sans text-2xl font-semibold text-text">
                    Attention
                  </h3>
                  <dl className="space-y-4">
                    <div className="flex items-center justify-between gap-6 border-b border-hairline pb-4">
                      <dt className="text-lg text-textDim">Zone-out risk</dt>
                      <dd className="font-mono text-xl capitalize text-accent">
                        {attentionDraft.zoneOutRisk}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-6 border-b border-hairline pb-4">
                      <dt className="text-lg text-textDim">Engagement cues</dt>
                      <dd className="font-mono text-xl text-accent">
                        {formatToggle(attentionDraft.engagementCuesEnabled)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <dt className="text-lg text-textDim">Notification filtering</dt>
                      <dd className="font-mono text-xl text-accent">
                        {formatLevel(attentionDraft.distractionFilteringLevel)}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-card border border-hairline bg-surface p-6 shadow-glass backdrop-blur">
                  <h3 className="mb-5 font-sans text-2xl font-semibold text-text">
                    Alerts
                  </h3>
                  <dl className="space-y-4">
                    <div className="flex items-center justify-between gap-6 border-b border-hairline pb-4">
                      <dt className="text-lg text-textDim">Preferred channel</dt>
                      <dd className="font-mono text-xl capitalize text-accent">
                        {interventionDraft.preferredAlertChannel}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-6 border-b border-hairline pb-4">
                      <dt className="text-lg text-textDim">Stress threshold</dt>
                      <dd className="font-mono text-xl text-accent">
                        {formatLevel(interventionDraft.stressThreshold)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <dt className="text-lg text-textDim">Overload threshold</dt>
                      <dd className="font-mono text-xl text-accent">
                        {formatLevel(interventionDraft.overloadThreshold)}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </div>
          ) : (
            <div className="rounded-card border border-hairline bg-surface p-8 shadow-glass backdrop-blur">
              <h2 className="mb-3 font-sans text-3xl font-semibold">{currentLabel}</h2>
              <p className="text-textDim">This step is ready for the next build pass.</p>
            </div>
          )}
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-[220px_1fr]">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() => setStep((currentStep) => Math.max(1, currentStep - 1))}
            className="min-h-20 rounded-full border border-hairline px-8 text-xl font-semibold text-textDim transition hover:border-accent hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          <button
            type="button"
            disabled={isFirstStep && !selectedStarter}
            onClick={
              isFinalStep
                ? finishOnboarding
                : isFirstStep
                  ? continueFromStarter
                  : goToNextStep
            }
            className="min-h-20 rounded-full bg-accent px-8 text-xl font-semibold text-onAccent shadow-[0_0_34px_rgba(52,222,242,0.32)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isFinalStep ? 'Finish' : 'Continue →'}
          </button>
        </div>
      </section>
    </main>
  );
}

export default function Onboarding() {
  return <OnboardingWizard />;
}
