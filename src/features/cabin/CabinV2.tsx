import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useStore } from '@/store';
import { Notifications } from '@/features/notifications';

// ─────────────────────────────────────────────────────────────────────────────
// CabinV2 — Phase 5: full-bleed FPV ambient-light cabin view (/cabin route)
//
// Designed for a 1920×1080 projector. The LIGHT is the interface — no UI chrome.
// All state flows from the shared Zustand store (BroadcastChannel syncs tabs),
// so /dashboard and /cabin react identically to the same scenario trigger.
//
// Layers (bottom → top):
//   1  Cabin photo background  (public/cabin.jpg — drop & refresh, no restart)
//      └ graceful gradient placeholder if the file is absent or fails to load
//   2  Vignette               (keeps glow contrast against the photo)
//   3  Dash-line glow         (wide horizontal, colour-animated)
//   4  Left door glow         (tall vertical, left edge)
//   5  Right door glow        (tall vertical, right edge)
//   6  Footwell glow          (lower-centre, slightly left)
//   7  Engagement breath      (violet, dash strip only, slow pulse)
//   8  Screen-blend tint      (mix-blend-mode: screen — spills hue cabin-wide)
//   9  Siren side flash       (direction-aware, brief cool white burst)
//  10  Notification pill      (Notifications — already fixed z-50)
//
// Colour transitions (useSpring stiffness 35 / damping 16 ≈ 800 ms settle):
//   lightDimLevel 0 → 1 : #FFB36B (warm amber) → #2DD4BF (ambientCalm teal)
//   overall glow opacity : 0.30 → 0.14  (cabin dims)
// ─────────────────────────────────────────────────────────────────────────────

// ── Cabin photo ───────────────────────────────────────────────────────────────
// Drop cabin.jpg into /public/ (project root) — no build step, no restart.
// Refresh the browser and it loads immediately. If the file is absent the img
// onError handler flips photoError → true and the gradient placeholder renders.
const CABIN_SRC = '/cabin.jpg';

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder — rendered when no cabin.jpg is found.
// Dark gradient layers + faint steering-wheel silhouette suggest a real interior.
// ─────────────────────────────────────────────────────────────────────────────

