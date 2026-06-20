import { useEffect, useRef, useState } from 'react';
import { useStore, getStore } from '@/store';
import type { NotificationEvent } from '@/types';
import { CabinAudioEngine, type AudioStatus } from './engine';

/**
 * AUDIO SHOWPIECE — owned by the lead (`src/features/audio/`).
 *
 * The "quiet the cabin, keep the siren" demo (brief §5, dev-decisions §3). It
 * binds the Web Audio graph (./engine.ts) to live store decisions:
 *   · `decisions.noiseCancelLevel` ducks the cabin drone + closes the low-pass,
 *   · a siren in `decisions.preservedSounds` plays at full gain regardless, and
 *     emits a critical `safety_alert` NotificationEvent once per episode,
 *   · a live FFT check on the siren layer reports an HONEST detection (an
 *     oscillating peak in 600–1500 Hz), not a hardcoded badge.
 *
 * Controls (an explicit user-gesture "enable audio" for autoplay policy, a master
 * mute, and a RAW↔PROCESSED A/B toggle to demo the difference live) live behind
 * `?control` so they sit on the laptop and never on the projector — and audio
 * only ever starts on the tab where someone presses enable, so it never doubles.
 */
const SHOW_CONTROL =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('control');

export default function Audio() {
  const engineRef = useRef<CabinAudioEngine | null>(null);
  const sirenOnRef = useRef(false);

  const [enabled, setEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [muted, setMuted] = useState(false);
  const [mode, setMode] = useState<'processed' | 'raw'>('processed');
  const [status, setStatus] = useState<AudioStatus | null>(null);

  // Store reads. `hasSiren` is a boolean selector so the edge effect only fires
  // when the siren actually appears/disappears, not every 10 fps tick.
  const noiseCancel = useStore((s) => s.decisions?.noiseCancelLevel ?? 0);
  const hasSiren = useStore(
    (s) => s.decisions?.preservedSounds.some((e) => e.type === 'siren') ?? false
  );
  const pushEvent = useStore((s) => s.pushEvent);

  // --- bind store decisions → engine ---------------------------------------
  useEffect(() => {
    if (enabled) engineRef.current?.setNoiseCancel(noiseCancel);
  }, [noiseCancel, enabled]);

  useEffect(() => {
    if (enabled) engineRef.current?.setMode(mode);
  }, [mode, enabled]);

  useEffect(() => {
    if (enabled) engineRef.current?.setMute(muted);
  }, [muted, enabled]);

  // Siren edge: play at full gain + fire the safety alert; stop when it passes.
  useEffect(() => {
    const engine = engineRef.current;
    if (!enabled || !engine) return;
    if (hasSiren && !sirenOnRef.current) {
      sirenOnRef.current = true;
      engine.startSiren();
      pushEvent(buildSirenAlert());
    } else if (!hasSiren && sirenOnRef.current) {
      sirenOnRef.current = false;
      engine.stopSiren();
    }
  }, [hasSiren, enabled, pushEvent]);

  // Live analysis + status polling (~15fps) while audio is on.
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let frame = 0;
    const tick = () => {
      const engine = engineRef.current;
      if (engine) {
        engine.analyse();
        if (frame % 4 === 0) setStatus(engine.status());
      }
      frame++;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  // Tear down the audio graph on unmount.
  useEffect(() => {
    return () => engineRef.current?.dispose();
  }, []);

  async function handleEnable() {
    if (starting || enabled) return;
    setStarting(true);
    setLoadError(false);
    try {
      const engine = new CabinAudioEngine();
      await engine.enable();
      engine.setNoiseCancel(getStore().decisions?.noiseCancelLevel ?? 0);
      engine.setMode(mode);
      engineRef.current = engine;
      setEnabled(true);
    } catch {
      engineRef.current?.dispose();
      engineRef.current = null;
      setLoadError(true);
    } finally {
      setStarting(false);
    }
  }

  // Audio runs only on the control tab; the projector stays silent + uncluttered.
  if (!SHOW_CONTROL) return null;

  return (
    <aside
      className="fixed bottom-4 right-4 z-50 w-[260px] rounded-card border border-hairline bg-surface p-4 shadow-glass backdrop-blur-glass"
      aria-label="Attune audio showpiece"
    >
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-labelWide text-champagne">
          Audio
        </span>
        {enabled && (
          <span className="font-mono text-[10px] uppercase text-textMute">
            {mode === 'raw' ? 'raw' : 'processed'}
          </span>
        )}
      </div>

      {!enabled ? (
        <>
          <button
            type="button"
            onClick={handleEnable}
            disabled={starting}
            className="w-full rounded-full bg-accent px-4 py-2.5 font-sans text-[13px] font-semibold text-onAccent transition-opacity hover:opacity-90 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {starting ? 'Starting…' : 'Enable audio'}
          </button>
          <p className="mt-2 font-sans text-[11px] leading-snug text-textDim">
            {loadError
              ? 'Audio assets missing — add clips to /public/audio (see its README).'
              : 'One tap to start the cabin soundscape (browser autoplay policy).'}
          </p>
        </>
      ) : (
        <>
          {/* RAW ↔ PROCESSED A/B */}
          <div className="grid grid-cols-2 gap-1 rounded-full border border-hairline p-1">
            {(['raw', 'processed'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={[
                  'rounded-full px-2 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-label transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  mode === m ? 'bg-accent text-onAccent' : 'text-textDim hover:text-text',
                ].join(' ')}
              >
                {m === 'raw' ? 'Raw' : 'Processed'}
              </button>
            ))}
          </div>

          {/* Mute */}
          <button
            type="button"
            onClick={() => setMuted((v) => !v)}
            aria-pressed={muted}
            className={[
              'mt-2 w-full rounded-full border px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-label transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              muted
                ? 'border-warm/50 text-warm'
                : 'border-hairline2 text-textDim hover:text-text',
            ].join(' ')}
          >
            {muted ? 'Muted' : 'Mute'}
          </button>

          {/* Live status */}
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-hairline pt-3 font-mono text-[11px]">
            <Stat label="DRONE" value={`${Math.round((status?.droneGain ?? 1) * 100)}%`} />
            <Stat label="LOWPASS" value={`${Math.round(status?.lowpassHz ?? 20000)}Hz`} />
            <Stat label="SIREN" value={status?.sirenPlaying ? 'playing' : '—'} />
            <Stat
              label="DETECT"
              value={status?.sirenDetected ? `${Math.round(status.detectPeakHz)}Hz` : '—'}
              accent={status?.sirenDetected}
            />
          </dl>
          {status?.sirenDetected && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-label text-alert">
              ◀ Siren detected · 600–1500 Hz
            </p>
          )}
        </>
      )}
    </aside>
  );
}

/** The critical safety alert fired when a siren is preserved through the cabin. */
function buildSirenAlert(): NotificationEvent {
  const siren = getStore().decisions?.preservedSounds.find((e) => e.type === 'siren');
  const direction = siren?.direction ?? 'right';
  const profile = getStore().profile;
  return {
    id: `siren-${Date.now()}`,
    type: 'safety_alert',
    severity: 'critical',
    message: `Emergency vehicle — ${direction} side`,
    direction,
    // Safety alerts always fire; the channel still honours the driver's profile.
    channel: profile?.intervention.preferredAlertChannel ?? 'visual',
    durationMs: 5000,
  };
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-textMute">{label}</dt>
      <dd className={`tabular-nums ${accent ? 'text-accent' : 'text-text'}`}>{value}</dd>
    </div>
  );
}
