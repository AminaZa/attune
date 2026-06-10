/**
 * Theme barrel — import design tokens from here in app code.
 *   import { colors, motion, lerpRamp } from '@/theme';
 */
export * from './tokens';

import { colors, ramps } from './tokens';

/** Parse `#RRGGBB` → [r, g, b]. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

/**
 * Blend a 3-stop ramp at position `value` (0..1). Used to color gauges from their value.
 *   lerpRamp(ramps.rising, stress)     // calm → warm → alert
 *   lerpRamp(ramps.attention, attention)
 */
export function lerpRamp(ramp: readonly [string, string, string], value: number): string {
  const v = Math.max(0, Math.min(1, value));
  if (v <= 0.5) return mix(ramp[0], ramp[1], v / 0.5);
  return mix(ramp[1], ramp[2], (v - 0.5) / 0.5);
}

/** Convenience: stress/overload color (high = bad). */
export const stressColor = (v: number) => lerpRamp(ramps.rising, v);
/** Convenience: attention color (high = good). */
export const attentionColor = (v: number) => lerpRamp(ramps.attention, v);

export { colors };
