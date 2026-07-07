import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useSpring, useTransform } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { Notifications } from '@/features/notifications';
import { colors } from '@/theme/tokens';

// ─── Color helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] as const;
}

function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

/** calm → warm → alert as v rises (0=calm, 1=alert). Used for stress/overload. */
function risingColor(v: number) {
  if (v < 0.5) return lerpHex(colors.calm, colors.warm, v * 2);
  return lerpHex(colors.warm, colors.alert, (v - 0.5) * 2);
}
/** alert → warm → calm as v rises (0=alert, 1=calm). Used for attention. */
function attentionColor(v: number) {
  if (v < 0.5) return lerpHex(colors.alert, colors.warm, v * 2);
  return lerpHex(colors.warm, colors.calm, (v - 0.5) * 2);
}

// ─── Ring Gauge ───────────────────────────────────────────────────────────────

interface GaugeProps {
  value: number;
  label: string;
  colorFn: (v: number) => string;
  size?: number;
  breatheDelay?: number;
}

function RingGauge({ value, label, colorFn, size = 148, breatheDelay = 0 }: GaugeProps) {
  const R = size / 2 - 16;
  const CIRC = 2 * Math.PI * R;
  const cx = size / 2;
  const cy = size / 2;

  const spring = useSpring(value, { stiffness: 60, damping: 20 });
  useEffect(() => { spring.set(value); }, [value, spring]);

  const dashOffset = useTransform(spring, (v) => CIRC * (1 - v));
  const color = colorFn(value);
  const pct = Math.round(value * 100);

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      animate={{ opacity: [0.75, 1, 0.75] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: breatheDelay }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* Tick ring */}
        <svg
          className="absolute inset-0"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {Array.from({ length: 36 }, (_, i) => {
            const angle = (i * 10 - 90) * (Math.PI / 180);
            const r1 = R + 10;
            const r2 = R + (i % 3 === 0 ? 14 : 12);
            return (
              <line
                key={i}
                x1={cx + r1 * Math.cos(angle)}
                y1={cy + r1 * Math.sin(angle)}
                x2={cx + r2 * Math.cos(angle)}
                y2={cy + r2 * Math.sin(angle)}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={i % 3 === 0 ? 1.5 : 1}
              />
            );
          })}
        </svg>

        {/* Arc */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={9}
          />
          {/* Fill */}
          <motion.circle
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke={color}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            style={{
              strokeDashoffset: dashOffset,
              filter: `drop-shadow(0 0 7px ${color}99)`,
              transition: 'stroke 600ms ease',
            }}
          />
        </svg>

        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-mono font-bold tabular-nums leading-none"
            style={{ fontSize: 40, color, transition: 'color 600ms ease' }}
          >
            {pct}
          </motion.span>
          <span className="font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>%</span>
        </div>
      </div>
      <span className="label-attune tracking-labelWide">{label}</span>
    </motion.div>
  );
}

// ─── Noise Cancel Bar ─────────────────────────────────────────────────────────

function NoiseCancelBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  // Waveform glyph — flattens as level rises
  const amp = Math.max(1, 7 - value * 7);
  const points = Array.from({ length: 9 }, (_, i) => {
    const x = (i / 8) * 40;
    const y = 8 + amp * Math.sin((i / 8) * 2 * Math.PI);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label-attune">Noise Cancelling</span>
        <div className="flex items-center gap-2">
          <svg width={40} height={16} viewBox="0 0 40 16">
            <motion.polyline
              animate={{ points }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
              fill="none"
              stroke="#34DEF2"
              strokeWidth={1.5}
              opacity={0.55}
            />
          </svg>
          <span className="font-mono text-xs text-accent">{pct}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <motion.div
          className="h-2 rounded-full"
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 20 }}
          style={{
            background: `linear-gradient(90deg, ${colors.accentDeep}, ${colors.accent} 78%, #7FF0FA)`,
            boxShadow: `0 0 8px ${colors.accent}66`,
            minWidth: 4,
          }}
        />
      </div>
    </div>
  );
}

// ─── Cabin Lighting Swatch ────────────────────────────────────────────────────

