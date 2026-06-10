import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Onboarding } from '@/features/onboarding';
import { Dashboard } from '@/features/dashboard';
import { Cabin } from '@/features/cabin';
import { Audio } from '@/features/audio';
import { startStubEngine } from '@/engine/stub';

/**
 * App shell + routing (lead). Routes:
 *   /          → Onboarding (setup wizard, builds the Support Profile)
 *   /dashboard → Dashboard (live SENSE | ACT)
 *   /cabin     → Cabin (FPV ambient-light view, for the projector)
 *
 * Boots the reference stub engine so the app runs end-to-end today. When team
 * 02's real engine + the lead's scenario feed land, swap the bootstrap here —
 * everything downstream just reads the store.
 */
export default function App() {
  useEffect(() => {
    const stop = startStubEngine();
    return stop;
  }, []);

  return (
    <BrowserRouter>
      {/* Mounted app-wide: the audio showpiece reacts to store decisions. */}
      <Audio />
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cabin" element={<Cabin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
