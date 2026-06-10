/**
 * Attune design tokens — the single source of visual truth.
 * Encoded from `attune-design-system.md` §1–§4. Consumed by:
 *   - `tailwind.config.ts` (becomes the Tailwind theme: colors, fonts, radius)
 *   - app code that needs raw values (Framer Motion springs, SVG gauges, FPV glows)
 *
 * Lead owns this file. Do not hardcode hexes in feature code — read from here / Tailwind.
 */

/** §1 Color tokens. */
export const colors = {
  /** App background base gradient stops (top-left → bottom-right). Never flat black. */
  bgFrom: '#101A2B',
  bgMid: '#0A111D',
  bgTo: '#05070B',

  surface: 'rgba(17, 21, 28, 0.82)', // cards/panels — translucent so the gradient breathes through
  raised: '#1A2028', // hovered/active panels, modals
  hairline: 'rgba(255, 255, 255, 0.08)', // 1px borders (use borders, not heavy shadows)
  hairline2: 'rgba(255, 255, 255, 0.14)', // slightly stronger border — ghost/secondary buttons (§5)

  text: '#E8EDF2', // primary text
  textDim: '#8A94A3', // labels, secondary text

  accent: '#22D3EE', // "MBUX cyan" — active states, selection, info
  calm: '#34D399', // good attention, calm state, success
  warm: '#F5A623', // rising stress/overload (mid)
  alert: '#EF4444', // critical only — sirens, peak stress. Use sparingly
  engage: '#A78BFA', // engagement cues (the ADHD half gets its own hue)

  ambient: '#FFB36B', // warm cabin lighting glow in FPV (baseline)
  ambientCalm: '#2DD4BF', // teal glow for the calming-intervention state in FPV

  // Noise-cancel bar fill gradient (§5)
  noiseFillFrom: '#0E7490',
  noiseFillTo: '#22D3EE',

  // Primary-button text on a filled cyan button (§5)
  onAccent: '#07090D',
} as const;

/**
 * §1.1 Background recipe — the EXACT layered recipe. Every screen uses this
 * (exposed as the reusable `.bg-attune` class in `src/index.css`). The washes
 * are static — never animate the background.
 */
export const backgroundRecipe = `radial-gradient(900px 560px at 84% 11%, rgba(34, 211, 238, 0.07), transparent 70%), radial-gradient(980px 640px at 12% 91%, rgba(59, 79, 160, 0.10), transparent 70%), linear-gradient(135deg, #101A2B 0%, #0A111D 45%, #05070B 100%)`;

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
