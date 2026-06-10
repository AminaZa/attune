import type { Config } from 'tailwindcss';
import { colors, fonts, radius } from './src/theme/tokens';

/**
 * Tailwind theme = the design-system tokens (attune-design-system.md §1–§4).
 * Single source of truth lives in src/theme/tokens.ts; this file just maps it
 * onto Tailwind's color/font/radius scales so feature code uses `bg-surface`,
 * `text-textDim`, `border-hairline`, `font-mono`, `rounded-card`, etc.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // gradient stops are available as utilities too, though the canonical
        // background is the `.bg-attune` class (§1.1).
        bgFrom: colors.bgFrom,
        bgMid: colors.bgMid,
        bgTo: colors.bgTo,
        surface: colors.surface,
        raised: colors.raised,
        hairline: colors.hairline,
        hairline2: colors.hairline2,
        text: colors.text,
        textDim: colors.textDim,
        accent: colors.accent,
        calm: colors.calm,
        warm: colors.warm,
        alert: colors.alert,
        engage: colors.engage,
        ambient: colors.ambient,
        ambientCalm: colors.ambientCalm,
        onAccent: colors.onAccent,
      },
      fontFamily: {
        sans: fonts.sans as unknown as string[],
        mono: fonts.mono as unknown as string[],
      },
      borderRadius: {
        card: radius.card,
        inner: radius.inner,
      },
      letterSpacing: {
        // §2 section labels: tracking-[0.12em]–[0.2em]
        label: '0.12em',
        labelWide: '0.2em',
      },
      boxShadow: {
        // §3 one depth trick only: hairline border + subtle inner gradient.
        hairline: `inset 0 0 0 1px ${colors.hairline}`,
      },
      backgroundImage: {
        // §5 noise-cancel bar fill
        'noise-fill': `linear-gradient(90deg, ${colors.noiseFillFrom}, ${colors.noiseFillTo})`,
      },
    },
  },
  plugins: [],
} satisfies Config;
