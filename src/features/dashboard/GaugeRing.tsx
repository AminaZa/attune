import { useEffect, useId, useRef, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValueEvent } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// GaugeRing — instrument-grade ring gauge (pixel-matched to
// attune-mock-dashboard-v2-cyan.png / mockups-v2/dashboard-a.html §gauges).
//
// 212×212 ring (r86, sw12), gradient stroke blended from the value, a value-
// coloured outer glow + arc drop-shadow, and a faint conic TICK RING. Big
// tabular value centred with the metric name beneath it (in-ring), then the
// label + live trend caret below. Spring { stiffness: 60, damping: 20 } (§4).
//   ramp="rising"    → calm → warm → alert   [stress, overload: high = bad]
//   ramp="attention" → alert → warm → calm   [attention: high = good]
// ─────────────────────────────────────────────────────────────────────────────

const CALM  = '#2FE0A0';
const WARM  = '#FFB454';
const ALERT = '#FF5765';

const RAMPS = {
  rising:    [CALM, WARM, ALERT],
  attention: [ALERT, WARM, CALM],
} as const;

const SIZE = 212;
const CX   = SIZE / 2;
const CY   = SIZE / 2;
const R    = 86;
const SW   = 12;
const CIRC = 2 * Math.PI * R;

interface GaugeRingProps {
  value: number;              // 0..1, live from store
  label: string;
  ramp: keyof typeof RAMPS;
}

function trendFor(ramp: keyof typeof RAMPS, value: number, dir: -1 | 0 | 1) {
  if (ramp === 'attention') {
    if (value >= 0.8) return { glyph: '●', text: 'focused' };
    if (dir > 0)      return { glyph: '▲', text: 'recovering' };
    if (dir < 0)      return { glyph: '▼', text: 'dropping' };
    return { glyph: '●', text: 'stable' };
  }
  if (value >= 0.8) return { glyph: '▲', text: 'peak' };
  if (dir > 0)      return { glyph: '▲', text: 'rising' };
  if (dir < 0)      return { glyph: '▼', text: 'easing' };
  return { glyph: '●', text: 'stable' };
}

export function GaugeRing({ value, label, ramp }: GaugeRingProps) {
  const gid = useId().replace(/:/g, ''); // safe SVG id

  const spring = useSpring(value, { stiffness: 60, damping: 20 });
  useEffect(() => { spring.set(value); }, [spring, value]);

  const dashOffset = useTransform(spring, (v) => CIRC * (1 - Math.max(0, Math.min(1, v))));
  const color      = useTransform(spring, [0, 0.5, 1], [...RAMPS[ramp]]);
  const glowOp     = useTransform(spring, [0, 1], [0.06, 0.22]);

  const [pct, setPct] = useState(Math.round(value * 100));
  useMotionValueEvent(spring, 'change', (v) =>
    setPct(Math.round(Math.max(0, Math.min(1, v)) * 100)),
  );

  // Live trend — sample direction on a slow cadence so it reads steadily.
  const prev = useRef(value);
  const [trend, setTrend] = useState(() => trendFor(ramp, value, 0));
  useEffect(() => {
    const id = setInterval(() => {
      const d = value - prev.current;
      const dir: -1 | 0 | 1 = d > 0.015 ? 1 : d < -0.015 ? -1 : 0;
      setTrend(trendFor(ramp, value, dir));
      prev.current = value;
    }, 900);
    return () => clearInterval(id);
  }, [ramp, value]);

  return (
    <div className="flex flex-col items-center">
      <motion.div
        animate={{ opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
        className="relative"
        style={{ width: SIZE, height: SIZE, ['--gc' as never]: color as never }}
      >
        {/* value-coloured outer glow */}
        <motion.div
          className="pointer-events-none absolute rounded-full"
          style={{ inset: 10, background: color, opacity: glowOp, filter: 'blur(28px)' }}
        />

        {/* faint conic tick ring */}
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: 9, opacity: 0.5,
            background: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.16) 0 0.7deg, transparent 0.7deg 6deg)',
            WebkitMaskImage: 'radial-gradient(transparent 92px, #000 92px)',
            maskImage: 'radial-gradient(transparent 92px, #000 92px)',
          }}
        />

        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
             style={{ display: 'block', transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={`grad-${gid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="var(--gc)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--gc)" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* track */}
          <circle cx={CX} cy={CY} r={R} fill="none"
                  stroke="rgba(255,255,255,0.07)" strokeWidth={SW} />

          {/* animated gradient fill arc */}
          <motion.circle cx={CX} cy={CY} r={R} fill="none"
            strokeWidth={SW} strokeLinecap="round" strokeDasharray={CIRC}
            stroke={`url(#grad-${gid})`}
            style={{ strokeDashoffset: dashOffset, filter: 'drop-shadow(0 0 8px var(--gc))' }} />
        </svg>

        {/* centred value + in-ring metric name */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <motion.span className="font-mono text-[62px] font-semibold leading-none tabular-nums"
                       style={{ color, letterSpacing: '-0.02em' }}>
            {pct}
          </motion.span>
          <span className="mt-[7px] font-mono text-[15px] uppercase tracking-[0.05em] text-textMute">
            {label}
          </span>
        </div>
      </motion.div>

      {/* label + live trend caret below the ring */}
      <span className="mt-4 font-sans text-[13px] uppercase tracking-[0.26em] text-textDim">
        {label}
      </span>
      <motion.span className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.16em] tabular-nums" style={{ color }}>
        {trend.glyph} {trend.text}
      </motion.span>
    </div>
  );
}
