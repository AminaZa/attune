import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store';
import type { NotificationEvent } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// NotificationsV2 — Phase 4: the third actuator
//
// Rules (dev-decisions §5):
//   · ONE notification at a time — queue, never stack
//   · Answers "why did the cabin just change?" — nothing else
//   · Severity tints the LEFT EDGE only (not the whole pill)
//   · Critical = one strong pulse, then steady
//   · Delivery respects preferredAlertChannel; haptic → screen-edge shimmer
//
// Auto-derives two events by watching decisions transitions:
//   · intervention  — noiseCancelLevel > 0.6 AND lightDimLevel > 0.6
//   · reengagement  — engagementCue flips true
// Each fires ONCE per episode (debounced via ref flags).
// ─────────────────────────────────────────────────────────────────────────────

// ── Severity → edge color ─────────────────────────────────────────────────────

const EDGE: Record<NotificationEvent['severity'], string> = {
  info:     '#34DEF2',  // accent cyan
  warn:     '#FFB454',  // warm
  critical: '#FF5765',  // alert-red
};

// ── Type icons (16×16 SVG) ────────────────────────────────────────────────────

function TypeIcon({
  type,
  color,
}: {
  type: NotificationEvent['type'];
  color: string;
}) {
  if (type === 'safety_alert') {
    return (
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5 L14.5 13.5 L1.5 13.5 Z"
          stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
        <line x1={8} y1={6} x2={8} y2={9.5}
          stroke={color} strokeWidth={1.4} strokeLinecap="round" />
        <circle cx={8} cy={11.5} r={0.85} fill={color} />
      </svg>
    );
  }
  if (type === 'intervention') {
    // Downward-pointing soft chevron — "cabin calming"
    return (
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <path d="M3 5 L8 10 L13 5"
          stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 9 L8 14 L13 9"
          stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
          opacity={0.45} />
      </svg>
    );
  }
  if (type === 'reengagement') {
    // Star — engagement / attention
    return (
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <path
          d="M8 1.5 L9.5 6 L14 6 L10.5 8.8 L12 13.5 L8 10.8 L4 13.5 L5.5 8.8 L2 6 L6.5 6 Z"
          stroke={color} strokeWidth={1.3} strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === 'mode_change') {
    return (
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <circle cx={8} cy={8} r={6} stroke={color} strokeWidth={1.4} />
        <circle cx={8} cy={8} r={2} stroke={color} strokeWidth={1.4} />
        <line x1={8} y1={2} x2={8} y2={6}  stroke={color} strokeWidth={1.4} strokeLinecap="round" />
        <line x1={8} y1={10} x2={8} y2={14} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
        <line x1={2} y1={8} x2={6} y2={8}  stroke={color} strokeWidth={1.4} strokeLinecap="round" />
        <line x1={10} y1={8} x2={14} y2={8} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      </svg>
    );
  }
  // indicator / default → info circle
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <circle cx={8} cy={8} r={6.5} stroke={color} strokeWidth={1.4} />
      <line x1={8} y1={5.5} x2={8} y2={9.5}
        stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={8} cy={11.5} r={0.8} fill={color} />
    </svg>
  );
}

// ── Channel icon (12×12 SVG) ──────────────────────────────────────────────────

function ChannelIcon({ channel }: { channel: NotificationEvent['channel'] }) {
  if (channel === 'haptic') {
    return (
      <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
        <rect x={3.5} y={1.5} width={5} height={9} rx={2}
          stroke="currentColor" strokeWidth={1.2} />
        <path d="M1.5 4 C0.8 5 0.8 7 1.5 8"
          stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
        <path d="M10.5 4 C11.2 5 11.2 7 10.5 8"
          stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
      </svg>
    );
  }
  if (channel === 'voice') {
    return (
      <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
        <path d="M2 4.5 L2 7.5 L4.5 7.5 L7 10 L7 2 L4.5 4.5 Z"
          stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" />
        <path d="M8.5 3.5 C10 4.5 10 7.5 8.5 8.5"
          stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
      </svg>
    );
  }
  // visual (default)
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <ellipse cx={6} cy={6} rx={5} ry={3.5}
        stroke="currentColor" strokeWidth={1.2} />
      <circle cx={6} cy={6} r={1.5} fill="currentColor" />
    </svg>
  );
}

// ── Event auto-derivation ─────────────────────────────────────────────────────
// Watches decisions transitions and pushes debounced events — fires ONCE per
// episode, not every frame. Episode resets when the condition clears.

