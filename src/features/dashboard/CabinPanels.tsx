import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValueEvent } from 'framer-motion';
import type { AudioEvent, CabinDecisions } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// CabinPanels — CABIN RESPONSE bento, pixel-matched to
// attune-mock-dashboard-v2-cyan.png (mockups-v2/dashboard-a.html §ACT bento).
// Each panel renders its own glass card; DashboardV2 places them in the grid.
//
//   NoiseCancelPanel  — full-width bar, OFF · DRONE DUCKED · MAX, 40px %
//   LightingPanel     — tall gradient light-bar + marker + colour-temperature
//   GentleCuePanel    — mini card: channel icon, STAGE X / 3
//   EngagementPanel   — mini card: violet spark, ACTIVE / STANDBY
//   SafetySoundPanel  — HERO: red edge, waveform, directional arrow + label
// ─────────────────────────────────────────────────────────────────────────────

type Channel = 'visual' | 'haptic' | 'voice';

const ACCENT = '#34DEF2';
const DIM    = '#7E8A9B';
const DIM2   = '#586473';
const ENGAGE = '#9D8CFF';
const ALERT  = '#FF5765';
const HAIR   = 'rgba(255,255,255,0.075)';

// Shared glass-card recipe (design-system §7 / mock .card).
const cardStyle: React.CSSProperties = {
  position: 'relative',
  background: 'rgba(18,24,34,0.55)',
  border: `1px solid ${HAIR}`,
  borderRadius: 20,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 50px -28px rgba(0,0,0,0.9)',
  backdropFilter: 'blur(16px)',
};

// 1px top inner highlight — "light from above" (mock .card::after).
function CardHi() {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ borderRadius: 20,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent 38%)' }} />
  );
}

function CardHead({ title, value, valueSize = 40, valueColor = ACCENT, mb = 18 }:
  { title: string; value?: string; valueSize?: number; valueColor?: string; mb?: number }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: mb }}>
      <span className="font-sans uppercase" style={{ fontSize: 12, letterSpacing: '0.24em', color: DIM }}>{title}</span>
      {value !== undefined && (
        <span className="font-mono font-semibold leading-none tabular-nums"
              style={{ fontSize: valueSize, letterSpacing: '-0.02em', color: valueColor }}>{value}</span>
      )}
    </div>
  );
}

// ── Channel icons ─────────────────────────────────────────────────────────────

