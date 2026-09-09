# Attune

A car cabin that adapts to the driver instead of to the average of all drivers.

Built for the MBTMY Vibathon 2026, AI Defined Vehicle challenge. Placed 3rd.

## The problem

A standard cabin is tuned for a neurotypical average that does not describe millions of
people. For an autistic or ADHD driver, the same cabin that is comfortable for someone else
can be the thing making driving harder.

Attune reads the driver's live state from cabin sensors and adjusts sound, light and alerts
to match a per-driver profile. It personalises on a needs profile rather than a diagnosis
label, because the same diagnosis does not imply the same needs, and autism and ADHD often
pull in opposite directions on sensory load.

## How it works

The loop runs at 10 frames per second: sense, decide, act.

**Sense.** A `TelemetryFrame` carries gaze (on-road flag, scan entropy, fixation duration),
biometrics (heart rate, grip pressure, tremor) and classified cabin audio (siren, horn,
tyre screech, each with direction and intensity).

**Fuse.** `fuse()` in `src/engine/fuse.ts` collapses a frame into three continuous values in
the range 0 to 1:

```
stress    = 0.5 * (heartRate - 60)/60 + 0.3 * gripPressure + 0.2 * tremor
overload  = 0.6 * stress + 0.4 * loudest audio event
attention = 1 - 0.4 (gaze off road) - 0.3 (fixation > 2s) - 0.3 (scan entropy < 0.2)
```

The weights are deliberately readable rather than learned. For a system that intervenes in a
moving car, being able to explain why it acted mattered more than squeezing out accuracy.

**Decide.** `decide()` takes that state plus the driver's `SupportProfile` and returns
`CabinDecisions`: noise cancellation level, light dimming, whether to fire an engagement cue,
and whether to escalate an alert and through which channel. Every threshold comes from the
profile, so two drivers in identical physiological states get different cabin responses.
That is the whole point.

**Act.** The dashboard, cabin view and notification queue render the decision. Sounds that
matter for safety, like a siren, are preserved and passed through rather than cancelled.

## Privacy

The system stores thresholds and settings only. No biometric stream is persisted and no
diagnosis is ever recorded. A `SupportProfile` holds preferences and numbers, not medical
records.

This was a design constraint from the start rather than something added later, because a
product that asks a neurodivergent driver to hand over a diagnosis to a car company is not
a product anyone should want.

## The type contract

`src/types/` is the agreed boundary between every module: sensing, decision, store and UI.
It does not change silently.

With four people building in parallel over a weekend, the contract was what let the engine,
the interface and the scripted data feed be written at the same time without anyone blocking
on anyone else.

## Scenarios

`src/data/scenarios.ts` holds four scripted telemetry timelines at 10 fps:

| Scenario | What it shows |
|---|---|
| `calm_drive` | Baseline. Gauges breathe, cabin neutral. |
| `stress_spike` | Heart rate 70 to 115 and grip 0.2 to 0.8 over ten seconds, then holds. |
| `attention_drop` | Gaze leaves the road, long fixation and low scan entropy for eight seconds. |
| `siren_event` | Elevated stress, then a siren from the right. |

Per-frame jitter is deterministic, hashed from the frame index, so the gauges look alive but
a scenario replays identically every run. For a live pitch that matters: you want to control
exactly when the interesting moment lands, not hope the data cooperates.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run typecheck
```

No network dependency. It was demoed from a laptop to a projector.

## Stack

React 18, TypeScript, Zustand (mirrored across browser tabs over BroadcastChannel),
Tailwind, Framer Motion, Vite, Vitest.

## Team

Four people. I led the team, and owned `src/types/` and the store.
