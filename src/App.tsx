import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Onboarding } from '@/features/onboarding';
import { Dashboard } from '@/features/dashboard';
import { Cabin } from '@/features/cabin';
import { Audio } from '@/features/audio';
import { ScenarioPanel } from '@/data';
import { startEngine } from '@/engine/startEngine';
import { DUMMY_PROFILE } from '@/engine/stub';
import { getStore } from '@/store';

/**
 * App shell + routing (lead). Routes:
 *   /          → Onboarding (setup wizard, builds the Support Profile)
 *   /dashboard → Dashboard (live SENSE | ACT)
 *   /cabin     → Cabin (FPV ambient-light view, for the projector)
 *
 * Boots team 02's real engine (fuse → decide → loop), which plays the lead's
 * scenario feed into the store. We seed the dummy Support Profile if onboarding
 * hasn't run, so opening straight to /dashboard still renders (the real engine
 * skips ticking until a profile exists). Everything downstream just reads the store.
 */
export default function App() {
  useEffect(() => {
    if (!getStore().profile) {
      // Demo fallback profile uses the VOICE channel so the spoken cues
      // (stress / re-engagement / siren) fire when running without onboarding.
      getStore().setProfile({
        ...DUMMY_PROFILE,
        intervention: { ...DUMMY_PROFILE.intervention, preferredAlertChannel: 'voice' },
      });
    }
    const stop = startEngine();
    return stop;
  }, []);

  return (
    <BrowserRouter>
      {/* Demo remote + audio showpiece — always available (drag / minimize),
          but hidden on the onboarding page so the setup flow stays clean. */}
      <ControlChrome />
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cabin" element={<Cabin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * The always-mounted demo chrome. Kept mounted across routes so the audio graph
 * survives navigation, but hidden on the onboarding page (`/`) so the setup
 * wizard stays uncluttered.
 */
function ControlChrome() {
  const { pathname } = useLocation();
  const hidden = pathname === '/';
  return (
    <>
      <Audio hidden={hidden} />
      <ScenarioPanel hidden={hidden} />
    </>
  );
}
