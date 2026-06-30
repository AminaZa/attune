import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValueEvent } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// GaugeRing — Phase 2 animated ring gauge
//
// SVG stroke-dasharray arc + Framer Motion spring (stiffness 60, damping 20).
// Color blends across three stops driven by the spring value:
//   ramp="rising"    → calm (#2FE0A0) → warm (#FFB454) → alert (#FF5765)   [stress, overload]
//   ramp="attention" → alert (#FF5765) → warm (#FFB454) → calm (#2FE0A0)   [attention: high = good]
// At idle, a 3 s breathing opacity cycle makes the screen feel alive.
// ─────────────────────────────────────────────────────────────────────────────

const CALM  = '#2FE0A0';
const WARM  = '#FFB454';
const ALERT = '#FF5765';

const RAMPS = {
  rising:    [CALM, WARM, ALERT],
  attention: [ALERT, WARM, CALM],
} as const;

// SVG geometry — fixed viewBox so the ring is crisp at any rendered size.
const SIZE   = 200;          // viewBox width & height
const CX     = SIZE / 2;     // 100
const CY     = SIZE / 2;     // 100
const R      = 74;           // arc radius
const SW     = 13;           // stroke width
const CIRC   = 2 * Math.PI * R; // ≈ 464.9

// Tick angles (every 25% of the arc = every 90°), rotated to match the -90° SVG transform.
const TICK_POSITIONS = [0, 0.25, 0.5, 0.75, 1];

interface GaugeRingProps {
  value: number;              // 0..1, live from store
  label: string;
  ramp: keyof typeof RAMPS;
}

export function GaugeRing({ value, label, ramp }: GaugeRingProps) {
  // Spring-animated value — slow & viscous per design system §4.
  const spring = useSpring(value, { stiffness: 60, damping: 20 });

  // Keep the spring chasing the incoming prop value.
  useEffect(() => { spring.set(value); }, [spring, value]);

  // Derived MotionValues — no re-renders, all on the animation thread.
  const dashOffset = useTransform(spring, (v) => CIRC * (1 - Math.max(0, Math.min(1, v))));
  const color      = useTransform(spring, [0, 0.5, 1], RAMPS[ramp]);
  const glowOp     = useTransform(spring, [0, 1], [0.04, 0.14]); // glow fades in with value

  // Displayed percentage — follows the spring so the number animates too.
  const [pct, setPct] = useState(Math.round(value * 100));
  useMotionValueEvent(spring, 'change', (v) => setPct(Math.round(Math.max(0, Math.min(1, v)) * 100)));

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">

      {/* Breathing wrapper — barely-visible 3 s opacity cycle at idle */}
      <motion.div
        animate={{ opacity: [0.82, 1, 0.82] }}
        transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
        className="relative flex items-center justify-center"
        style={{ width: SIZE, height: SIZE }}
      >
        {/* Value-colored outer glow — intensifies as value rises */}
        <motion.div
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: -8,
            background: color,
            opacity: glowOp,
            filter: 'blur(28px)',
          }}
        />

        {/* Ring SVG */}
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ display: 'block', transform: 'rotate(-90deg)' }}  // arc starts at 12 o'clock
        >
          {/* Track — full circle in hairline */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={SW}
            strokeLinecap="round"
          />

          {/* Faint tick marks at 0 / 25 / 50 / 75 / 100 % */}
          {TICK_POSITIONS.map((t) => {
            const a   = t * 2 * Math.PI;
            const cos = Math.cos(a);
            const sin = Math.sin(a);
            const inner = R - SW / 2 - 1;
            const outer = R + SW / 2 + 1;
            return (
              <line
                key={t}
                x1={CX + inner * cos} y1={CY + inner * sin}
                x2={CX + outer * cos} y2={CY + outer * sin}
                stroke="rgba(216,198,166,0.18)"  // champagne ticks
                strokeWidth={1.5}
              />
            );
          })}

          {/* Animated fill arc */}
          <motion.circle
            cx={CX} cy={CY} r={R}
            fill="none"
            strokeWidth={SW}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            style={{ stroke: color, strokeDashoffset: dashOffset }}
          />
        </svg>

        {/* Centered value overlay */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-mono font-semibold tabular-nums leading-none"
            style={{ fontSize: 56, color }}
          >
            {pct}
          </motion.span>
          <motion.span
            className="font-mono font-normal tabular-nums"
            style={{ fontSize: 17, color, opacity: 0.55 }}
          >
            %
          </motion.span>
        </div>
      </motion.div>

      {/* Label — below the ring */}
      <span className="label-attune">{label}</span>
    </div>
  );
}
