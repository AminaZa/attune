import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store';
import type { NotificationEvent } from '@/types';

const TYPE_ICON: Record<NotificationEvent['type'], string> = {
  safety_alert: '🚨',
  intervention: '🔇',
  reengagement: '💡',
  mode_change: '🌙',
  indicator: 'ℹ',
};

const CHANNEL_ICON: Record<string, string> = {
  visual: '👁',
  haptic: '📳',
  voice: '🔊',
};

const EDGE_COLOR: Record<NotificationEvent['severity'], string> = {
  info: '#34DEF2',
  warn: '#FFB454',
  critical: '#FF5765',
};

/**
 * NotificationHost — team 01.
 * Bottom-center pill. ONE event at a time, queued never stacked.
 * Severity tints the left edge only. Critical gets one pulse then steady glow.
 * Respects profile.intervention.preferredAlertChannel (renders channel icon).
 * For 'haptic' channel: a subtle screen-edge shimmer instead of sound.
 */
export default function Notifications() {
  const events = useStore((s) => s.events);
  const shiftEvent = useStore((s) => s.shiftEvent);
  const [current, setCurrent] = useState<NotificationEvent | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!current && events.length > 0) {
      const next = events[0];
      setCurrent(next);
      shiftEvent();
      timerRef.current = setTimeout(() => setCurrent(null), next.durationMs);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [events, current, shiftEvent]);

  const isHaptic = current?.channel === 'haptic';
  const isCritical = current?.severity === 'critical';

  return (
    <>
      {/* Haptic shimmer — subtle screen-edge pulse for haptic channel */}
      <AnimatePresence>
        {current && isHaptic && (
          <motion.div
            key="haptic-shimmer"
            className="pointer-events-none fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.18, 0, 0.12, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              background:
                'radial-gradient(ellipse at 50% 100%, rgba(52,222,242,0.3) 0%, transparent 70%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Pill */}
      <div className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative flex items-center gap-3 overflow-hidden rounded-full px-5 py-3"
              style={{
                background: 'rgba(18,24,34,0.92)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                boxShadow: isCritical
                  ? `0 0 0 1px ${EDGE_COLOR.critical}40, 0 8px 32px rgba(0,0,0,0.6)`
                  : '0 8px 32px rgba(0,0,0,0.6)',
                maxWidth: 460,
              }}
            >
              {/* Severity edge */}
              <motion.span
                className="absolute left-0 top-0 h-full w-1 rounded-l-full"
                style={{ background: EDGE_COLOR[current.severity] }}
                animate={
                  isCritical
                    ? { boxShadow: [`0 0 0px ${EDGE_COLOR.critical}`, `0 0 12px ${EDGE_COLOR.critical}`, `0 0 4px ${EDGE_COLOR.critical}`] }
                    : {}
                }
                transition={{ duration: 0.6, repeat: isCritical ? 1 : 0 }}
              />

              <span className="ml-2 shrink-0 text-base">{TYPE_ICON[current.type]}</span>
              <span className="font-sans text-sm font-medium text-text">{current.message}</span>
              {current.direction && (
                <span className="font-mono text-xs text-textDim shrink-0">· {current.direction}</span>
              )}
              <span className="ml-auto shrink-0 text-xs text-textDim">{CHANNEL_ICON[current.channel]}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
