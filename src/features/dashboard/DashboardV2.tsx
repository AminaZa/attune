import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { Notifications } from '@/features/notifications';
import { GaugeRing } from './GaugeRing';
import {
  NoiseCancelPanel,
  LightingPanel,
  GentleCuePanel,
  EngagementPanel,
  SafetySoundPanel,
} from './CabinPanels';

// ─────────────────────────────────────────────────────────────────────────────
// DashboardV2 — SENSE | ACT cockpit, pixel-matched to
// attune-mock-dashboard-v2-cyan.png (source: mockups-v2/dashboard-a.html).
//
// Authored in a fixed 1920×1080 stage scaled to cover the viewport (same recipe
// as /cabin) so geometry matches the render exactly. Every value flows from the
// shared store; the stub/real engine drives it ~10×/sec.
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT = '#34DEF2';
const CALM   = '#2FE0A0';
const ALERT  = '#FF5765';
const DIM    = '#7E8A9B';
const DIM2   = '#586473';
const CHAMP  = '#D8C6A6';
const HAIR   = 'rgba(255,255,255,0.075)';

function useCoverScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => setScale(Math.max(window.innerWidth / 1920, window.innerHeight / 1080));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}

export default function DashboardV2() {
  const driverState = useStore((s) => s.driverState);
  const decisions   = useStore((s) => s.decisions);
  const profile     = useStore((s) => s.profile);
  const scenario    = useStore((s) => s.activeScenario);
  const scale = useCoverScale();

  const stress    = driverState?.stress ?? 0;
  const overload  = driverState?.overload ?? 0;
  const attention = driverState?.attention ?? 0;

  const heartRate = Math.round(60 + stress * 72);
  const grip      = stress.toFixed(2);
  const tremor    = Math.min(1, overload * 0.4).toFixed(2);
  const onRoad    = attention >= 0.5;

  const channel = profile?.intervention.preferredAlertChannel ?? 'visual';
  const isSirenScenario = scenario === 'siren_event';

  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{ background: '#04060B' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1920, height: 1080,
        transform: `translate(-50%,-50%) scale(${scale})`, transformOrigin: 'center center',
        background: [
          'radial-gradient(1200px 760px at 86% 6%, rgba(34,180,200,0.16), transparent 64%)',
          'radial-gradient(1300px 900px at 8% 96%, rgba(56,72,150,0.20), transparent 66%)',
          'radial-gradient(900px 520px at 50% 120%, rgba(15,90,110,0.10), transparent 70%)',
          'linear-gradient(150deg,#0B1422 0%, #070C15 46%, #04060B 100%)',
        ].join(','),
        fontFamily: "'Instrument Sans', sans-serif", color: '#EAF0F6' }}
      >
        {/* ══ TOP RAIL ═══════════════════════════════════════════════════════ */}
        <div className="flex items-center" style={{ height: 74, padding: '0 40px', gap: 28, borderBottom: `1px solid ${HAIR}`,
          background: 'linear-gradient(180deg, rgba(12,18,28,.6), transparent)' }}>
          <span className="font-sans" style={{ fontWeight: 700, letterSpacing: '0.42em', fontSize: 19, color: '#F2F6FA' }}>
            ATTUNE<span style={{ color: ACCENT }}>.</span>
          </span>
          <span className="font-sans uppercase" style={{ fontSize: 11, letterSpacing: '0.34em', color: DIM2, marginLeft: 2 }}>Adaptive Cabin</span>
          <span style={{ flex: 1 }} />
          <Chip siren={isSirenScenario}>
            <Led color={isSirenScenario ? ALERT : ACCENT} />
            <span>Scenario · </span><b style={{ color: '#EAF0F6', fontWeight: 600 }}>{scenario.replace(/_/g, ' ')}</b>
          </Chip>
          <Chip>
            <Led color={ACCENT} />
            <span>Profile </span><b style={{ color: '#EAF0F6', fontWeight: 600 }}>v{profile?.version ?? 1}</b><span>&nbsp;· Calm-lean</span>
          </Chip>
          <span style={{ flex: 1 }} />
          <span className="flex items-center uppercase" style={{ gap: 10, fontSize: 11, letterSpacing: '0.26em', color: CALM }}>
            <Led color={CALM} />Agent Active
          </span>
          <Clock />
          <Link to="/cabin" className="font-mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: ACCENT, marginLeft: 8 }}>
            /CABIN →
          </Link>
        </div>

        {/* ══ BODY (SENSE | ACT) ═════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '840px 1fr', gap: 26, padding: '30px 40px 0' }}>

          {/* ── LEFT · SENSE ───────────────────────────────────────────────── */}
          <section>
            <PanelHead title="Driver State" zone="SENSE" zoneColor={ACCENT} side="Live Fusion" />

            {/* gauges card */}
            <Card>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, padding: '30px 26px 26px' }}>
                <GaugeRing label="STRESS"    value={stress}    ramp="rising" />
                <GaugeRing label="OVERLOAD"  value={overload}  ramp="rising" />
                <GaugeRing label="ATTENTION" value={attention} ramp="attention" />
              </div>
            </Card>

            {/* telemetry card */}
            <div style={{ marginTop: 22 }}>
              <Card>
                <div style={{ padding: '22px 26px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
                    <Tel label="Heart Rate" value={String(heartRate)} unit="bpm" first />
                    <Tel label="Grip"   value={grip} />
                    <Tel label="Tremor" value={tremor} />
                    <Tel label="Gaze"   value={onRoad ? 'ON ROAD' : 'OFF ROAD'} num={false}
                         color={onRoad ? CALM : '#FFB454'} />
                  </div>
                  <div className="flex items-center" style={{ marginTop: 20, paddingTop: 16, borderTop: `1px dashed ${HAIR}`, gap: 10 }}>
                    <LockGlyph />
                    <span className="font-mono uppercase" style={{ fontSize: 11.5, letterSpacing: '0.12em', color: DIM2 }}>
                      Transient · Live biometrics never stored
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* ── RIGHT · ACT (bento) ────────────────────────────────────────── */}
          <section>
            <PanelHead title="Cabin Response" zone="ACT" zoneColor={CALM} side="Auto-Tuned" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto', gap: 18 }}>
              <NoiseCancelPanel level={decisions?.noiseCancelLevel ?? 0} />
              <LightingPanel level={decisions?.lightDimLevel ?? 0} />
              <GentleCuePanel alert={decisions?.alert} channel={channel} />
              <EngagementPanel active={decisions?.engagementCue ?? false} attentionLow={attention < 0.4} />
              <SafetySoundPanel sounds={decisions?.preservedSounds ?? []} />
            </div>
          </section>
        </div>

        {/* vignette + grain */}
        <div className="pointer-events-none absolute inset-0" style={{
          background: 'radial-gradient(120% 120% at 50% 42%, transparent 56%, rgba(0,0,0,0.55) 100%)' }} />
        <Grain />
      </div>

      <Notifications />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────────

const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function Grain() {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ opacity: 0.035, backgroundImage: GRAIN_URL, mixBlendMode: 'overlay' }} />
  );
}

