import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { Notifications } from '@/features/notifications';

/**
 * STUB — owned by team 01 (Visuals). The live dashboard: landscape 16:9, two
 * halves — LEFT = SENSE (driver-state gauges), RIGHT = ACT (cabin response).
 * Reads everything from the store; renders nothing the engine doesn't decide.
 * This stub just proves the data is flowing end-to-end today.
 */
export default function Dashboard() {
  const driverState = useStore((s) => s.driverState);
  const decisions = useStore((s) => s.decisions);
  const profile = useStore((s) => s.profile);
  const scenario = useStore((s) => s.activeScenario);

  return (
    <main className="bg-attune min-h-screen p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-sans text-xl font-semibold tracking-label">ATTUNE</h1>
        <div className="flex gap-3 font-mono text-[11px] uppercase text-textDim">
          <span>SCENARIO · {scenario}</span>
          {profile && <span>PROFILE v{profile.version}</span>}
          <Link to="/cabin" className="text-accent">/cabin →</Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-6">
        {/* LEFT — SENSE (stub readout) */}
        <section className="card-attune">
          <p className="label-attune mb-4">Sense · Driver State</p>
          <ul className="space-y-2 font-mono text-text">
            <li>stress · {fmt(driverState?.stress)}</li>
            <li>overload · {fmt(driverState?.overload)}</li>
            <li>attention · {fmt(driverState?.attention)}</li>
          </ul>
        </section>

        {/* RIGHT — ACT (stub readout) */}
        <section className="card-attune">
          <p className="label-attune mb-4">Act · Cabin Response</p>
          <ul className="space-y-2 font-mono text-text">
            <li>noiseCancel · {fmt(decisions?.noiseCancelLevel)}</li>
            <li>lightDim · {fmt(decisions?.lightDimLevel)}</li>
            <li>engagementCue · {decisions?.engagementCue ? 'on' : 'off'}</li>
            <li>alert · {decisions?.alert ? `${decisions.alert.stage} (${decisions.alert.channel})` : '—'}</li>
          </ul>
        </section>
      </div>

      <Notifications />
    </main>
  );
}

const fmt = (n: number | undefined) => (n == null ? '—' : n.toFixed(2));