function CabinPlaceholder() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(ellipse 90% 22% at 50% 41%, rgba(32,36,52,0.95) 0%, transparent 100%),
          radial-gradient(ellipse 20% 70% at 4%  55%, rgba(22,26,38,0.98) 0%, transparent 100%),
          radial-gradient(ellipse 20% 70% at 96% 55%, rgba(22,26,38,0.98) 0%, transparent 100%),
          radial-gradient(ellipse 45% 28% at 33% 82%, rgba(18,22,32,0.92) 0%, transparent 100%),
          radial-gradient(ellipse 55% 38% at 50% 12%, rgba(12,15,24,0.80) 0%, transparent 100%),
          linear-gradient(180deg, #05070E 0%, #0C101A 38%, #080A12 68%, #040509 100%)
        `,
      }}
    >
      {/* Faint dashboard horizontal band */}
      <div
        className="absolute"
        style={{
          left: '8%', right: '8%', top: '40%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(120,130,160,0.18) 20%, rgba(120,130,160,0.18) 80%, transparent)',
        }}
      />

      {/* Steering-wheel silhouette */}
      <svg
        className="pointer-events-none absolute"
        style={{ bottom: '10%', left: '50%', transform: 'translateX(-50%)', opacity: 0.09 }}
        width={340} height={210}
        viewBox="0 0 340 210"
        fill="none"
      >
        {/* Outer rim */}
        <ellipse cx={170} cy={148} rx={148} ry={94} stroke="#9AA0B8" strokeWidth={20} />
        {/* Inner hub */}
        <ellipse cx={170} cy={148} rx={44}  ry={30} stroke="#9AA0B8" strokeWidth={8} />
        {/* Spokes */}
        <line x1={170} y1={54}  x2={170} y2={118} stroke="#9AA0B8" strokeWidth={8} strokeLinecap="round" />
        <line x1={22}  y1={148} x2={126} y2={148} stroke="#9AA0B8" strokeWidth={8} strokeLinecap="round" />
        <line x1={214} y1={148} x2={318} y2={148} stroke="#9AA0B8" strokeWidth={8} strokeLinecap="round" />
      </svg>

      {/* A-pillar left */}
      <div
        className="absolute"
        style={{
          left: 0, top: 0, bottom: '30%', width: '12%',
          background: 'linear-gradient(135deg, rgba(8,10,18,1) 0%, transparent 100%)',
        }}
      />
      {/* A-pillar right */}
      <div
        className="absolute"
        style={{
          right: 0, top: 0, bottom: '30%', width: '12%',
          background: 'linear-gradient(225deg, rgba(8,10,18,1) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GlowShape — a single blurred ambient-light blob
// ─────────────────────────────────────────────────────────────────────────────

interface GlowShapeProps {
  top?:    string;
  bottom?: string;
  left?:   string;
  right?:  string;
  width:   string;
  height:  string;
  blur:    number;   // px
  color:   MotionValue<string>;
  opacity: MotionValue<number>;
}

function GlowShape({ top, bottom, left, right, width, height, blur, color, opacity }: GlowShapeProps) {
  return (
    <motion.div
      className="pointer-events-none absolute rounded-full"
      style={{
        top, bottom, left, right,
        width, height,
        background: color,
        opacity,
        filter: `blur(${blur}px)`,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SirenFlash — direction-aware cool burst overlay
// ─────────────────────────────────────────────────────────────────────────────

function SirenFlash({ direction }: { direction: string }) {
  const gradient =
    direction === 'left'
      ? 'radial-gradient(ellipse 50% 100% at 0% 50%, rgba(210,235,255,0.75), transparent 68%)'
      : direction === 'right'
        ? 'radial-gradient(ellipse 50% 100% at 100% 50%, rgba(210,235,255,0.75), transparent 68%)'
        : direction === 'rear'
          ? 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(210,235,255,0.55), transparent 68%)'
          : 'radial-gradient(ellipse 70% 55% at 50% 25%, rgba(210,235,255,0.65), transparent 68%)'; // front

  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.90, 0.45, 0] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.65, times: [0, 0.12, 0.50, 1], ease: 'easeOut' }}
      style={{ background: gradient }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CabinV2 — main export
// ─────────────────────────────────────────────────────────────────────────────

export default function CabinV2() {
  const decisions = useStore((s) => s.decisions);

  const dimLevel  = decisions?.lightDimLevel    ?? 0;
  const engCue    = decisions?.engagementCue    ?? false;
  const sounds    = decisions?.preservedSounds  ?? [];

  // Track whether the cabin photo failed to load so we can show the placeholder.
  const [photoError, setPhotoError] = useState(false);

  // ── Spring — drives colour + opacity transitions (~800 ms settle) ─────────
  const dimSpring = useSpring(dimLevel, { stiffness: 35, damping: 16 });
  useEffect(() => { dimSpring.set(dimLevel); }, [dimSpring, dimLevel]);

  // Ambient glow colour: warm amber → calm teal
  const glowColor = useTransform(
    dimSpring,
    [0, 1],
    ['#FFB36B', '#2DD4BF'],
  );

  // Overall glow brightness: dims as cabin calms
  const glowOpacity = useTransform(dimSpring, [0, 1], [0.30, 0.14]);

  // Footwell is always slightly dimmer than the dash/door strips
  const footOpacity = useTransform(dimSpring, [0, 1], [0.22, 0.10]);

  // Screen-blend tint: spills the hue across the entire cabin photo
  const screenTint = useTransform(
    dimSpring,
    [0, 1],
    ['rgba(255,179,107,0.07)', 'rgba(45,212,191,0.10)'],
  );

  // ── Siren flash state ─────────────────────────────────────────────────────
  const prevSirenRef = useRef(false);
  const [sirenDir, setSirenDir] = useState<string | null>(null);

  useEffect(() => {
    const sirenEvt = sounds.find((s) => s.type === 'siren');
    const active   = !!sirenEvt;
    if (active && !prevSirenRef.current) {
      setSirenDir(sirenEvt!.direction ?? 'front');
      const t = setTimeout(() => setSirenDir(null), 700);
      return () => clearTimeout(t);
    }
    prevSirenRef.current = active;
  }, [sounds]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="relative h-screen w-screen overflow-hidden select-none"
      style={{ background: '#04050A' }}
    >
      {/* ── 1. Background ───────────────────────────────────────────────── */}
      {!photoError ? (
        <img
          src={CABIN_SRC}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          draggable={false}
          onError={() => setPhotoError(true)}
        />
      ) : (
        <CabinPlaceholder />
      )}

      {/* ── 2. Vignette — keeps peripheral glows punchy against photo ──── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(115% 105% at 50% 43%, transparent 35%, rgba(0,0,0,0.70) 100%)',
        }}
      />

      {/* ── 3. Dash-line glow — wide strip at the instrument panel ───────
              Positioned at ~39 % from top; the Mercedes ambient strip lives here. */}
      <GlowShape
        top="36%" left="-8%" width="116%" height="14%"
        blur={52}
        color={glowColor}
        opacity={glowOpacity}
      />

      {/* ── 4. Left door-panel glow ────────────────────────────────────── */}
      <GlowShape
        top="14%" left="-6%" width="22%" height="74%"
        blur={55}
        color={glowColor}
        opacity={glowOpacity}
      />

      {/* ── 5. Right door-panel glow ───────────────────────────────────── */}
      <GlowShape
        top="14%" right="-6%" width="22%" height="74%"
        blur={55}
        color={glowColor}
        opacity={glowOpacity}
      />

      {/* ── 6. Footwell glow — lower-left of centre ────────────────────── */}
      <GlowShape
        bottom="-2%" left="6%" width="38%" height="26%"
        blur={48}
        color={glowColor}
        opacity={footOpacity}
      />

      {/* ── 7. Engagement violet breath — dash strip only ──────────────── */}
      <motion.div
        className="pointer-events-none absolute rounded-full"
        style={{ top: '34%', left: '-5%', width: '110%', height: '16%', filter: 'blur(58px)', background: '#9D8CFF' }}
        animate={
          engCue
            ? { opacity: [0, 0.32, 0.12, 0.32] }
            : { opacity: 0 }
        }
        transition={
          engCue
            ? { duration: 3.2, ease: 'easeInOut', repeat: Infinity }
            : { duration: 0.9, ease: 'easeOut' }
        }
      />

      {/* ── 8. Whole-frame screen-blend tint ───────────────────────────── */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background: screenTint,
          mixBlendMode: 'screen',
        }}
      />

      {/* ── 9. Siren side flash ────────────────────────────────────────── */}
      <AnimatePresence>
        {sirenDir && (
          <SirenFlash key={`flash-${sirenDir}`} direction={sirenDir} />
        )}
      </AnimatePresence>

      {/* ── 10. Notifications (fixed z-50, auto-positioned bottom-centre) */}
      <Notifications />
    </div>
  );
}
