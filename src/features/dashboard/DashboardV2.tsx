import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { Notifications } from '@/features/notifications';
import { GaugeRing } from './GaugeRing';
import {
  NoiseCancelPanel,
  LightingPanel,
  AlertPanel,
  EngagementPanel,
  SafetySoundPanel,
} from './CabinPanels';

export default function DashboardV2() {
  const driverState = useStore((s) => s.driverState);
  const decisions   = useStore((s) => s.decisions);
  const profile     = useStore((s) => s.profile);
  const scenario    = useStore((s) => s.activeScenario);

  return (
    <div className="bg-attune flex h-screen flex-col overflow-hidden select-none">

      {/* ── Title bar ─────────────────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-hairline px-6">
        <div className="flex items-center gap-3">
          <StatusDot />
          {/* Wordmark: champagne non-state chrome. text-base for 4m legibility. */}
          <span className="font-sans text-base font-semibold tracking-label text-champagne">
            ATTUNE
          </span>
          <span className="text-textMute">—</span>
          <span className="font-sans text-sm text-textDim">Adaptive Cabin</span>
        </div>

        <div className="flex items-center gap-4">
          <StatusChip label="SCENARIO" value={scenario.replace(/_/g, ' ').toUpperCase()} />
          {profile && <StatusChip label="PROFILE" value={`v${profile.version}`} />}
          <Link
            to="/cabin"
            className="font-mono text-[11px] tracking-label text-accent
                       hover:text-text transition-colors duration-200
                       focus-visible:outline-none focus-visible:ring-1
                       focus-visible:ring-accent focus-visible:ring-offset-1
                       focus-visible:ring-offset-transparent rounded-sm"
          >
            ⬚ /CABIN →
          </Link>
        </div>
      </header>

      {/* ── Two-zone grid ─────────────────────────────────────────────────── */}
      {/* p-6 gap-6 = 24px — aligned with card padding per §3 */}
      <main className="flex min-h-0 flex-1 gap-6 p-6">

        {/* LEFT — SENSE · Driver State */}
        <section className="card-attune flex min-h-0 flex-1 flex-col">
          <ZoneHeader title="DRIVER STATE" zone="SENSE" />

          {/* gap-4 = 16px between gauges — on the 8px grid */}
          <div className="mt-6 flex min-h-0 flex-1 flex-col gap-4">
            <GaugeRing
              label="STRESS"
              value={driverState?.stress ?? 0}
              ramp="rising"
            />
            <GaugeRing
              label="OVERLOAD"
              value={driverState?.overload ?? 0}
              ramp="rising"
            />
            <GaugeRing
              label="ATTENTION"
              value={driverState?.attention ?? 0}
              ramp="attention"
            />
          </div>
        </section>

        {/* RIGHT — ACT · Cabin Response */}
        <section className="card-attune flex min-h-0 flex-1 flex-col">
          <ZoneHeader title="CABIN RESPONSE" zone="ACT" />

          {/* gap-3 = 12px between panels — keeps five panels from crowding */}
          <div className="mt-6 flex min-h-0 flex-1 flex-col gap-3">
            <NoiseCancelPanel level={decisions?.noiseCancelLevel ?? 0} />
            <LightingPanel    level={decisions?.lightDimLevel ?? 0} />
            <AlertPanel       alert={decisions?.alert} />
            <EngagementPanel  active={decisions?.engagementCue ?? false} />
            <SafetySoundPanel sounds={decisions?.preservedSounds ?? []} />
          </div>
        </section>
      </main>

      <Notifications />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout atoms
// ─────────────────────────────────────────────────────────────────────────────

function StatusDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-calm opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-calm" />
    </span>
  );
}

function StatusChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="font-mono text-[11px] tracking-label">
      <span className="text-textMute">{label} · </span>
      <span className="text-accent">{value}</span>
    </span>
  );
}

function ZoneHeader({ title, zone }: { title: string; zone: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-hairline pb-3">
      <span className="label-attune">{title}</span>
      <span className="font-mono text-[10px] tracking-labelWide text-accent">{zone}</span>
    </div>
  );
}