function IconVisual({ color }: { color: string }) {
  return (
    <svg width={22} height={22} viewBox="0 0 18 18" fill="none">
      <ellipse cx={9} cy={9} rx={7.5} ry={5} stroke={color} strokeWidth={1.4} />
      <circle cx={9} cy={9} r={2.2} fill={color} />
    </svg>
  );
}
function IconHaptic({ color }: { color: string }) {
  return (
    <svg width={22} height={22} viewBox="0 0 18 18" fill="none">
      <rect x={5.5} y={3} width={7} height={12} rx={2.5} stroke={color} strokeWidth={1.4} />
      <path d="M2.5 7 C1.5 8 1.5 10 2.5 11" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M15.5 7 C16.5 8 16.5 10 15.5 11" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}
function IconVoice({ color }: { color: string }) {
  return (
    <svg width={22} height={22} viewBox="0 0 18 18" fill="none">
      <path d="M3 7 L3 11 L6.5 11 L10 14 L10 4 L6.5 7 Z"
        stroke={color} strokeWidth={1.4} strokeLinejoin="round" fill="none" />
      <path d="M12.5 5.5 C14.5 6.8 14.5 11.2 12.5 12.5"
        stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}
function ChannelIcon({ channel, color }: { channel: Channel; color: string }) {
  if (channel === 'haptic') return <IconHaptic color={color} />;
  if (channel === 'voice')  return <IconVoice color={color} />;
  return <IconVisual color={color} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Noise Cancelling — full-width hero bar (span 2)
// ─────────────────────────────────────────────────────────────────────────────

export function NoiseCancelPanel({ level }: { level: number }) {
  const spring = useSpring(level, { stiffness: 60, damping: 20 });
  useEffect(() => { spring.set(level); }, [spring, level]);

  const barWidth = useTransform(spring, (v) => `${(Math.max(0, Math.min(1, v)) * 100).toFixed(1)}%`);
  const [pct, setPct] = useState(Math.round(level * 100));
  useMotionValueEvent(spring, 'change', (v) => setPct(Math.round(Math.max(0, Math.min(1, v)) * 100)));
  const active = level > 0.05;

  return (
    <div style={{ ...cardStyle, gridColumn: '1 / span 2', padding: '24px 26px' }}>
      <CardHi />
      <CardHead title="Active Noise Cancelling" value={`${pct}%`} valueColor={active ? ACCENT : DIM2} />
      <div style={{ height: 14, borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: `1px solid ${HAIR}`, overflow: 'hidden' }}>
        <motion.div style={{ height: '100%', borderRadius: 999,
          background: 'linear-gradient(90deg,#0E7490,#34DEF2 78%,#7FF0FA)',
          boxShadow: active ? '0 0 18px 1px rgba(52,222,242,0.45)' : 'none', width: barWidth }} />
      </div>
      <div className="flex justify-between font-mono uppercase" style={{ marginTop: 12, fontSize: 10, letterSpacing: '0.2em', color: DIM2 }}>
        <span>OFF</span><span>DRONE DUCKED</span><span>MAX</span>
      </div>
      <p className="font-sans" style={{ marginTop: 16, fontSize: 12.5, color: DIM }}>
        Road · wind · engine hum suppressed — safety sounds bypass the filter.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cabin Lighting — tall gradient light-bar + colour temperature (row span 2)
// ─────────────────────────────────────────────────────────────────────────────

export function LightingPanel({ level }: { level: number }) {
  const spring = useSpring(level, { stiffness: 50, damping: 18 });
  useEffect(() => { spring.set(level); }, [spring, level]);

  const [pct, setPct] = useState(Math.round(level * 100));
  useMotionValueEvent(spring, 'change', (v) => setPct(Math.round(Math.max(0, Math.min(1, v)) * 100)));
  const markerLeft = useTransform(spring, (v) => `${(Math.max(0, Math.min(1, v)) * 100).toFixed(1)}%`);
  const active = level > 0.05;
  const kelvin = Math.round(2200 + (1 - level) * 2600); // warmer (lower K) as it dims
  const tempWidth = `${Math.max(8, Math.min(100, Math.round((1 - (kelvin - 2200) / 2600) * 100)))}%`;

  return (
    <div style={{ ...cardStyle, gridRow: 'span 2', gridColumn: 1, padding: '24px 26px', display: 'flex', flexDirection: 'column' }}>
      <CardHi />
      <CardHead title="Cabin Lighting" value={`${pct}%`} valueSize={30} valueColor={active ? ACCENT : DIM2} />
      <div style={{ position: 'relative', height: 90, borderRadius: 14, border: `1px solid ${HAIR}`, overflow: 'hidden',
        background: 'linear-gradient(90deg, #FFB36B 0%, #5C4A36 42%, #1B2230 100%)' }}>
        <motion.div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, left: markerLeft,
          background: 'rgba(255,255,255,0.7)', boxShadow: '0 0 12px #fff' }} />
      </div>
      <p className="font-sans" style={{ marginTop: 14, fontSize: 12.5, color: DIM }}>
        Dimmed &amp; warmed — dashboard glare reduced.
      </p>
      <div style={{ marginTop: 'auto', paddingTop: 22, borderTop: `1px solid ${HAIR}` }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <span className="font-sans uppercase" style={{ fontSize: 12, letterSpacing: '0.24em', color: DIM }}>Colour Temperature</span>
          <span className="font-mono tabular-nums" style={{ fontSize: 15, color: '#FFC58A' }}>{kelvin}K</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: `1px solid ${HAIR}`, overflow: 'hidden' }}>
          <motion.div style={{ height: '100%', borderRadius: 999, width: tempWidth,
            background: 'linear-gradient(90deg,#FFB36B,#FFD9A8)' }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gentle Cue (alert) — mini card
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_INDEX: Record<string, number> = {
  gentle_cue: 1,
  firm_cue: 2,
  suggest_pull_over: 3,
};

export function GentleCuePanel({ alert, channel }: { alert: CabinDecisions['alert']; channel: Channel }) {
  const active = !!alert;
  const ch = alert?.channel ?? channel;
  const stage = alert ? STAGE_INDEX[alert.stage] ?? 1 : 0;
  const tint = active ? ENGAGE : DIM2;

  return (
    <motion.div
      animate={active ? { opacity: [0.82, 1, 0.82] } : { opacity: 1 }}
      transition={active ? { duration: 2.4, ease: 'easeInOut', repeat: Infinity } : { duration: 0.35 }}
      style={{ ...cardStyle, gridColumn: 2, padding: '24px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        borderColor: active ? 'rgba(157,140,255,0.4)' : HAIR,
        background: active ? 'rgba(157,140,255,0.06)' : cardStyle.background }}
    >
      <CardHi />
      <div className="flex items-center" style={{ gap: 14 }}>
        <span className="flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 13,
          border: `1px solid ${active ? 'rgba(157,140,255,0.4)' : HAIR}`, background: active ? 'rgba(157,140,255,0.1)' : 'transparent' }}>
          <ChannelIcon channel={ch} color={tint} />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="font-sans" style={{ fontSize: 18, fontWeight: 600 }}>Gentle Cue</span>
          <span className="font-sans uppercase" style={{ fontSize: 11, letterSpacing: '0.2em', color: DIM2, marginTop: 3 }}>
            Channel · {ch}
          </span>
        </div>
      </div>
      <span className="font-mono uppercase" style={{ marginTop: 18, fontSize: 13, letterSpacing: '0.08em', color: tint }}>
        {active ? `Stage ${stage} / 3 · Active` : 'Standby'}
      </span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Engagement — mini card
// ─────────────────────────────────────────────────────────────────────────────

export function EngagementPanel({ active, attentionLow }: { active: boolean; attentionLow: boolean }) {
  const tint = active ? ENGAGE : DIM2;
  return (
    <div style={{ ...cardStyle, gridColumn: 2, padding: '24px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      borderColor: active ? 'rgba(157,140,255,0.45)' : HAIR, background: active ? 'rgba(157,140,255,0.06)' : cardStyle.background }}>
      <CardHi />
      <div className="flex items-center" style={{ gap: 14 }}>
        <motion.span className="flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 13,
          border: `1px solid ${active ? 'rgba(157,140,255,0.45)' : HAIR}` }}
          animate={active ? { scale: [0.94, 1.06, 0.94] } : { scale: 1 }}
          transition={active ? { duration: 3, ease: 'easeInOut', repeat: Infinity } : { duration: 0.4 }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={active ? ENGAGE : DIM} strokeWidth={2}>
            <circle cx={12} cy={12} r={3} /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          </svg>
        </motion.span>
        <div className="flex min-w-0 flex-col">
          <span className="font-sans" style={{ fontSize: 18, fontWeight: 600, color: active ? '#EAF0F6' : DIM }}>Engagement</span>
          <span className="font-sans uppercase" style={{ fontSize: 11, letterSpacing: '0.2em', color: DIM2, marginTop: 3 }}>
            {attentionLow ? 'Attention Low' : 'Attention Stable'}
          </span>
        </div>
      </div>
      <span className="font-mono uppercase" style={{ marginTop: 18, fontSize: 13, letterSpacing: '0.08em', color: tint }}>
        {active ? 'Active' : 'Standby'}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Safety Sound Preserved — HERO (span 2)
// ─────────────────────────────────────────────────────────────────────────────

function ShieldIcon({ active }: { active: boolean }) {
  const c = active ? ALERT : DIM2;
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
      <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" fill={active ? 'rgba(255,87,101,0.12)' : 'none'} />
      <path d="M12 8v4M12 15h.01" />
    </svg>
  );
}

function Waveform({ active }: { active: boolean }) {
  const heights = [14, 26, 40, 30, 48, 22, 38, 18, 30, 12, 24];
  return (
    <div className="flex items-center" style={{ gap: 5, height: 54 }}>
      {heights.map((h, i) => (
        <motion.span key={i} style={{ width: 4, borderRadius: 3,
          background: active ? 'linear-gradient(180deg,#FF8088,#FF5765)' : '#3A4250', opacity: active ? 0.92 : 0.6 }}
          animate={active ? { height: [h * 0.5, h, h * 0.6] } : { height: h * 0.5 }}
          transition={active ? { duration: 0.7 + (i % 4) * 0.12, ease: 'easeInOut', repeat: Infinity, delay: i * 0.04 } : { duration: 0.3 }} />
      ))}
    </div>
  );
}

function DirArrow({ dir }: { dir?: string }) {
  const rot = dir === 'left' ? 180 : dir === 'front' ? -90 : dir === 'rear' ? 90 : 0; // right = 0
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#FF8088" strokeWidth={2.2}
         strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export function SafetySoundPanel({ sounds }: { sounds: AudioEvent[] }) {
  const isActive = sounds.length > 0;
  const sound = sounds[0];

  const prevActive = useRef(false);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (isActive && !prevActive.current) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 600);
      return () => clearTimeout(t);
    }
    prevActive.current = isActive;
  }, [isActive]);

  return (
    <motion.div
      animate={pulsing ? { scale: [1, 1.012, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{ ...cardStyle, gridColumn: '1 / span 2', overflow: 'hidden',
        border: `1px solid ${isActive ? 'rgba(255,87,101,0.34)' : HAIR}`,
        background: isActive
          ? 'linear-gradient(100deg, rgba(40,12,16,0.78), rgba(20,12,16,0.5) 60%, rgba(16,22,32,0.4))'
          : 'rgba(18,24,34,0.55)',
        boxShadow: isActive
          ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(255,87,101,0.08), 0 24px 60px -30px rgba(255,40,55,0.4)'
          : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 50px -28px rgba(0,0,0,0.9)' }}
    >
      {/* red left edge */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5,
        background: ALERT, opacity: isActive ? 1 : 0.25, boxShadow: isActive ? '0 0 22px 3px rgba(255,87,101,0.7)' : 'none' }} />

      <div className="flex items-center" style={{ gap: 24, padding: '26px 30px 26px 34px' }}>
        <span className="flex shrink-0 items-center justify-center" style={{ width: 62, height: 62, borderRadius: 16,
          border: `1px solid ${isActive ? 'rgba(255,87,101,0.5)' : HAIR}`,
          background: isActive ? 'radial-gradient(circle at 50% 40%, rgba(255,87,101,0.4), rgba(255,87,101,0.08))' : 'transparent' }}>
          <ShieldIcon active={isActive} />
        </span>

        <div className="flex min-w-0 flex-col">
          <span className="font-sans" style={{ fontSize: 21, fontWeight: 700, letterSpacing: '0.02em',
            color: isActive ? '#FCEDEE' : '#9AA6B5' }}>
            Safety Sound Preserved
          </span>
          <span className="font-sans" style={{ marginTop: 5, fontSize: 13.5, letterSpacing: '0.02em', color: isActive ? '#E7B7BB' : DIM }}>
            {isActive
              ? `${cap(sound.type)} detected · kept audible at full noise-cancelling`
              : 'Listening for sirens, horns & screeches'}
          </span>
        </div>

        <div style={{ marginLeft: 'auto' }}><Waveform active={isActive} /></div>

        {isActive && (
          <div className="flex flex-col items-center" style={{ marginLeft: 20, gap: 8 }}>
            <span className="flex items-center justify-center" style={{ width: 54, height: 54, borderRadius: '50%',
              border: '1px solid rgba(255,87,101,0.5)', background: 'radial-gradient(circle,rgba(255,87,101,0.22),transparent 70%)' }}>
              <DirArrow dir={sound.direction} />
            </span>
            <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: '0.22em', color: '#E7B7BB' }}>
              {(sound.direction ?? 'near')}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}