function useEventDerivation() {
  const decisions = useStore((s) => s.decisions);
  const profile   = useStore((s) => s.profile);

  const calmEpisode   = useRef(false);
  const engageEpisode = useRef(false);

  useEffect(() => {
    if (!decisions || !profile) return;

    const channel = profile.intervention.preferredAlertChannel;

    // Intervention — both noise cancel AND dim rise above 0.6
    const calmActive =
      decisions.noiseCancelLevel > 0.6 && decisions.lightDimLevel > 0.6;

    if (calmActive && !calmEpisode.current) {
      calmEpisode.current = true;
      useStore.getState().pushEvent({
        id:        `intervention-${Date.now()}`,
        type:      'intervention',
        severity:  'info',
        message:   'Calming cabin — noise reduced, lighting softened',
        channel,
        durationMs: 4000,
      });
    } else if (!calmActive) {
      calmEpisode.current = false;
    }

    // Re-engagement — engagementCue flips true
    if (decisions.engagementCue && !engageEpisode.current) {
      engageEpisode.current = true;
      useStore.getState().pushEvent({
        id:        `reengagement-${Date.now()}`,
        type:      'reengagement',
        severity:  'info',
        message:   'Attention dipping — gentle cue',
        channel,
        durationMs: 3500,
      });
    } else if (!decisions.engagementCue) {
      engageEpisode.current = false;
    }
  }, [decisions, profile]);
}

// ── NotificationHost ──────────────────────────────────────────────────────────

export default function NotificationsV2() {
  useEventDerivation();

  const event      = useStore((s) => s.events[0]);
  const isCritical = event?.severity === 'critical';
  const edgeColor  = event ? EDGE[event.severity] : EDGE.info;

  // Auto-consume after entrance (300ms) + hold (durationMs).
  // AnimatePresence then runs the exit (400ms) before mounting the next.
  useEffect(() => {
    if (!event) return;
    const t = setTimeout(
      () => useStore.getState().shiftEvent(),
      300 + event.durationMs,
    );
    return () => clearTimeout(t);
  }, [event?.id]);

  return (
    <>
      {/* ── Haptic shimmer — screen-edge double-flash instead of a chime ── */}
      <AnimatePresence>
        {event?.channel === 'haptic' && (
          <motion.div
            key={`haptic-${event.id}`}
            className="pointer-events-none fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.08, 0, 0.05, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, times: [0, 0.15, 0.4, 0.65, 1], ease: 'easeOut' }}
            style={{ boxShadow: 'inset 0 0 90px rgba(255,255,255,0.3)' }}
          />
        )}
      </AnimatePresence>

      {/* ── Notification pill ─────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-6">
        <AnimatePresence mode="wait">
          {event && (
            <motion.div
              key={event.id}
              className="flex max-w-2xl items-stretch overflow-hidden rounded-full
                         border border-hairline shadow-glass"
              style={{
                background:     'rgba(14, 18, 27, 0.90)',
                backdropFilter: 'blur(24px)',
              }}
              // Enter: slide up + fade. Critical adds one sharp scale bump.
              initial={{ y: 24, opacity: 0, scale: 0.97 }}
              animate={
                isCritical
                  ? {
                      y:       [24, 0,    0,    0],
                      opacity: [0,  1,    0.78, 1],
                      scale:   [0.97, 1.015, 0.998, 1],
                    }
                  : { y: 0, opacity: 1, scale: 1 }
              }
              exit={{
                y:       10,
                opacity: 0,
                scale:   0.98,
                transition: { duration: 0.4, ease: 'easeIn' },
              }}
              transition={
                isCritical
                  ? { duration: 0.55, times: [0, 0.45, 0.65, 1], ease: 'easeOut' }
                  : { duration: 0.3,  ease: 'easeOut' }
              }
            >
              {/* Severity left-edge strip — tints ONLY this 4px strip */}
              <div
                className="w-1 shrink-0 self-stretch"
                style={{ background: edgeColor }}
              />

              {/* Pill content */}
              <div className="flex items-center gap-3 px-5 py-3.5">
                {/* Type icon */}
                <span className="shrink-0">
                  <TypeIcon type={event.type} color={edgeColor} />
                </span>

                {/* Message */}
                <span className="font-sans text-base leading-snug text-text">
                  {event.message}
                </span>

                {/* Direction tag (safety alerts only) */}
                {event.direction && (
                  <span
                    className="shrink-0 rounded border px-2 py-0.5
                               font-mono text-[11px] tracking-label"
                    style={{
                      borderColor: edgeColor + '55',
                      color:       edgeColor,
                    }}
                  >
                    {event.direction.toUpperCase()}
                  </span>
                )}

                {/* Channel icon — small, dim, right-side */}
                <span
                  className="ml-1 shrink-0 opacity-40"
                  style={{ color: edgeColor }}
                >
                  <ChannelIcon channel={event.channel} />
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
