import { Link } from 'react-router-dom';
import { useStore } from '@/store';

/**
 * STUB — owned by team 01 (Visuals). The FPV ambient-light cabin view, route
 * `/cabin`, sized for the projector. A dark first-person cabin photo + overlaid
 * blurred glow shapes whose color/opacity bind to store state (design §6):
 * calm baseline = warm `ambient`; calming intervention = teal `ambientCalm`;
 * engagement cue = brief `engage` violet breath.
 *
 * This stub just maps the live decisions to one glow so cross-tab sync is
 * visible today: open /dashboard in one tab and /cabin in another.
 */
export default function Cabin() {
  const decisions = useStore((s) => s.decisions);
  const calming = (decisions?.lightDimLevel ?? 0) > 0.5;
  const glow = decisions?.engagementCue
    ? 'var(--engage, #A78BFA)'
    : calming
      ? '#2DD4BF' // ambientCalm
      : '#FFB36B'; // ambient

  return (
    <main className="bg-attune relative min-h-screen overflow-hidden">
      {/* Placeholder ambient glow — real version traces dash line / door panels / footwell. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: glow, opacity: 0.28, filter: 'blur(120px)' }}
      />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="label-attune">FPV · Cabin</p>
        <h1 className="font-sans text-3xl font-semibold text-text">/cabin</h1>
        <p className="max-w-md text-textDim">
          Stub FPV view — team 01 builds the ambient-light cabin here. The glow already
          tracks the shared store, so this mirrors the dashboard tab live.
        </p>
        <Link to="/dashboard" className="font-mono text-sm text-accent">← /dashboard</Link>
      </div>
    </main>
  );
}
