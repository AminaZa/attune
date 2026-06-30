import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValueEvent } from 'framer-motion';
import type { AudioEvent, CabinDecisions } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// CabinPanels — Phase 3: five CABIN RESPONSE panels
//
// (1) NoiseCancelPanel  — fill bar + waveform glyph
// (2) LightingPanel     — color swatch dims warm→teal as level rises
// (3) AlertPanel        — gentle pulse only while alert exists; icon per channel
// (4) EngagementPanel   — lights violet when engagementCue is true
// (5) SafetySoundPanel  — hero badge; one strong pulse then steady alert-red glow
// ─────────────────────────────────────────────────────────────────────────────

// ── Waveform path helper ─────────────────────────────────────────────────────
// 9 path commands (M + 8 L) regardless of amplitude so Framer Motion can morph
// between a full sine wave (loud cabin) and a flat line (fully cancelled).
function waveD(amplitude: number): string {
  const W = 54, H = 16, CY = H / 2, N = 8;
  return Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N;
    return `${i === 0 ? 'M' : 'L'} ${(t * W).toFixed(2)},${(CY + amplitude * Math.sin(t * 3 * Math.PI)).toFixed(2)}`;
  }).join(' ');
}

// ── Channel icons ─────────────────────────────────────────────────────────────

function IconVisual({ color }: { color: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <ellipse cx={9} cy={9} rx={7.5} ry={5} stroke={color} strokeWidth={1.4} />
      <circle cx={9} cy={9} r={2.2} fill={color} />
    </svg>
  );
}

