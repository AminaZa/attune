import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { DraggablePanel } from '@/components/DraggablePanel';
import {
  FPS,
  SCENARIOS,
  SCENARIO_FRAMES,
  SCENARIO_META,
} from './scenarios';

/**
 * SCENARIO PANEL — the lead's demo remote (`src/data/`, lead only).
 *
 * Mounted app-wide behind the `?control` query param (see App.tsx) so it lives
 * only on the laptop's control tab and NEVER appears on the projector. From here
 * the presenter fires the four scripted scenarios on cue during the 4-minute
 * pitch (build plan §5, dev-decisions §2).
 *
 * It offers:
 *   · four scenario buttons → `setScenario(id)` (the active one is highlighted),
 *   · a play / pause for the timeline playhead, and
 *   · a compact live readout of the current `TelemetryFrame` so the lead can see
 *     exactly where in the arc the feed is before the moment lands.
 *
 * The playhead is local preview state: it scrubs `SCENARIO_FRAMES[active]` at
 * 10 fps so the remote feels alive today. Once team 02's engine consumes the
 * same frames, it becomes the single clock — the readout here still mirrors it.
 */
export default function ScenarioPanel({ hidden }: { hidden?: boolean }) {
  const scenario = useStore((s) => s.activeScenario);
  const setScenario = useStore((s) => s.setScenario);

  const frames = SCENARIO_FRAMES[scenario];
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);

  // New scenario selected → rewind the playhead to the start of its arc.
  useEffect(() => setFrame(0), [scenario]);

  // Advance the playhead at the feed cadence, looping so idle previews breathe.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 1000 / FPS);
    return () => clearInterval(id);
  }, [playing, frames.length]);

  const cur = frames[Math.min(frame, frames.length - 1)];
  const siren = cur.audioEvents.find((e) => e.type === 'siren');
  const progress = frames.length > 1 ? frame / (frames.length - 1) : 0;

  return (
    <DraggablePanel storageKey="attune-demo-remote" title="Demo Remote" width={300} defaultCorner="bottom-left" hidden={hidden}>
      {/* Scenario buttons (2×2) */}
      <div className="grid grid-cols-2 gap-2">
        {SCENARIOS.map((id) => {
          const active = id === scenario;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setScenario(id)}
              aria-pressed={active}
              className={[
                'rounded-inner border px-2 py-2 text-left transition-colors duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                active
                  ? 'border-accent bg-accent/10 text-accent ring-1 ring-accent/40'
                  : 'border-hairline text-textDim hover:border-hairline2 hover:text-text',
              ].join(' ')}
            >
              <span className="block font-sans text-[12px] font-semibold leading-tight">
                {SCENARIO_META[id].label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active scenario blurb */}
      <p className="mt-2 font-sans text-[11px] leading-snug text-textDim">
        {SCENARIO_META[scenario].blurb}
      </p>

      {/* Transport: play/pause + playhead progress */}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause feed' : 'Play feed'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline2 text-text transition-colors hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="font-mono text-[12px] leading-none">{playing ? '❚❚' : '▶'}</span>
        </button>
        <div className="flex-1">
          <div className="h-1 w-full overflow-hidden rounded-full bg-hairline">
            <div
              className="h-full bg-accent"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <span className="w-12 text-right font-mono text-[11px] tabular-nums text-textDim">
          {(frame / FPS).toFixed(1)}s
        </span>
      </div>

      {/* Current-frame readout */}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-hairline pt-3 font-mono text-[11px]">
        <Stat label="HR" value={`${Math.round(cur.biometrics.heartRate)} bpm`} />
        <Stat label="GRIP" value={cur.biometrics.gripPressure.toFixed(2)} />
        <Stat label="TREMOR" value={cur.biometrics.tremor.toFixed(2)} />
        <Stat label="SCAN" value={cur.gaze.scanEntropy.toFixed(2)} />
        <Stat
          label="GAZE"
          value={cur.gaze.onRoad ? 'on road' : 'OFF ROAD'}
          alert={!cur.gaze.onRoad}
        />
        <Stat label="FIX" value={`${Math.round(cur.gaze.fixationMs)}ms`} />
      </dl>

      {/* Audio event — only the siren, and only while it sounds */}
      <div className="mt-2 h-5">
        {siren && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-alert/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-label text-alert">
            ◀ Siren · {siren.direction} · {siren.intensity.toFixed(1)}
          </span>
        )}
      </div>
    </DraggablePanel>
  );
}

/** One label/value cell in the telemetry readout. */
function Stat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-textMute">{label}</dt>
      <dd className={`tabular-nums ${alert ? 'text-alert' : 'text-text'}`}>{value}</dd>
    </div>
  );
}
