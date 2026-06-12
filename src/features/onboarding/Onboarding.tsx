import { useState } from 'react';
import type { SupportProfile } from '@/types';

const TOTAL_STEPS = 5;

const stepLabels = [
  'Welcome',
  'Sensory comfort',
  'Attention support',
  'Intervention preferences',
  'Review and save',
];

type DraftProfile = Partial<SupportProfile>;

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [draft] = useState<DraftProfile>({});

  const currentLabel = stepLabels[step - 1];
  const canGoBack = step > 1;
  const canGoNext = step < TOTAL_STEPS;

  return (
    <main className="bg-attune flex min-h-screen items-center justify-center p-8 text-text">
      <section className="w-full max-w-2xl rounded-card border border-hairline bg-surface p-8 shadow-glass backdrop-blur">
        <div className="mb-8 flex items-center justify-between gap-4">
          <p className="label-attune">Setup · Support Profile</p>
          <p className="font-mono text-sm text-textDim">
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>

        <div className="mb-8 h-2 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="mb-10">
          <h1 className="mb-3 font-sans text-3xl font-semibold">{currentLabel}</h1>
          <p className="text-textDim">
            Placeholder for step {step}. This is where the wizard will collect this part
            of the Support Profile.
          </p>
        </div>

        <pre className="mb-8 max-h-40 overflow-auto rounded-2xl border border-hairline bg-black/20 p-4 font-mono text-xs text-textDim">
          {JSON.stringify(draft, null, 2)}
        </pre>

        <div className="flex justify-between gap-4">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() => setStep((currentStep) => Math.max(1, currentStep - 1))}
            className="rounded-full border border-hairline px-6 py-3 font-semibold text-text transition hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => setStep((currentStep) => Math.min(TOTAL_STEPS, currentStep + 1))}
            className="rounded-full bg-accent px-6 py-3 font-semibold text-onAccent transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}

export default function Onboarding() {
  return <OnboardingWizard />;
}
