import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion';
import { useStore } from '@/store';
import { Notifications } from '@/features/notifications';

// ─────────────────────────────────────────────────────────────────────────────
// CabinV2 — full-bleed first-person cockpit.
//
// This is a faithful, pixel-for-pixel port of the approved mockup
// `attune-mock-cabin-fpv-v2.png` (source: mockups-v2/cabin.html). The whole
// scene is authored in a fixed 1920×1080 "stage" and scaled to cover the
// viewport, so geometry matches the render exactly. Every value is wired to the
// shared store, so /dashboard and /cabin move together and the scene animates:
//
//   lightDimLevel → ambient strips + footwell + tint warm-amber → calm-teal
//   engagementCue → slow violet breath + ENGAGE chrome
//   siren preserved → cool side flash + ALERT chrome + screen warning
// ─────────────────────────────────────────────────────────────────────────────

const AMBER  = '#FFB36B'; // tokens.ambient
const TEAL   = '#2DD4BF'; // tokens.ambientCalm
const VIOLET = '#9D8CFF';
const ALERT  = '#FF5765';

// Ambient light-strip geometry (dash crown sweep + door contours).
const CROWN_D = 'M-20 596 C 360 556 720 540 962 546 C 1280 554 1620 580 1940 614';
const DOORL_D = 'M120 612 C 250 690 300 820 300 1040';
const DOORR_D = 'M1800 612 C 1670 690 1620 820 1620 1040';

// ADHD re-engagement rhythm — a gentle repeating "heartbeat" (double-thump then
// rest). Repetition + mild novelty re-orients attention better than a slow fade,
// while staying calm (no alarm-style flashing). Reused across the cue elements.
const ENG_PULSE = { duration: 1.7, times: [0, 0.12, 0.28, 0.44, 1], ease: 'easeInOut', repeat: Infinity } as const;
const VIOLET_LIT = '#C4B9FF'; // brighter violet for the pulse core

function hexToRgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Scale the fixed 1920×1080 stage to *cover* the viewport (16:9 → exact fit).
function useCoverScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () =>
      setScale(Math.max(window.innerWidth / 1920, window.innerHeight / 1080));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}

