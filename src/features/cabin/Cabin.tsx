import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { Notifications } from '@/features/notifications';
import { colors } from '@/theme/tokens';

function lerpHex(a: string, b: string, t: number): string {
  const parse = (h: string) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] as const;
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  return `rgb(${Math.round(ar+(br-ar)*t)},${Math.round(ag+(bg-ag)*t)},${Math.round(ab+(bb-ab)*t)})`;
}

/**
 * FPV Cabin View — team 01.
 * Full-bleed 1920×1080, designed for the projector.
 * No UI chrome — the light IS the interface.
 * Ambient strips on dash / door panels / footwell bind to store state.
 * Open /dashboard in one tab and /cabin in another — BroadcastChannel keeps them in sync.
 */
export default function Cabin() {
  const decisions = useStore((s) => s.decisions);

  const lightDim   = decisions?.lightDimLevel   ?? 0;
  const noiseCancel = decisions?.noiseCancelLevel ?? 0;
  const engageCue  = decisions?.engagementCue    ?? false;
  const preserved  = decisions?.preservedSounds  ?? [];

  const hasSiren = preserved.some((s) => s.type === 'siren');
  const siren    = preserved.find((s) => s.type === 'siren');
  const sirenLeft = siren?.direction === 'left';

  // Ambient glow color: warm baseline → ambientCalm teal as dimLevel rises
  const glowColor  = lerpHex(colors.ambient, colors.ambientCalm, lightDim);
  const glowOpacity = Math.max(0.12, 0.55 - lightDim * 0.3);

  // Overall darkness overlay: cabin dims as lightDimLevel rises
  const darkOverlay = lightDim * 0.35;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">

      {/* ── BASE CABIN SILHOUETTE ── */}
      {/* Dark layered gradient mimicking a car interior at night */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 40% at 50% 95%, rgba(14,10,6,0.98) 0%, transparent 100%),
            radial-gradient(ellipse 100% 55% at 50% 55%, rgba(6,9,16,0.75) 0%, transparent 100%),
            linear-gradient(185deg, #060810 0%, #0D0A07 45%, #090B10 100%)
          `,
        }}
      />

      {/* SVG cabin structure — dash, steering wheel, pillars, windshield frame */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Windshield outer frame */}
        <path
          d="M340,160 Q960,50 1580,160 L1700,460 Q960,370 220,460 Z"
          fill="rgba(4,5,10,0.82)"
        />
        {/* Windshield inner (sky/road visible area) */}
        <path
          d="M430,195 Q960,110 1490,195 L1590,420 Q960,345 330,420 Z"
          fill="rgba(8,12,22,0.5)"
        />
        {/* Dashboard mass */}
        <path
          d="M60,580 Q960,510 1860,580 L1920,720 L0,720 Z"
          fill="rgba(12,9,6,0.92)"
        />
        {/* Dash surface highlight strip (where light strips live) */}
        <path
          d="M100,575 Q960,508 1820,575"
          stroke="rgba(30,22,14,0.7)"
          strokeWidth="42"
          fill="none"
          strokeLinecap="round"
        />
        {/* Center console */}
        <path
          d="M760,720 L800,1080 L1120,1080 L1160,720 Z"
          fill="rgba(10,7,5,0.95)"
        />
        {/* Left A-pillar */}
        <path
          d="M0,0 L340,160 L220,460 L0,520 Z"
          fill="rgba(8,6,4,0.96)"
        />
        {/* Right A-pillar */}
        <path
          d="M1920,0 L1580,160 L1700,460 L1920,520 Z"
          fill="rgba(8,6,4,0.96)"
        />
        {/* Left door panel */}
        <path
          d="M0,520 L220,460 L240,1080 L0,1080 Z"
          fill="rgba(10,7,5,0.97)"
        />
        {/* Right door panel */}
        <path
          d="M1920,520 L1700,460 L1680,1080 L1920,1080 Z"
          fill="rgba(10,7,5,0.97)"
        />
        {/* Steering wheel */}
        <circle cx={640} cy={830} r={110} stroke="rgba(28,22,14,0.9)" strokeWidth={22} fill="rgba(8,6,4,0.4)" />
        <circle cx={640} cy={830} r={30} fill="rgba(16,12,8,0.85)" />
        <line x1={640} y1={720} x2={640} y2={800} stroke="rgba(28,22,14,0.9)" strokeWidth={10} />
        <line x1={640} y1={860} x2={640} y2={940} stroke="rgba(28,22,14,0.9)" strokeWidth={10} />
        <line x1={530} y1={830} x2={610} y2={830} stroke="rgba(28,22,14,0.9)" strokeWidth={10} />
        <line x1={670} y1={830} x2={750} y2={830} stroke="rgba(28,22,14,0.9)" strokeWidth={10} />
        {/* Instrument cluster (left screen) */}
        <rect x={420} y={530} width={260} height={110} rx={12} fill="rgba(12,16,24,0.8)" stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        {/* Center MBUX screen */}
        <rect x={860} y={522} width={200} height={120} rx={10} fill="rgba(10,14,22,0.85)" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      </svg>

      {/* ── AMBIENT LIGHT STRIPS ── */}

      {/* Dash strip glow — the main light signature */}
      <motion.div
        className="pointer-events-none absolute"
        style={{ bottom: '37%', left: '8%', right: '8%', height: 70 }}
        animate={{ opacity: glowOpacity, backgroundColor: glowColor }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        // @ts-ignore blur is a valid CSS property
        customAttr=""
      >
        <div style={{ width: '100%', height: '100%', background: glowColor, filter: 'blur(38px)', borderRadius: '50%' }} />
      </motion.div>

      {/* Left door strip */}
      <motion.div
        className="pointer-events-none absolute"
        style={{ top: '30%', left: 0, width: 180, bottom: '18%' }}
        animate={{ opacity: glowOpacity * 0.65, backgroundColor: glowColor }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      >
        <div style={{ width: '100%', height: '100%', background: glowColor, filter: 'blur(50px)' }} />
      </motion.div>

      {/* Right door strip */}
      <motion.div
        className="pointer-events-none absolute"
        style={{ top: '30%', right: 0, width: 180, bottom: '18%' }}
        animate={{ opacity: glowOpacity * 0.65, backgroundColor: glowColor }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      >
        <div style={{ width: '100%', height: '100%', background: glowColor, filter: 'blur(50px)' }} />
      </motion.div>

      {/* Footwell glow */}
      <motion.div
        className="pointer-events-none absolute"
        style={{ bottom: 0, left: '12%', right: '12%', height: 140 }}
        animate={{ opacity: glowOpacity * 0.45, backgroundColor: glowColor }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      >
        <div style={{ width: '100%', height: '100%', background: glowColor, filter: 'blur(60px)' }} />
      </motion.div>

      {/* ── ENGAGEMENT CUE — violet breath across the dash strip ── */}
      <motion.div
        className="pointer-events-none absolute"
        style={{ bottom: '36%', left: '5%', right: '5%', height: 55 }}
        animate={{ opacity: engageCue ? [0, 0.5, 0] : 0 }}
        transition={{ duration: 2.5, repeat: engageCue ? Infinity : 0, ease: 'easeInOut' }}
      >
        <div style={{ width: '100%', height: '100%', background: colors.engage, filter: 'blur(44px)', borderRadius: '50%' }} />
      </motion.div>

      {/* ── SIREN DIRECTIONAL FLASH ── */}
      <AnimatePresence>
        {hasSiren && (
          <motion.div
            key="siren-flash"
            className="pointer-events-none absolute"
            style={{
              top: 0, bottom: 0,
              [sirenLeft ? 'left' : 'right']: 0,
              width: '28%',
              background: `linear-gradient(${sirenLeft ? '90deg' : '270deg'}, ${colors.alert}22, transparent)`,
              filter: 'blur(20px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.3, 0.8, 0.15, 0.7, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.2, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      {/* ── WHOLE-CABIN TINT OVERLAY (mix-blend-mode: screen) ── */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ mixBlendMode: 'screen' }}
        animate={{
          background: hasSiren
            ? `rgba(255,87,101,0.07)`
            : lightDim > 0.5
            ? `rgba(45,212,191,0.04)`
            : `rgba(255,179,107,0.03)`,
        }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />

      {/* Darkness overlay as cabin dims */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: darkOverlay }}
        style={{ background: 'black' }}
        transition={{ duration: 0.75, ease: 'easeInOut' }}
      />

      {/* ── NOISE CANCEL — subtle vignette darkening of edges ── */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: noiseCancel * 0.12 }}
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,1) 100%)',
        }}
        transition={{ duration: 0.6 }}
      />

      {/* ── ATTUNE STATUS — minimal corner badge ── */}
      <div className="absolute left-7 top-6 flex items-center gap-2">
        <motion.div
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: colors.accent, boxShadow: `0 0 5px ${colors.accent}` }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <span className="label-attune text-[10px] tracking-labelWide" style={{ color: `${colors.textMute}` }}>
          ATTUNE
        </span>
      </div>

      {/* ── BACK LINK (corner, very dim) ── */}
      <Link
        to="/dashboard"
        className="absolute bottom-6 right-7 font-mono text-[11px] text-textMute opacity-40 transition-opacity hover:opacity-80"
      >
        ← /dashboard
      </Link>

      <Notifications />
    </div>
  );
}
