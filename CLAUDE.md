# Attune — AI Context (shared)

> This file is **identical** to `AGENTS.md` (Codex) and `.github/copilot-instructions.md` (Copilot).
> Whichever AI tool you use, you get the same contract. The lead maintains all three; if one changes they all change.
> Full background lives in `attune-project-brief.md`, `attune-dev-decisions.md`, `attune-build-plan.md`, `attune-design-system.md`. Feed your AI the relevant section, one phase at a time — not the whole repo.

---

## Product, in one paragraph

**Attune** turns the car cabin into an intelligent agent for neurodivergent drivers (autism, ADHD, AuDHD). The standard cabin is tuned for a "neurotypical average" that doesn't exist for millions of people; Attune learns each driver's individual sensory and attention profile, reads their live state from in-car sensors (gaze, steering-wheel biometrics, classified cabin audio), and proactively adjusts sound, light, climate, and alerts to keep the driver calmer, more focused, and safer. It personalises on the driver's **needs profile, not a diagnosis label** (same diagnosis ≠ same needs; autism and ADHD often pull in opposite directions), and is **private by design** — it stores settings and thresholds only, never medical records or live biometrics. The core loop is **sense → decide → act → learn**, wrapped around a per-driver **Support Profile**. Built for the MBTMY **Vibathon 2026 — AI Defined Vehicle** challenge; it runs as one responsive web app, demoed **locally** (laptop → projector) on pitch day with zero network dependency.

---

## The contract (`src/types/`) — code against this, never change it silently

```ts
export interface SupportProfile {
  profileId: string; version: number;
  sensory: { noiseCancelStrength: number; lightDimmingLevel: number; temperaturePreferenceC: number; hapticTolerance: 'low'|'medium'|'high'; };
  attention: { zoneOutRisk: 'low'|'medium'|'high'; engagementCuesEnabled: boolean; distractionFilteringLevel: number; };
  intervention: { stressThreshold: number; overloadThreshold: number; preferredAlertChannel: 'visual'|'haptic'|'voice'; escalationSteps: string[]; };
}

export interface TelemetryFrame {
  t: number;
  gaze: { onRoad: boolean; scanEntropy: number; fixationMs: number };
  biometrics: { heartRate: number; gripPressure: number; tremor: number }; // grip & tremor 0..1
  audioEvents: AudioEvent[];
}
export interface AudioEvent { type: 'siren'|'horn'|'tyre_screech'; direction?: 'left'|'right'|'front'|'rear'; intensity: number; }

export interface DriverState { stress: number; overload: number; attention: number; } // all 0..1

export interface CabinDecisions {
  noiseCancelLevel: number; lightDimLevel: number; engagementCue: boolean;
  alert?: { stage: string; channel: 'visual'|'haptic'|'voice' };
  preservedSounds: AudioEvent[];
}

export interface NotificationEvent {
  id: string;
  type: 'safety_alert'|'mode_change'|'intervention'|'reengagement'|'indicator';
  severity: 'info'|'warn'|'critical';
  message: string;
  direction?: 'left'|'right'|'front'|'rear';
  channel: 'visual'|'haptic'|'voice';   // resolved from profile
  durationMs: number;
}

export type ScenarioId = 'calm_drive'|'stress_spike'|'attention_drop'|'siren_event';
```

**Rules:** the contract in `src/types/` is the agreed boundary between every module. It never changes silently — any change is announced by the lead. No live biometrics and no raw diagnosis are ever stored (privacy-first).

---

## The store (`src/store/`) — Zustand, mirrored across tabs

```ts
useStore.getState().setProfile(profile)        // onboarding writes once
useStore.getState().tick(state, decisions)     // engine writes ~10x/sec
useStore.getState().pushEvent(event)           // notification producers write
useStore.getState().setScenario(id)            // lead's control panel writes

const s = useStore(s => s.driverState)         // anyone reads
const d = useStore(s => s.decisions)
const p = useStore(s => s.profile)
const e = useStore(s => s.events)              // queued, render ONE at a time
const a = useStore(s => s.activeScenario)
```

State shape: `driverState`, `decisions`, `profile`, `events`, `activeScenario` (plus a `shiftEvent()` helper to consume the queue head). The store is **mirrored across browser tabs of the same origin via `BroadcastChannel`** (channel `attune-sync`), so the dashboard tab (laptop) and the `/cabin` tab (projector) move as **one system, two views**. Only data keys cross the wire; actions stay local; remote-applied updates don't echo back.

Routes: `/` → Onboarding · `/dashboard` → Dashboard · `/cabin` → Cabin. A reference **stub engine** (`src/engine/stub.ts`) seeds a dummy Support Profile and drives the store on a smooth sine loop so the app runs end-to-end today; the real `fuse()`/`decide()`/loop (team 02) replaces it without touching anything downstream.

---

## Folder ownership (build plan §1) — edit ONLY your own folder(s)

| # | Person | Owns (and ONLY this) | Folder(s) |
|---|---|---|---|
| 00 | **Lead (Amina)** | Scaffold, shared contract, store, theme, scenario data feed + demo control panel, audio showpiece, integration, deploy | `src/types/`, `src/store/`, `src/theme/`, `src/data/`, `src/features/audio/`, `App.tsx` |
| 01 | **Visuals** | Live dashboard, FPV cabin view (`/cabin`), notification layer | `src/features/dashboard/`, `src/features/cabin/`, `src/features/notifications/` |
| 02 | **Engine** | The brain: `fuse()`, `decide()`, the loop, tests | `src/engine/` |
| 03 | **Onboarding** | Setup wizard that builds the Support Profile | `src/features/onboarding/` |