export default function CabinV2() {
  const decisions = useStore((s) => s.decisions);
  const scenario  = useStore((s) => s.activeScenario);
  const scale = useCoverScale();

  const dimLevel   = decisions?.lightDimLevel    ?? 0;
  const noiseLevel = decisions?.noiseCancelLevel ?? 0;
  // Re-engagement light cue is confined to the attention-drop scenario only.
  const engCue     = (decisions?.engagementCue ?? false) && scenario === 'attention_drop';
  const sounds     = decisions?.preservedSounds  ?? [];

  const siren   = sounds.find((s) => s.type === 'siren');
  const sirenOn = !!siren;
  const kelvin  = Math.round(2200 + (1 - dimLevel) * 2600);

  // Cluster shows SPEED — gentle random-walk so the dial reads alive.
  const [speed, setSpeed] = useState(62);
  useEffect(() => {
    const id = setInterval(() => {
      setSpeed((s) => Math.max(55, Math.min(69, Math.round(s + (Math.random() - 0.5) * 3))));
    }, 1600);
    return () => clearInterval(id);
  }, []);

  // ── Ambient colour + brightness spring (amber → teal, ~800 ms settle) ───────
  const dim = useSpring(dimLevel, { stiffness: 35, damping: 16 });
  useEffect(() => { dim.set(dimLevel); }, [dim, dimLevel]);

  const stripColor   = useTransform(dim, [0, 1], [AMBER, TEAL]);
  const stripOpacity = useTransform(dim, [0, 1], [0.72, 1]);
  // Layered neon bloom — wide soft halo → mid glow → bright core → white-hot centre.
  const bloomOp    = useTransform(stripOpacity, (o) => o * 0.42);
  const midOp      = useTransform(stripOpacity, (o) => o * 0.72);
  const doorMidOp  = useTransform(stripOpacity, (o) => o * 0.55);
  const doorCoreOp = useTransform(stripOpacity, (o) => o * 0.9);
  const coreWhiteOp = useTransform(stripOpacity, (o) => o * 0.7);
  const doorWhiteOp = useTransform(stripOpacity, (o) => o * 0.45);
  const coreWhite  = useTransform(dim, [0, 1], ['#FFE6C8', '#DEFDF6']); // warm-white → cool-white tube centre
  const footColor    = useTransform(dim, [0, 1],
    ['radial-gradient(circle,rgba(255,179,107,0.34),transparent 66%)',
     'radial-gradient(circle,rgba(45,212,191,0.40),transparent 66%)']);
  const tintBg       = useTransform(dim, [0, 1],
    ['radial-gradient(1300px 760px at 50% 96%,rgba(255,179,107,0.14),transparent 60%)',
     'radial-gradient(1300px 760px at 50% 96%,rgba(45,212,191,0.17),transparent 60%)']);

  // ── Chrome accent (mode) — teal at calm/active, violet on cue, red on alert ─
  const isAlert = sirenOn;
  const isEng   = engCue && !sirenOn;
  const accent       = isAlert ? ALERT   : isEng ? VIOLET   : TEAL;
  const accentBright = isAlert ? '#FF8A93' : isEng ? '#C4B9FF' : '#7FE0D4';
  const modeLabel = isAlert ? 'ALERT'
    : isEng ? 'ENGAGE'
    : dimLevel > 0.25 || noiseLevel > 0.25 ? 'CALMING' : 'ACTIVE';

  // ── Siren side flash ────────────────────────────────────────────────────────
  const prevSiren = useRef(false);
  const [flashDir, setFlashDir] = useState<string | null>(null);
  useEffect(() => {
    if (sirenOn && !prevSiren.current) {
      setFlashDir(siren!.direction ?? 'front');
      const t = setTimeout(() => setFlashDir(null), 700);
      prevSiren.current = sirenOn;
      return () => clearTimeout(t);
    }
    prevSiren.current = sirenOn;
  }, [sirenOn]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{ background: '#02040A' }}>
      {/* 1920×1080 stage, scaled to cover the viewport */}
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%', width: 1920, height: 1080,
          transform: `translate(-50%,-50%) scale(${scale})`, transformOrigin: 'center center',
        }}
      >
        {/* ══ WINDSHIELD / ROAD ══════════════════════════════════════════════ */}
        <div className="absolute inset-0" style={{ zIndex: 1,
          background: 'radial-gradient(1500px 560px at 47% 24%, #102634 0%, #0A1826 38%, #050B14 70%, #02060C 100%)' }} />
        <div className="absolute inset-0" style={{ zIndex: 1, opacity: 0.55, backgroundImage: [
          'radial-gradient(1.5px 1.5px at 12% 12%,rgba(190,225,240,.6),transparent)',
          'radial-gradient(1.3px 1.3px at 30% 8%,rgba(180,215,235,.45),transparent)',
          'radial-gradient(1.6px 1.6px at 58% 14%,rgba(200,230,245,.5),transparent)',
          'radial-gradient(1.2px 1.2px at 74% 9%,rgba(180,215,235,.4),transparent)',
          'radial-gradient(1.4px 1.4px at 88% 16%,rgba(190,225,240,.45),transparent)',
        ].join(',') }} />
        <div className="absolute" style={{ zIndex: 1, left: 0, right: 0, top: 250, height: 120, background:
          'radial-gradient(560px 80px at 34% 100%,rgba(120,150,185,.20),transparent 70%),radial-gradient(640px 80px at 70% 100%,rgba(110,140,175,.16),transparent 70%)' }} />
        <div className="absolute" style={{ zIndex: 1, left: 0, right: 0, top: 300, height: 340,
          background: 'linear-gradient(180deg,#060D16 0%,#0A111B 60%,#0C121C 100%)' }} />
        <div className="absolute" style={{ zIndex: 1, left: '50%', top: 300, transform: 'translateX(-50%)',
          width: 2000, height: 340,
          background: 'linear-gradient(to bottom right,transparent 49.5%,rgba(120,160,185,.16) 49.8%,transparent 50.1%),linear-gradient(to bottom left,transparent 49.5%,rgba(120,160,185,.16) 49.8%,transparent 50.1%)',
          WebkitMaskImage: 'linear-gradient(180deg,transparent,#000 55%)',
          maskImage: 'linear-gradient(180deg,transparent,#000 55%)' }} />

        {/* dashed centre lane */}
        <div className="absolute flex flex-col items-center" style={{ zIndex: 2, left: 'calc(47% - 4px)', top: 308, gap: 16 }}>
          {[{ w: 6, h: 9, o: 0.35 }, { w: 7, h: 13, o: 0.45 }, { w: 8, h: 18, o: 0.6 }, { w: 10, h: 28, o: 0.8 }, { w: 13, h: 42, o: 1 }].map((s, i) => (
            <span key={i} style={{ display: 'block', width: s.w, height: s.h, opacity: s.o, background: 'rgba(215,228,238,.55)', borderRadius: 6 }} />
          ))}
        </div>

        {/* tail-lights of the car ahead */}
        <div className="absolute" style={{ zIndex: 2, top: 286, left: 890, width: 13, height: 7, borderRadius: '50%', background: '#FF3B46', boxShadow: '0 0 14px 4px rgba(255,59,70,.8)' }} />
        <div className="absolute" style={{ zIndex: 2, top: 286, left: 916, width: 13, height: 7, borderRadius: '50%', background: '#FF3B46', boxShadow: '0 0 14px 4px rgba(255,59,70,.8)' }} />

        {/* windshield reflection */}
        <div className="absolute pointer-events-none" style={{ zIndex: 2, left: 0, right: 0, top: 300, height: 300, mixBlendMode: 'screen', opacity: 0.5,
          background: 'radial-gradient(900px 200px at 50% 150%,rgba(45,212,191,.18),transparent 70%)' }} />

        {/* ══ ROOF / PILLARS / MIRROR ════════════════════════════════════════ */}
        <div className="absolute" style={{ zIndex: 3, left: 0, right: 0, top: 0, height: 46, background: 'linear-gradient(180deg,#0A0F16,#070B11)' }} />
        <div className="absolute" style={{ zIndex: 3, left: 0, top: 40, width: 380, height: 640,
          background: 'linear-gradient(110deg,#0C121B 0%,#090E16 60%,transparent 100%)', clipPath: 'polygon(0 0,38% 0,100% 100%,0 100%)' }} />
        <div className="absolute" style={{ zIndex: 3, right: 0, top: 40, width: 380, height: 640,
          background: 'linear-gradient(250deg,#0C121B 0%,#090E16 60%,transparent 100%)', clipPath: 'polygon(62% 0,100% 0,100% 100%,0 100%)' }} />
        {/* rear-view mirror + stem */}
        <div className="absolute" style={{ zIndex: 3, left: '50%', top: 30, transform: 'translateX(-50%)', width: 172, height: 48, borderRadius: 24,
          background: 'linear-gradient(180deg,#11171F,#090D13)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05),0 6px 18px rgba(0,0,0,.6)' }}>
          <div style={{ position: 'absolute', left: '50%', top: -16, transform: 'translateX(-50%)', width: 10, height: 18, background: '#0B0F15', borderRadius: 4 }} />
        </div>

        {/* ══ DASHBOARD ══════════════════════════════════════════════════════ */}
        <div className="absolute" style={{ zIndex: 4, left: 0, right: 0, top: 560, bottom: 0,
          background: 'linear-gradient(180deg,#0B1018 0%,#090D15 30%,#070B12 70%,#04070D 100%)' }} />
        <div className="absolute" style={{ zIndex: 4, left: 0, right: 0, top: 560, height: 120,
          background: 'radial-gradient(1400px 160px at 48% 0%,rgba(40,60,76,.5),transparent 72%)' }} />

        {/* ══ AMBIENT LIGHT LINE (dash crown + doors) — layered neon bloom ═══ */}
        <svg className="absolute pointer-events-none" style={{ zIndex: 5, left: 0, top: 0 }} width={1920} height={1080} viewBox="0 0 1920 1080" fill="none">
          <defs>
            <filter id="glowCore" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowMid" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="12" /></filter>
            <filter id="glowBloom" x="-140%" y="-140%" width="380%" height="380%"><feGaussianBlur stdDeviation="30" /></filter>
            <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#000" /><stop offset="0.16" stopColor="#fff" />
              <stop offset="0.84" stopColor="#fff" /><stop offset="1" stopColor="#000" />
            </linearGradient>
            <mask id="fadem"><rect width="1920" height="1080" fill="url(#fade)" /></mask>
          </defs>

          {/* dash-crown sweep: wide halo → mid glow → bright core → white-hot centre */}
          <g mask="url(#fadem)" fill="none" strokeLinecap="round">
            <motion.path d={CROWN_D} strokeWidth={34} filter="url(#glowBloom)" style={{ stroke: stripColor, opacity: bloomOp }} />
            <motion.path d={CROWN_D} strokeWidth={13} filter="url(#glowMid)"   style={{ stroke: stripColor, opacity: midOp }} />
            <motion.path d={CROWN_D} strokeWidth={3.4} filter="url(#glowCore)"  style={{ stroke: stripColor, opacity: stripOpacity }} />
            <motion.path d={CROWN_D} strokeWidth={1.3}                          style={{ stroke: coreWhite, opacity: coreWhiteOp }} />
          </g>

          {/* door strips: glow underlay → bright core → white-hot centre */}
          <g fill="none" strokeLinecap="round">
            <motion.path d={DOORL_D} strokeWidth={11}  filter="url(#glowMid)"  style={{ stroke: stripColor, opacity: doorMidOp }} />
            <motion.path d={DOORL_D} strokeWidth={2.6} filter="url(#glowCore)" style={{ stroke: stripColor, opacity: doorCoreOp }} />
            <motion.path d={DOORL_D} strokeWidth={1.1}                         style={{ stroke: coreWhite, opacity: doorWhiteOp }} />
            <motion.path d={DOORR_D} strokeWidth={11}  filter="url(#glowMid)"  style={{ stroke: stripColor, opacity: doorMidOp }} />
            <motion.path d={DOORR_D} strokeWidth={2.6} filter="url(#glowCore)" style={{ stroke: stripColor, opacity: doorCoreOp }} />
            <motion.path d={DOORR_D} strokeWidth={1.1}                         style={{ stroke: coreWhite, opacity: doorWhiteOp }} />
          </g>

          {/* ADHD re-engagement: the strips beat violet in a repeating heartbeat */}
          {isEng && (
            <>
              <g mask="url(#fadem)" fill="none" strokeLinecap="round">
                <motion.path d={CROWN_D} strokeWidth={18} filter="url(#glowMid)"  stroke={VIOLET}
                  initial={{ opacity: 0 }} animate={{ opacity: [0.05, 0.55, 0.15, 0.5, 0.08] }} transition={ENG_PULSE} />
                <motion.path d={CROWN_D} strokeWidth={3}  filter="url(#glowCore)" stroke={VIOLET_LIT}
                  initial={{ opacity: 0 }} animate={{ opacity: [0.1, 0.7, 0.2, 0.6, 0.1] }} transition={ENG_PULSE} />
              </g>
              <g fill="none" strokeLinecap="round">
                {[DOORL_D, DOORR_D].map((d, i) => (
                  <motion.path key={`edm-${i}`} d={d} strokeWidth={12} filter="url(#glowMid)" stroke={VIOLET}
                    initial={{ opacity: 0 }} animate={{ opacity: [0.04, 0.45, 0.12, 0.4, 0.06] }} transition={ENG_PULSE} />
                ))}
                {[DOORL_D, DOORR_D].map((d, i) => (
                  <motion.path key={`edc-${i}`} d={d} strokeWidth={2.6} filter="url(#glowCore)" stroke={VIOLET_LIT}
                    initial={{ opacity: 0 }} animate={{ opacity: [0.08, 0.6, 0.16, 0.5, 0.08] }} transition={ENG_PULSE} />
                ))}
              </g>
            </>
          )}
        </svg>

        {/* ══ INSTRUMENT BINNACLE + CLUSTER ══════════════════════════════════ */}
        <div className="absolute" style={{ zIndex: 6, left: 440, top: 470, width: 560, height: 252,
          background: 'radial-gradient(120% 150% at 50% 0%,#141C26 0%,#0C131C 55%,#080D14 100%)',
          borderRadius: '130px 130px 26px 26px', boxShadow: 'inset 0 2px 0 rgba(120,160,180,.10),0 20px 50px -20px rgba(0,0,0,.8)' }} />
        <div className="absolute overflow-hidden" style={{ zIndex: 6, left: 480, top: 500, width: 480, height: 182,
          borderRadius: '96px 96px 18px 18px', background: 'radial-gradient(120% 140% at 50% 10%,#0A1820 0%,#060E15 70%)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,.7),inset 0 1px 0 rgba(45,212,191,.18)' }}>
          {/* gauge cowl arcs */}
          <div style={{ position: 'absolute', top: 30, left: 34, width: 120, height: 120, borderRadius: '50%', border: '3px solid transparent',
            borderLeftColor: hexToRgba(accent, 0.6), borderTopColor: hexToRgba(accent, 0.35), transform: 'rotate(-20deg)' }} />
          <div style={{ position: 'absolute', top: 30, right: 34, width: 120, height: 120, borderRadius: '50%', border: '3px solid transparent',
            borderRightColor: hexToRgba(accent, 0.6), borderTopColor: hexToRgba(accent, 0.35), transform: 'rotate(20deg)' }} />
          {/* mode badge */}
          <div className="font-mono" style={{ position: 'absolute', left: '50%', top: 16, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 7,
            padding: '5px 13px', borderRadius: 999, border: `1px solid ${hexToRgba(accent, 0.3)}`, background: hexToRgba(accent, 0.09),
            fontSize: 10, letterSpacing: '.24em', color: accentBright }}>
            <Droplet color={accentBright} />
            {modeLabel}
          </div>
          {/* speed */}
          <div style={{ position: 'absolute', left: '50%', top: 60, transform: 'translateX(-50%)', textAlign: 'center' }}>
            <div className="font-mono" style={{ fontWeight: 600, fontSize: 74, lineHeight: 0.9, color: '#CFF6F0', textShadow: `0 0 22px ${hexToRgba(accent, 0.55)}` }}>
              {speed}
            </div>
            <div className="font-mono" style={{ fontSize: 13, letterSpacing: '.22em', color: '#5E8B86', marginTop: 4 }}>KM / H</div>
          </div>
        </div>

        {/* ══ VENTS ══════════════════════════════════════════════════════════ */}
        <Vent left={176} top={650} />
        <Vent left={1710} top={650} />

        {/* ══ CENTER MBUX SCREEN — ATTUNE board (angled, in-dash) ════════════ */}
        <div className="absolute" style={{ zIndex: 6, left: 1168, top: 494, width: 438, height: 382,
          transform: 'perspective(1500px) rotateY(-13deg)', transformOrigin: 'left center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 16, background: 'linear-gradient(160deg,#0A141C,#060C12)',
            border: `1px solid ${hexToRgba(accent, 0.18)}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,.06),0 24px 60px -28px rgba(0,0,0,.9),0 0 60px -20px ${hexToRgba(accent, 0.28)}`,
            padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 15, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="font-sans" style={{ fontWeight: 700, letterSpacing: '.34em', fontSize: 14, color: '#D6ECE8' }}>
                ATTUNE<span style={{ color: accent }}>.</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: accentBright }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 12px 2px ${hexToRgba(accent, 0.8)}` }} />
                {modeLabel}
              </span>
            </div>

            <ScreenBar label="Noise Cancel" value={`${Math.round(noiseLevel * 100)}%`} level={noiseLevel} variant="noise" accentBright={accentBright} />
            <ScreenBar label="Lighting" value={dimLevel > 0.05 ? `Dimmed · ${kelvin}K` : 'Full'} level={dimLevel} variant="light" accentBright={accentBright} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, letterSpacing: '.06em', color: '#9AA8A4' }}>
              <span>Siren Watch</span>
              <span className="font-mono" style={{ color: sirenOn ? ALERT : accentBright }}>
                {sirenOn ? `Alert · ${(siren!.direction ?? 'near').toUpperCase()}` : 'Active'}
              </span>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 12,
              background: hexToRgba(accent, 0.09), border: `1px solid ${hexToRgba(accent, 0.24)}` }}>
              <span style={{ width: 3, height: 30, borderRadius: 2, background: accent, boxShadow: `0 0 10px 1px ${hexToRgba(accent, 0.7)}`, flex: 'none' }} />
              <span style={{ fontSize: 13.5, lineHeight: 1.35, color: '#DCF4F0' }}>{statusMessage(sirenOn, isEng, dimLevel, noiseLevel)}</span>
            </div>

            <div style={{ position: 'absolute', inset: 0, borderRadius: 16, mixBlendMode: 'screen', opacity: 0.4, pointerEvents: 'none',
              background: 'linear-gradient(135deg,rgba(120,200,210,.12),transparent 45%)' }} />
          </div>
        </div>

        {/* ══ DOOR PANELS (foreground) ═══════════════════════════════════════ */}
        <div className="absolute" style={{ zIndex: 7, left: 0, top: 540, width: 430, height: 540,
          background: 'linear-gradient(80deg,#0B1019 0%,#080D15 60%,transparent 100%)', clipPath: 'polygon(0 12%,30% 22%,16% 100%,0 100%)' }} />
        <div className="absolute" style={{ zIndex: 7, right: 0, top: 540, width: 430, height: 540,
          background: 'linear-gradient(280deg,#0B1019 0%,#080D15 60%,transparent 100%)', clipPath: 'polygon(70% 22%,100% 12%,100% 100%,84% 100%)' }} />

        {/* ══ FOOTWELL GLOW ══════════════════════════════════════════════════ */}
        <motion.div className="absolute pointer-events-none" style={{ zIndex: 7, left: -140, bottom: -160, width: 680, height: 460, borderRadius: '50%',
          background: footColor, filter: 'blur(26px)', mixBlendMode: 'screen' }} />
        <motion.div className="absolute pointer-events-none" style={{ zIndex: 7, right: -140, bottom: -160, width: 680, height: 460, borderRadius: '50%',
          background: footColor, filter: 'blur(26px)', mixBlendMode: 'screen' }} />

        {/* ══ STEERING WHEEL ═════════════════════════════════════════════════ */}
        <svg className="absolute" style={{ zIndex: 8, left: 290, top: 596, filter: 'drop-shadow(0 -8px 36px rgba(0,0,0,.55))' }}
          width={860} height={860} viewBox="0 0 776 776" fill="none">
          <defs>
            <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3F4A57" /><stop offset=".18" stopColor="#222B35" />
              <stop offset=".55" stopColor="#151C25" /><stop offset="1" stopColor="#0A0F15" />
            </linearGradient>
            <radialGradient id="hub" cx="50%" cy="34%" r="75%">
              <stop offset="0" stopColor="#1A222C" /><stop offset="55%" stopColor="#10161E" /><stop offset="100%" stopColor="#080C12" />
            </radialGradient>
            <linearGradient id="spoke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#222B35" /><stop offset="1" stopColor="#0C1219" />
            </linearGradient>
            <filter id="ws" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#000" floodOpacity=".55" />
            </filter>
          </defs>
          {/* spokes (behind rim) */}
          <g filter="url(#ws)">
            <path d="M388 388 L 120 408 Q 96 388 120 368 Z" fill="url(#spoke)" />
            <path d="M388 388 L 656 408 Q 680 388 656 368 Z" fill="url(#spoke)" />
            <path d="M388 388 L 360 700 Q 388 720 416 700 Z" fill="url(#spoke)" />
            <rect x="150" y="372" width="180" height="34" rx="17" fill="url(#spoke)" />
            <rect x="446" y="372" width="180" height="34" rx="17" fill="url(#spoke)" />
          </g>
          {/* rim */}
          <circle cx="388" cy="388" r="330" stroke="url(#rim)" strokeWidth="60" />
          <circle cx="388" cy="388" r="330" stroke="rgba(195,215,230,.36)" strokeWidth="7" strokeLinecap="round"
            strokeDasharray="380 1693" strokeDashoffset="710" transform="rotate(-90 388 388)" />
          <circle cx="388" cy="388" r="330" stroke={hexToRgba(accent, 0.3)} strokeWidth="4" strokeLinecap="round"
            strokeDasharray="300 1773" strokeDashoffset="1740" transform="rotate(-90 388 388)" />
          <circle cx="388" cy="388" r="300" stroke="rgba(0,0,0,.5)" strokeWidth="3" />
          <circle cx="388" cy="388" r="360" stroke="rgba(0,0,0,.45)" strokeWidth="2" />
          {/* hub / airbag */}
          <rect x="244" y="296" width="288" height="196" rx="48" fill="url(#hub)" stroke="rgba(120,150,170,.14)" strokeWidth="1.5" />
          <rect x="276" y="372" width="224" height="2.4" rx="1" fill="rgba(150,180,195,.16)" />
          {/* emblem ring */}
          <circle cx="388" cy="388" r="34" fill="none" stroke="rgba(150,180,195,.32)" strokeWidth="2.4" />
          <circle cx="388" cy="388" r="34" fill="none" stroke={hexToRgba(accent, 0.35)} strokeWidth="2.4" strokeDasharray="40 174" />
          {/* backlit control buttons */}
          <rect x="186" y="378" width="34" height="22" rx="7" fill="#0E141B" stroke={hexToRgba(accent, 0.45)} strokeWidth="1.2" />
          <rect x="556" y="378" width="34" height="22" rx="7" fill="#0E141B" stroke={hexToRgba(accent, 0.45)} strokeWidth="1.2" />
          <circle cx="203" cy="358" r="3" fill={accent} /><circle cx="573" cy="358" r="3" fill={accent} />
        </svg>

        {/* ══ ENGAGEMENT — repeating heartbeat glow to pull the eye back ══════ */}
        <AnimatePresence>
          {isEng && (
            <>
              {/* dash-level violet wash, beating in rhythm */}
              <motion.div key="eng" className="absolute pointer-events-none" style={{ zIndex: 19, left: 115, right: 115, top: 470, height: 130, borderRadius: '50%', filter: 'blur(60px)', background: VIOLET }}
                initial={{ opacity: 0 }} animate={{ opacity: [0.04, 0.42, 0.12, 0.36, 0.05] }} exit={{ opacity: 0 }}
                transition={ENG_PULSE} />
              {/* forward wash near the road centre — nudges gaze back to the road */}
              <motion.div key="eng-fwd" className="absolute pointer-events-none" style={{ zIndex: 19, left: '38%', right: '38%', top: 300, height: 150, borderRadius: '50%', filter: 'blur(64px)', background: VIOLET }}
                initial={{ opacity: 0 }} animate={{ opacity: [0, 0.26, 0.06, 0.22, 0.03] }} exit={{ opacity: 0 }}
                transition={ENG_PULSE} />
            </>
          )}
        </AnimatePresence>

        {/* ══ WHOLE-CABIN TINT + VIGNETTE ════════════════════════════════════ */}
        <motion.div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20, mixBlendMode: 'screen', background: tintBg }} />
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 21,
          background: 'radial-gradient(135% 120% at 50% 42%,transparent 50%,rgba(0,0,0,.66) 100%)' }} />

        {/* ══ SIREN SIDE FLASH ═══════════════════════════════════════════════ */}
        <AnimatePresence>
          {flashDir && <SirenFlash key={`flash-${flashDir}`} direction={flashDir} />}
        </AnimatePresence>
      </div>

      <Notifications />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pieces
// ─────────────────────────────────────────────────────────────────────────────

function Vent({ left, top }: { left: number; top: number }) {
  return (
    <div className="absolute" style={{ zIndex: 6, left, top, width: 70, height: 70, borderRadius: '50%',
      background: 'repeating-radial-gradient(circle at 50% 50%,#0C1219 0 4px,#161E27 4px 6px)',
      boxShadow: 'inset 0 0 14px rgba(0,0,0,.8),inset 0 2px 0 rgba(120,150,170,.12)' }}>
      <div style={{ position: 'absolute', inset: '30px 8px', borderRadius: '50%', background: 'linear-gradient(180deg,#1A232D,#0A0F16)', transform: 'rotate(28deg)' }} />
    </div>
  );
}

function Droplet({ color }: { color: string }) {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <path d="M12 3c-2 0-3 1.5-3 3 0 1 .5 1.8 1 2.3-1.6.6-3 2.3-3 4.7 0 3 2.2 5 5 5s5-2 5-5c0-2.4-1.4-4.1-3-4.7.5-.5 1-1.3 1-2.3 0-1.5-1-3-3-3z" />
    </svg>
  );
}

function ScreenBar({ label, value, level, variant, accentBright }:
  { label: string; value: string; level: number; variant: 'noise' | 'light'; accentBright: string }) {
  const fill = `${Math.max(2, Math.min(100, level * 100)).toFixed(0)}%`;
  const barBg = variant === 'noise'
    ? 'linear-gradient(90deg,#0E7490,#2DD4BF)'
    : 'linear-gradient(90deg,#1B3A40,#7FE0D4)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, letterSpacing: '.06em', color: '#9AA8A4', marginBottom: 9 }}>
        <span>{label}</span>
        <span className="font-mono" style={{ color: accentBright }}>{value}</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
        <motion.div style={{ height: '100%', borderRadius: 999, background: barBg,
          boxShadow: variant === 'noise' ? '0 0 14px 1px rgba(45,212,191,.5)' : 'none' }}
          animate={{ width: fill }} transition={{ duration: 0.7, ease: 'easeInOut' }} />
      </div>
    </div>
  );
}

function SirenFlash({ direction }: { direction: string }) {
  const gradient =
    direction === 'left'
      ? 'radial-gradient(ellipse 50% 100% at 0% 50%, rgba(210,235,255,0.75), transparent 68%)'
      : direction === 'right'
        ? 'radial-gradient(ellipse 50% 100% at 100% 50%, rgba(210,235,255,0.75), transparent 68%)'
        : direction === 'rear'
          ? 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(210,235,255,0.55), transparent 68%)'
          : 'radial-gradient(ellipse 70% 55% at 50% 25%, rgba(210,235,255,0.65), transparent 68%)';
  return (
    <motion.div className="absolute inset-0 pointer-events-none" style={{ zIndex: 22, background: gradient }}
      initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0.45, 0] }} exit={{ opacity: 0 }}
      transition={{ duration: 0.65, times: [0, 0.12, 0.5, 1], ease: 'easeOut' }} />
  );
}

function statusMessage(siren: boolean, eng: boolean, dim: number, noise: number) {
  if (siren) return 'Emergency vehicle — kept audible through the calm';
  if (eng)   return 'Attention dipping — gentle cue';
  if (dim > 0.25 || noise > 0.25) return 'Calming cabin — noise reduced, lighting softened';
  return 'Cabin neutral — monitoring your state';
}
