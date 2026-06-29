import { Link } from 'react-router-dom';

/**
 * STUB — owned by team 03 (Onboarding). The setup wizard that builds the
 * Support Profile (brief §4.2). Replace this with the real wizard; write the
 * finished profile with `useStore.getState().setProfile(profile)`.
 */
export default function Onboarding() {
  return (
    <main className="bg-attune min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <p className="label-attune">Setup · Support Profile</p>
      <h1 className="font-sans text-3xl font-semibold text-text">Onboarding</h1>
      <p className="max-w-md text-textDim">
        Stub screen — team 03 builds the wizard here. It captures sensory &amp; attention
        preferences and calls <code className="font-mono text-accent">setProfile()</code>.
      </p>
      <Link
        to="/dashboard"
        className="rounded-full bg-accent px-6 py-3 font-semibold text-onAccent"
      >
        Skip to dashboard →
      </Link>
    </main>
  );
}