**Golden rules:** (1) You only edit files inside your own folder(s) — need something outside? ask the lead. (2) The contract in `src/types/` never changes silently. (3) Work on `feat/<your-area>`, open a PR per finished phase. (4) Feed your AI the brief + your team file, one phase at a time.

---

## Aesthetic contract (design-system §9)

> **Mirrors `attune-design-system.md` §9 verbatim.** The lead maintains both; if §9 changes, this block changes. Full depth / material / component detail lives in design-system §6–§9. Palette: **"Deep Cyan Noir."**

**North star: a Mercedes MBUX head unit at night — dark, calm, precise, expensive.** The product's thesis is *reducing sensory load*, so the UI must embody it: **if a screen feels busy, it is wrong even if it works.** Calm is created with **depth, not emptiness**.

- **Calm by design.** Generous empty space is a feature, not waste. Max ~3 hues visible at rest; the calm baseline is almost monochrome with cyan accents. Notifications are rationed and never nag — one at a time, queued, never stacked.
- **Background, every screen.** Never flat black. Layered `.bg-attune` recipe: base gradient `#0B1422 → #070C15 → #04060B` at 150°, a teal wash upper-right, an indigo wash lower-left, a deep-teal wash rising from the bottom, and a soft edge **vignette**. The washes/vignette are static; **never animate the background.** Cards sit on top as glass (`rgba(18,24,34,0.55)` + blur) so the gradient breathes through.
- **Glass, not flat panels.** Cards = `surface` + `backdrop-blur`, a 1px top inner highlight (`#FFF` @ 6%, light from above), a `hairline` border, and one soft AO shadow (`shadow-glass`). This single recipe is what makes the UI feel milled. No drop-shadow stacks, no blur-everywhere glassmorphism.
- **Two fonts, strict roles.** Instrument Sans for UI (headings, labels, body, notifications). **Geist Mono for every value / machine status** (gauge numbers, percentages, telemetry, chips) — tabular, the numbers never jiggle, it gives the cockpit its instrument feel. Both self-hosted (zero network on pitch day). Everything legible from **4 meters** — it's projected.
- **Color meaning.** `accent` cyan `#34DEF2` = active/info; `champagne` `#D8C6A6` = premium **non-state chrome only** (wordmark, ticks, dividers) — never a state; `calm` `#2FE0A0`; `warm` `#FFB454` = rising stress/overload; `alert` `#FF5765` = critical only (sirens, peak stress), used sparingly; `engage` `#9D8CFF` = the ADHD engagement cue's own hue; `ambient` `#FFB36B` / `ambientCalm` `#2DD4BF` = FPV cabin glow. Stress/overload gauges blend calm→warm→alert as they rise; attention blends alert→warm→calm (high = good). Never use default Tailwind blue.
- **Layout.** 8px grid, card padding 24px, card radius **20px** (inner elements 12px). Dashboard is landscape 16:9, two halves the judge reads instantly: **left = SENSE** (driver state), **right = ACT** (cabin response, a balanced bento). Slim status rail on top with live chips.
- **Motion is where "premium" lives.** Values interpolate, never jump — gauges use a slow, viscous Framer Motion spring `{ stiffness: 60, damping: 20 }`. State transitions (lighting, modes) 600–900ms easeInOut. Notifications slide+fade in 300ms, hold per `durationMs`, fade out 400ms. The **only** thing allowed to pulse fast is the safety/siren badge (one strong pulse, then steady glow); everything else breathes (2–4s subtle opacity cycles at idle). No bounce/overshoot on anything safety-related.
- **Components.** Gauges = ring (SVG `stroke-dasharray`) with a gradient stroke, value-colored outer glow, and a faint tick ring; big tabular value centered, label below, trend caret. Noise-cancel bar = rounded `hairline` track, fill gradient `#0E7490 → #34DEF2 → #7FF0FA` + soft glow, % right-aligned in Geist Mono. Safety badge = `alert` left edge + radiating waveform + directional chevron. Onboarding cards = large targets (≥96px), hairline border, selected = cyan border + glow + slight raise. Buttons = pill; primary filled `accent` with dark text `#07090D`; secondary/back = ghost. Every interactive element has hover **and** focus-visible states.
- **FPV cabin = a real cockpit, not an overlay.** The `/cabin` view reads as a first-person car interior at night: dimensional dashboard, steering wheel in the foreground, instrument cluster + center MBUX screen, A-pillars. Attune's status and notifications render **inside the in-dash screens** (center display = the calming board + an in-UI toast; cluster = a mode badge), not as windows floating on the windshield. Ambient light lives in the dash/door **light strips** (teal `ambientCalm` when calming), the Mercedes signature — plus footwell glow and a gentle whole-cabin tint.

Design tokens are encoded in `src/theme/tokens.ts` and mapped onto Tailwind (`bg-surface`, `text-textDim`, `text-champagne`, `border-hairline`, `shadow-glass`, `font-mono`, `rounded-card`, …). Read tokens from there — don't hardcode hexes in feature code.

---

## The five differentiators (cite in pitch/QnA)

1. **Profile, not label.** 2. **Quiet the cabin, keep the siren** (the 5-second aha). 3. **Privacy-first** (settings only; biometrics transient, never stored; raw diagnosis dropped after seeding). 4. **A true real-time agent** (sense → decide → act → learn). 5. **Both directions** — demo calming (autism) AND re-engagement (ADHD), or only half the insight lands.