function LightingSwatch({ dimLevel }: { dimLevel: number }) {
  const brightness = Math.round((1 - dimLevel) * 100);
  // Warm amber → teal as dimLevel rises
  const swatchColor = lerpHex(colors.ambient, colors.ambientCalm, dimLevel);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label-attune">Cabin Lighting</span>
        <span className="font-mono text-xs text-textDim">{brightness}%</span>
      </div>
      <motion.div
        className="h-8 rounded-inner"
        animate={{ backgroundColor: swatchColor, opacity: 0.25 + (1 - dimLevel) * 0.55 }}
        transition={{ duration: 0.75, ease: 'easeInOut' }}
        style={{
          boxShadow: `0 0 14px ${swatchColor}55`,
        }}
      />
    </div>
  );
}

// ─── Alert Pill ───────────────────────────────────────────────────────────────

function AlertPanel({ alert }: { alert: { stage: string; channel: string } | undefined }) {
  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          key="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <motion.div
            className="flex items-center gap-3 rounded-inner px-3 py-2"
            animate={{ opacity: [1, 0.65, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: `${colors.warm}12`, border: `1px solid ${colors.warm}30` }}
          >
            <span className="text-base">
              {alert.channel === 'haptic' ? '📳' : alert.channel === 'voice' ? '🔊' : '👁'}
            </span>
            <div>
              <div className="label-attune" style={{ color: colors.warm }}>Alert Active</div>
              <div className="font-mono text-xs" style={{ color: colors.warm }}>
                {alert.stage.replace(/_/g, ' ')} · {alert.channel}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Engagement Cue ───────────────────────────────────────────────────────────

function EngagementPanel({ active }: { active: boolean }) {
  return (
    <motion.div
      className="flex items-center gap-3 rounded-inner px-3 py-2"
      animate={{
        borderColor: active ? `${colors.engage}55` : 'rgba(255,255,255,0.06)',
        background: active ? `${colors.engage}0D` : 'rgba(255,255,255,0.03)',
      }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      style={{ border: '1px solid', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <motion.div
        className="h-2.5 w-2.5 rounded-full shrink-0"
        animate={{
          backgroundColor: active ? colors.engage : 'rgba(255,255,255,0.12)',
          boxShadow: active ? `0 0 10px ${colors.engage}` : 'none',
          scale: active ? [1, 1.15, 1] : 1,
        }}
        transition={{ duration: active ? 2 : 0.5, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
      />
      <span className="label-attune">Engagement Cue</span>
      <span
        className="ml-auto font-mono text-xs"
        style={{ color: active ? colors.engage : colors.textDim }}
      >
        {active ? 'ACTIVE' : 'IDLE'}
      </span>
    </motion.div>
  );
}

// ─── Safety Sound Badge (hero) ────────────────────────────────────────────────

function SafetyBadge({ sounds }: { sounds: { type: string; direction?: string }[] }) {
  const siren = sounds.find((s) => s.type === 'siren');
  const horn = sounds.find((s) => s.type === 'horn');
  const active = !!siren || !!horn;
  const sound = siren ?? horn;

  return (
    <motion.div
      className="relative flex items-center gap-3 rounded-inner px-3 py-3 overflow-hidden"
      animate={{
        borderColor: active ? `${colors.alert}88` : 'rgba(255,255,255,0.06)',
        boxShadow: active ? `0 0 24px ${colors.alert}30` : 'none',
        background: active ? `${colors.alert}0D` : 'rgba(255,255,255,0.03)',
      }}
      transition={{ duration: active ? 0.3 : 0.6 }}
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Radiating rings on active */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="rings"
            className="absolute inset-0 rounded-inner pointer-events-none"
            initial={{ opacity: 0.6 }}
            animate={{ boxShadow: [`inset 0 0 0px ${colors.alert}00`, `inset 0 0 16px ${colors.alert}22`, `inset 0 0 0px ${colors.alert}00`] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      <motion.span
        className="text-xl shrink-0"
        animate={active ? { scale: [1, 1.25, 1] } : { scale: 1, opacity: 0.3 }}
        transition={active ? { duration: 0.4, repeat: 1 } : {}}
      >
        {active ? '🚨' : '🔊'}
      </motion.span>

      <div className="flex-1 min-w-0">
        <div
          className="label-attune"
          style={{ color: active ? colors.alert : colors.textDim }}
        >
          Safety Sound Preserved
        </div>
        {active && sound ? (
          <div className="font-mono text-sm mt-0.5" style={{ color: colors.alert }}>
            {sound.type.replace('_', ' ')} — {sound.direction ?? 'nearby'}
          </div>
        ) : (
          <div className="font-mono text-xs mt-0.5 text-textDim">monitoring</div>
        )}
      </div>

      {active && (
        <span className="font-mono text-[10px] shrink-0 px-2 py-0.5 rounded-full" style={{ background: `${colors.alert}22`, color: colors.alert, border: `1px solid ${colors.alert}44` }}>
          LIVE
        </span>
      )}
    </motion.div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const driverState = useStore((s) => s.driverState);
  const decisions = useStore((s) => s.decisions);
  const profile = useStore((s) => s.profile);
  const scenario = useStore((s) => s.activeScenario);

  const stress = driverState?.stress ?? 0;
  const overload = driverState?.overload ?? 0;
  const attention = driverState?.attention ?? 0.5;
  const noiseCancel = decisions?.noiseCancelLevel ?? 0;
  const lightDim = decisions?.lightDimLevel ?? 0;
  const engagementCue = decisions?.engagementCue ?? false;
  const alert = decisions?.alert;
  const preserved = decisions?.preservedSounds ?? [];

  return (
    <main className="bg-attune flex h-screen flex-col overflow-hidden">

      {/* ── Status bar ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-hairline px-6 py-3">
        <div className="flex items-center gap-3">
          <motion.div
            className="h-2 w-2 rounded-full"
            style={{ background: colors.accent, boxShadow: `0 0 6px ${colors.accent}` }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <h1 className="font-sans text-sm font-semibold tracking-labelWide text-text">
            ATTUNE — Adaptive Cabin
          </h1>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px] uppercase text-textDim">
          <span className="tracking-label">Scenario · {scenario.replace(/_/g, ' ')}</span>
          {profile && <span>Profile v{profile.version}</span>}
          <Link
            to="/cabin"
            className="rounded-full border border-hairline2 px-3 py-1 text-accent transition-colors hover:border-accent/60 hover:bg-accent/10"
          >
            /cabin ↗
          </Link>
        </div>
      </header>

      {/* ── Two-panel body ── */}
      <div className="flex min-h-0 flex-1 gap-4 p-4">

        {/* LEFT — SENSE */}
        <section className="card-attune flex flex-1 flex-col gap-6">
          <div className="flex items-baseline gap-2">
            <span className="label-attune tracking-labelWide">Driver State</span>
            <span className="font-mono text-[10px] text-textMute">· SENSE</span>
          </div>

          {/* Gauges */}
          <div className="flex flex-1 items-center justify-around">
            <RingGauge value={stress}   label="STRESS"    colorFn={risingColor}   breatheDelay={0} />
            <RingGauge value={overload} label="OVERLOAD"  colorFn={risingColor}   breatheDelay={1} />
            <RingGauge value={attention} label="ATTENTION" colorFn={attentionColor} breatheDelay={2} />
          </div>

          {/* Readout strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Stress',    value: stress,    color: risingColor(stress) },
              { label: 'Overload',  value: overload,  color: risingColor(overload) },
              { label: 'Attention', value: attention, color: attentionColor(attention) },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-inner px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="label-attune text-[10px]">{label}</span>
                <span className="font-mono text-xs font-semibold" style={{ color }}>
                  {(value * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT — ACT */}
        <section className="card-attune flex w-[340px] shrink-0 flex-col gap-5">
          <div className="flex items-baseline gap-2">
            <span className="label-attune tracking-labelWide">Cabin Response</span>
            <span className="font-mono text-[10px] text-textMute">· ACT</span>
          </div>

          <NoiseCancelBar value={noiseCancel} />
          <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <LightingSwatch dimLevel={lightDim} />
          <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <AlertPanel alert={alert} />
          <EngagementPanel active={engagementCue} />

          {/* Hero badge */}
          <div className="mt-auto">
            <SafetyBadge sounds={preserved} />
          </div>
        </section>
      </div>

      <Notifications />
    </main>
  );
}
