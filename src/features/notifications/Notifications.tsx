import { useStore } from '@/store';

/**
 * STUB — owned by team 01 (Visuals). The notification layer: a bottom-center
 * pill, ONE event at a time, queued never stacked (dev-decisions §5). Severity
 * tints the left edge only; critical gets a single pulse. Delivery respects the
 * resolved `channel`. Consume with `useStore.getState().shiftEvent()` after the
 * event's `durationMs`.
 *
 * This stub renders only the head of the queue as plain text.
 */
export default function Notifications() {
  const event = useStore((s) => s.events[0]);
  if (!event) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 flex justify-center">
      <div className="card-attune flex items-center gap-3 !py-3 !px-5">
        <span
          className="h-6 w-1 rounded-full"
          style={{ background: edgeColor(event.severity) }}
        />
        <span className="font-sans text-text">{event.message}</span>
      </div>
    </div>
  );
}

const edgeColor = (severity: 'info' | 'warn' | 'critical') =>
  severity === 'critical' ? '#EF4444' : severity === 'warn' ? '#F5A623' : '#22D3EE';