function IconHaptic({ color }: { color: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <rect x={5.5} y={3} width={7} height={12} rx={2.5} stroke={color} strokeWidth={1.4} />
      <path d="M2.5 7 C1.5 8 1.5 10 2.5 11" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M15.5 7 C16.5 8 16.5 10 15.5 11" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

function IconVoice({ color }: { color: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <path d="M3 7 L3 11 L6.5 11 L10 14 L10 4 L6.5 7 Z"
        stroke={color} strokeWidth={1.4} strokeLinejoin="round" fill="none" />
      <path d="M12.5 5.5 C14.5 6.8 14.5 11.2 12.5 12.5"
        stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

function ChannelIcon({ channel, color }: { channel: 'visual' | 'haptic' | 'voice'; color: string }) {
  if (channel === 'haptic') return <IconHaptic color={color} />;
  if (channel === 'voice')  return <IconVoice color={color} />;
  return <IconVisual color={color} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel 1 — Noise Cancelling
// ─────────────────────────────────────────────────────────────────────────────

export function NoiseCancelPanel({ level }: { level: number }) {
  const spring = useSpring(level, { stiffness: 60, damping: 20 });
  useEffect(() => { spring.set(level); }, [spring, level]);

  const barWidth = useTransform(spring, (v) =>
    `${(Math.max(0, Math.min(1, v)) * 100).toFixed(1)}%`
  );

  const [pct, setPct] = useState(Math.round(level * 100));
  const [amp, setAmp] = useState((1 - level) * 7);
  useMotionValueEvent(spring, 'change', (v) => {
    const c = Math.max(0, Math.min(1, v));
    setPct(Math.round(c * 100));
    setAmp((1 - c) * 7);
  });

  const active = level > 0.05;

  return (
    <div
      className="flex min-h-0 flex-1 items-center gap-4 rounded-inner border px-4
                 transition-colors duration-300"
      style={{
        borderColor: active ? 'rgba(52,222,242,0.35)' : 'rgba(255,255,255,0.075)',
        background:  active ? 'rgba(52,222,242,0.04)' : undefined,
      }}
    >
      {/* Waveform glyph — amplitude tracks (1 - level); flat line at 100% cancel */}
      <svg width={54} height={16} viewBox="0 0 54 16" className="shrink-0 opacity-75">
        <motion.path
          d={waveD(amp)}
          animate={{ d: waveD(amp) }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
          fill="none"
          stroke="#34DEF2"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="label-attune">NOISE CANCEL</span>
          <span
            className="font-mono text-base font-medium tabular-nums transition-colors duration-300"
            style={{ color: active ? '#34DEF2' : '#7E8A9B' }}
          >
            {pct}%
          </span>
        </div>

        {/* Animated fill bar */}
        <div
          className="relative h-2 w-full overflow-hidden rounded-full"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full bg-noise-fill"
            style={{
              width: barWidth,
              boxShadow: active ? '0 0 8px rgba(52,222,242,0.45)' : 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel 2 — Cabin Lighting
// ─────────────────────────────────────────────────────────────────────────────

export function LightingPanel({ level }: { level: number }) {
  // Swatch color: warm amber (#FFB36B) → dim teal (#2DD4BF) as level rises.
  const warmR = 255, warmG = 179, warmB = 107;
  const calmR = 45,  calmG = 212, calmB = 191;
  const r = Math.round(warmR + (calmR - warmR) * level);
  const g = Math.round(warmG + (calmG - warmG) * level);
  const b = Math.round(warmB + (calmB - warmB) * level);
  const brightness = 0.65 - level * 0.52; // 0.65 at 0% → 0.13 at 100%
  const swatchColor = `rgba(${r},${g},${b},${brightness.toFixed(2)})`;

  const stateLabel =
    level < 0.25 ? 'FULL BRIGHT' : level < 0.55 ? 'DIMMING' : 'SOFTENED';

  return (
    <div className="flex min-h-0 flex-1 items-center gap-4 rounded-inner border border-hairline px-4">
      {/* Color swatch — brightness and warmth lower with level */}
      <motion.div
        animate={{ backgroundColor: swatchColor }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
        className="h-10 w-14 shrink-0 rounded-inner"
        style={{
          boxShadow: level < 0.5
            ? `0 0 14px rgba(255,179,107,${(0.4 - level * 0.3).toFixed(2)})`
            : `0 0 14px rgba(45,212,191,${((level - 0.5) * 0.22).toFixed(2)})`,
        }}
      />

      <div className="flex flex-1 flex-col gap-1">
        <span className="label-attune">CABIN LIGHTING</span>
        <motion.span
          animate={{ color: level > 0.5 ? '#2DD4BF' : '#7E8A9B' }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="font-mono text-base tabular-nums"
        >
          {stateLabel}
        </motion.span>
      </div>

      <span className="font-mono text-base tabular-nums text-textDim">
        {Math.round(level * 100)}%
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel 3 — Alert
// ─────────────────────────────────────────────────────────────────────────────

export function AlertPanel({ alert }: { alert: CabinDecisions['alert'] }) {
  const active = !!alert;

  return (
    <motion.div
      animate={active ? { opacity: [0.75, 1, 0.75] } : { opacity: 1 }}
      transition={
        active
          ? { duration: 2.2, ease: 'easeInOut', repeat: Infinity }
          : { duration: 0.35 }
      }
      className="flex min-h-0 flex-1 items-center gap-4 rounded-inner border px-4
                 transition-colors duration-300"
      style={{
        borderColor: active ? 'rgba(255,180,84,0.45)' : 'rgba(255,255,255,0.075)',
        background:  active ? 'rgba(255,180,84,0.05)' : undefined,
      }}
    >
      <span
        className="shrink-0 transition-colors duration-300"
        style={{ color: active ? '#FFB454' : '#586473' }}
      >
        <ChannelIcon channel={alert?.channel ?? 'visual'} color={active ? '#FFB454' : '#586473'} />
      </span>

      <div className="flex flex-1 flex-col gap-0.5">
        <span className="label-attune">ALERT</span>
        <span
          className="font-mono text-base tabular-nums transition-colors duration-300"
          style={{ color: active ? '#FFB454' : '#586473' }}
        >
          {active ? alert!.stage.replace(/_/g, ' ').toUpperCase() : '—'}
        </span>
      </div>

      {active && (
        <span
          className="shrink-0 rounded border px-2 py-0.5 font-mono text-[11px] tracking-label"
          style={{ borderColor: 'rgba(255,180,84,0.45)', color: '#FFB454' }}
        >
          {alert!.channel.toUpperCase()}
        </span>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel 4 — Engagement Cue
// ─────────────────────────────────────────────────────────────────────────────

export function EngagementPanel({ active }: { active: boolean }) {
  return (
    <div
      className="flex min-h-0 flex-1 items-center gap-4 rounded-inner border px-4
                 transition-colors duration-500"
      style={{
        borderColor: active ? 'rgba(157,140,255,0.45)' : 'rgba(255,255,255,0.075)',
        background:  active ? 'rgba(157,140,255,0.06)' : undefined,
      }}
    >
      {/* Spark icon — breathes slowly when active */}
      <motion.div
        animate={
          active
            ? { opacity: [0.65, 1, 0.65], scale: [0.92, 1.08, 0.92] }
            : { opacity: 0.28, scale: 1 }
        }
        transition={
          active
            ? { duration: 3, ease: 'easeInOut', repeat: Infinity }
            : { duration: 0.45 }
        }
      >
        <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <path
            d="M11 2 L13.5 9 L21 9 L15 13.5 L17.5 21 L11 16.5 L4.5 21 L7 13.5 L1 9 L8.5 9 Z"
            stroke={active ? '#9D8CFF' : '#586473'}
            strokeWidth={1.3}
            fill={active ? 'rgba(157,140,255,0.15)' : 'none'}
            strokeLinejoin="round"
            style={{ transition: 'stroke 0.45s, fill 0.45s' }}
          />
        </svg>
      </motion.div>

      <div className="flex flex-1 flex-col gap-0.5">
        <span className="label-attune">ENGAGEMENT CUE</span>
        <span
          className="font-mono text-sm transition-colors duration-[400ms]"
          style={{ color: active ? '#9D8CFF' : '#586473' }}
        >
          {active ? 'ACTIVE — GENTLE FOCUS CUE' : '—'}
        </span>
      </div>

      {/* Indicator dot */}
      <motion.div
        animate={{ opacity: active ? 1 : 0.2 }}
        transition={{ duration: 0.45 }}
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: '#9D8CFF' }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel 5 — Safety Sound Preserved (HERO)
// ─────────────────────────────────────────────────────────────────────────────

function SirenIcon({ active }: { active: boolean }) {
  const c = active ? '#FF5765' : '#586473';
  return (
    <svg width={40} height={36} viewBox="0 0 40 36" fill="none" className="shrink-0">
      {/* Center dot */}
      <motion.circle
        cx={20} cy={24} r={3.5}
        fill={c}
        animate={{ opacity: active ? [0.6, 1, 0.6] : 0.4 }}
        transition={{ duration: 1, ease: 'easeInOut', repeat: active ? Infinity : 0 }}
        style={{ transition: 'fill 0.3s' }}
      />
      {/* Inner arc */}
      <motion.path
        d="M 13,24 A 7,7 0 0,0 27,24"
        stroke={c}
        strokeWidth={2}
        strokeLinecap="round"
        animate={active ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.2 }}
        transition={{ duration: 1, ease: 'easeInOut', repeat: active ? Infinity : 0, delay: 0.12 }}
        style={{ transition: 'stroke 0.3s' }}
      />
      {/* Outer arc */}
      <motion.path
        d="M 8,24 A 12,12 0 0,0 32,24"
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        animate={active ? { opacity: [0.2, 0.7, 0.2] } : { opacity: 0.1 }}
        transition={{ duration: 1, ease: 'easeInOut', repeat: active ? Infinity : 0, delay: 0.28 }}
        style={{ transition: 'stroke 0.3s' }}
      />
    </svg>
  );
}

export function SafetySoundPanel({ sounds }: { sounds: AudioEvent[] }) {
  const isActive = sounds.length > 0;
  const sound    = sounds[0];

  // Trigger ONE strong pulse on appearance, then settle to steady glow.
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
      animate={pulsing ? { scale: [1, 1.016, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative flex min-h-0 flex-[1.5] overflow-hidden rounded-inner border
                 transition-colors duration-300"
      style={{
        borderColor: isActive ? 'rgba(255,87,101,0.65)' : 'rgba(255,255,255,0.075)',
        background:  isActive ? 'rgba(255,87,101,0.07)' : undefined,
      }}
    >
      {/* Alert-red left edge strip */}
      <motion.div
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute left-0 top-0 h-full w-[3px] shrink-0"
        style={{ background: 'linear-gradient(180deg, #FF5765 0%, rgba(255,87,101,0.35) 100%)' }}
      />

      {/* Radial glow — appears on activation, settles to subtle steady halo */}
      {isActive && (
        <motion.div
          key="glow"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.18, 0.10] }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 18% 50%, rgba(255,87,101,0.4), transparent 70%)',
          }}
        />
      )}

      {/* Content */}
      <div className="relative flex w-full items-center gap-4 px-4 py-3">
        <SirenIcon active={isActive} />

        <div className="flex flex-1 flex-col gap-1">
          <span className="label-attune">SAFETY SOUND PRESERVED</span>

          <motion.span
            animate={{ color: isActive ? '#FF5765' : '#586473' }}
            transition={{ duration: 0.3 }}
            className="font-mono text-base font-semibold tabular-nums"
          >
            {isActive
              ? `${sound.type.toUpperCase()} — ${(sound.direction ?? 'NEAR').toUpperCase()}`
              : '—'}
          </motion.span>

          <span className="font-mono text-[11px] text-textMute">
            {isActive
              ? 'preserved at full gain · cabin drone ducked'
              : 'listening for safety sounds'}
          </span>
        </div>

        {/* LIVE badge */}
        <motion.span
          animate={{ opacity: isActive ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="shrink-0 rounded border px-2 py-1 font-mono text-[10px] tracking-label"
          style={{ borderColor: 'rgba(255,87,101,0.5)', color: '#FF5765' }}
        >
          ⚠ LIVE
        </motion.span>
      </div>
    </motion.div>
  );
}