function Led({ color }: { color: string }) {
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 10px 1px ${color}` }} />;
}

function Chip({ children, siren }: { children: React.ReactNode; siren?: boolean }) {
  return (
    <span className="flex items-center uppercase" style={{ gap: 9, height: 34, padding: '0 15px', borderRadius: 999,
      border: `1px solid ${siren ? 'rgba(255,87,101,0.42)' : HAIR}`, background: 'rgba(255,255,255,0.02)',
      fontSize: 11, letterSpacing: '0.22em', color: siren ? '#FFC4C8' : DIM }}>
      {children}
    </span>
  );
}

function Clock() {
  const [now, setNow] = useState(() => fmt(new Date()));
  useEffect(() => {
    const id = setInterval(() => setNow(fmt(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums" style={{ fontSize: 13, letterSpacing: '0.16em', color: DIM, marginLeft: 24 }}>{now}</span>;
}
function fmt(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function PanelHead({ title, zone, zoneColor, side }: { title: string; zone: string; zoneColor: string; side: string }) {
  return (
    <div className="flex items-center" style={{ gap: 14, marginBottom: 20 }}>
      <span className="font-sans uppercase" style={{ fontSize: 12, letterSpacing: '0.30em', color: DIM }}>
        {title} · <b style={{ color: zoneColor, fontWeight: 600 }}>{zone}</b>
      </span>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${HAIR}, transparent)` }} />
      <span className="font-sans uppercase" style={{ fontSize: 11, letterSpacing: '0.3em', color: CHAMP }}>{side}</span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', background: 'rgba(18,24,34,0.55)', border: `1px solid ${HAIR}`, borderRadius: 20,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 50px -28px rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)' }}>
      <div className="pointer-events-none absolute inset-0" style={{ borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent 38%)' }} />
      {children}
    </div>
  );
}

function Tel({ label, value, unit, num = true, color, first }:
  { label: string; value: string; unit?: string; num?: boolean; color?: string; first?: boolean }) {
  return (
    <div style={{ borderLeft: first ? 'none' : `1px solid ${HAIR}`, paddingLeft: first ? 0 : 16 }}>
      <div className="font-sans uppercase" style={{ fontSize: 10.5, letterSpacing: '0.24em', color: DIM2 }}>{label}</div>
      <div className="font-mono" style={{ fontWeight: 500, fontSize: num ? 30 : 24, marginTop: 8, letterSpacing: '-0.01em', color: color ?? '#EAF0F6' }}>
        {value}{unit && <small style={{ fontSize: 14, color: DIM, fontWeight: 400 }}> {unit}</small>}
      </div>
    </div>
  );
}

function LockGlyph() {
  return (
    <span style={{ position: 'relative', width: 13, height: 13, border: `1.5px solid ${DIM2}`, borderRadius: 3, display: 'inline-block' }}>
      <span style={{ position: 'absolute', left: 2, right: 2, top: -4, height: 5, border: `1.5px solid ${DIM2}`, borderBottom: 0, borderRadius: '4px 4px 0 0' }} />
    </span>
  );
}
