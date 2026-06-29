import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Onboarding } from '@/features/onboarding';
import { Dashboard } from '@/features/dashboard';
import { Cabin } from '@/features/cabin';
import { Audio } from '@/features/audio';
import { ScenarioPanel } from '@/data';
import { startEngine } from '@/engine/startEngine';
import { DUMMY_PROFILE } from '@/engine/stub';
import { getStore } from '@/store';

/**
 * The demo remote (ScenarioPanel) is gated behind the `?control` query param so
 * it shows only on the laptop's control tab and never on the projector's `/cabin`
 * tab. Read once at module load — the presenter opens the control tab with the
 * flag and the projector tab without it.
 */
const SHOW_CONTROL =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('control');

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
      {/* Mounted app-wide: the audio showpiece reacts to store decisions. */}
      <Audio />
      {/* Lead's demo remote — only when the URL carries ?control. */}
      {SHOW_CONTROL && <ScenarioPanel />}
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cabin" element={<Cabin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
