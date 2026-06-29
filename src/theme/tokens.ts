/**
 * Attune design tokens — the single source of visual truth.
 * Encoded from `attune-design-system.md` §1–§4. Consumed by:
 *   - `tailwind.config.ts` (becomes the Tailwind theme: colors, fonts, radius)
 *   - app code that needs raw values (Framer Motion springs, SVG gauges, FPV glows)
 *
 * Lead owns this file. Do not hardcode hexes in feature code — read from here / Tailwind.
 */

/** §1 Color tokens — "Deep Cyan Noir" palette. */
export const colors = {
  /** App background base gradient stops (top-left → bottom-right). Never flat black. */
  bgFrom: '#0B1422',
  bgMid: '#070C15',
  bgTo: '#04060B',

  surface: 'rgba(18, 24, 34, 0.55)', // GLASS card fill — translucent + backdrop-blur so the gradient breathes through (§7)
  surfaceHighlight: 'rgba(255, 255, 255, 0.06)', // 1px top inner highlight on glass cards — reads as light from above (§7)
  raised: '#161D29', // hovered/active panels, modals
  hairline: 'rgba(255, 255, 255, 0.075)', // 1px borders (use borders + glass, not heavy shadows)
  hairline2: 'rgba(255, 255, 255, 0.14)', // slightly stronger border — ghost/secondary buttons (§5)

  text: '#EAF0F6', // primary text
  textDim: '#7E8A9B', // labels, secondary text
  textMute: '#586473', // faint chip / scale / unit text

  accent: '#34DEF2', // electric "MBUX cyan" — active states, selection, info
  accentDeep: '#0E7490', // deep end of the cyan ramp (bar fills, gradients)
  champagne: '#D8C6A6', // premium NON-STATE chrome ONLY: wordmark, section ticks, dividers — never a state
  calm: '#2FE0A0', // good attention, calm state, success
  warm: '#FFB454', // rising stress/overload (mid)
  alert: '#FF5765', // critical only — sirens, peak stress. Use sparingly
  engage: '#9D8CFF', // engagement cues (the ADHD half gets its own hue)

  ambient: '#FFB36B', // warm cabin lighting glow in FPV (baseline)
  ambientCalm: '#2DD4BF', // teal glow for the calming-intervention state in FPV (dash/door light strips)

  // Noise-cancel bar fill gradient (§5) — deep → cyan → bright tip
  noiseFillFrom: '#0E7490',
  noiseFillTo: '#34DEF2',
  noiseFillHi: '#7FF0FA', // bright tip of the noise-cancel bar fill

  // Primary-button text on a filled cyan button (§5)
  onAccent: '#07090D',
} as const;

/**
 * §1.1 Background recipe — the EXACT layered recipe. Every screen uses this
 * (exposed as the reusable `.bg-attune` class in `src/index.css`). The washes
 * are static — never animate the background.
 */
export const backgroundRecipe = `radial-gradient(1200px 760px at 86% 6%, rgba(34, 180, 200, 0.16), transparent 64%), radial-gradient(1300px 900px at 8% 96%, rgba(56, 72, 150, 0.20), transparent 66%), radial-gradient(900px 520px at 50% 120%, rgba(15, 90, 110, 0.10), transparent 70%), linear-gradient(150deg, #0B1422 0%, #070C15 46%, #04060B 100%)`;

/** §2 Typography — two fonts, strict roles. */
export const fonts = {
  sans: ['"Instrument Sans"', 'Inter', 'system-ui', 'sans-serif'], // UI: headings, labels, body, notifications
  mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'], // DATA: every value / machine status
} as const;

/** §3 Layout & spacing — 8px grid; card radius 20px, inner elements 12px. */
export const radius = {
  card: '20px',
  inner: '12px',
  pill: '9999px',
} as const;

/**
 * §4 Motion — "premium lives here". Values interpolate, never jump.
 * Gauges use a slow, viscous spring; state transitions are 600–900ms easeInOut.
 */
export const motion = {
  /** Framer Motion spring for gauge values — slow, viscous, expensive-feeling. */
  gaugeSpring: { type: 'spring', stiffness: 60, damping: 20 } as const,
  /** State transitions (lighting, mode changes). */
  stateTransition: { duration: 0.75, ease: 'easeInOut' } as const,
  /** Notification slide+fade in. */
  notifyIn: { duration: 0.3, ease: 'easeOut' } as const,
  /** Notification fade out. */
  notifyOut: { duration: 0.4, ease: 'easeIn' } as const,
} as const;

/**
 * Gauge color ramps (§1 rules).
 *  - stress / overload blend calm → warm → alert as value rises (high = bad)
 *  - attention blends alert → warm → calm as value rises (high = good)
 */
export const ramps = {
  rising: [colors.calm, colors.warm, colors.alert], // for stress, overload
  attention: [colors.alert, colors.warm, colors.calm], // for attention
} as const;
