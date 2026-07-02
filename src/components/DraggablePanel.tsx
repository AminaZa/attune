import { useCallback, useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// DraggablePanel — a floating glass panel you can DRAG anywhere and MINIMIZE.
//
// Used to host the lead's demo remote + audio showpiece so they can be moved out
// of the way (or collapsed to a slim title bar) on any screen — including the
// projector. Position + minimized state persist to localStorage per `storageKey`,
// so once you place them they stay put across reloads and route changes.
// ─────────────────────────────────────────────────────────────────────────────

type Corner = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

interface Props {
  storageKey: string;
  title: string;
  width: number;
  defaultCorner: Corner;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /** When true the panel is not rendered at all (e.g. on the onboarding page). */
  hidden?: boolean;
}

interface Persisted { x: number | null; y: number | null; minimized: boolean }

const MARGIN = 16;

function cornerStyle(corner: Corner): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (corner.includes('bottom')) s.bottom = MARGIN; else s.top = MARGIN;
  if (corner.includes('right')) s.right = MARGIN; else s.left = MARGIN;
  return s;
}

export function DraggablePanel({ storageKey, title, width, defaultCorner, headerRight, children, hidden }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ ox: 0, oy: 0, active: false });

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Restore persisted position + minimized state.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        if (p.x != null && p.y != null) setPos({ x: p.x, y: p.y });
        setMinimized(!!p.minimized);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, [storageKey]);

  const persist = useCallback((next: Partial<Persisted>) => {
    try {
      const cur: Persisted = { x: pos?.x ?? null, y: pos?.y ?? null, minimized, ...next };
      localStorage.setItem(storageKey, JSON.stringify(cur));
    } catch { /* ignore */ }
  }, [pos, minimized, storageKey]);

  const clamp = useCallback((x: number, y: number) => {
    const el = ref.current;
    const w = el?.offsetWidth ?? width;
    const h = el?.offsetHeight ?? 0;
    return {
      x: Math.max(0, Math.min(window.innerWidth - w, x)),
      y: Math.max(0, Math.min(window.innerHeight - h, y)),
    };
  }, [width]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (minimized) return; // minimized panels stay docked at the bottom, not draggable
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return; // let buttons work
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    drag.current = { ox: e.clientX - rect.left, oy: e.clientY - rect.top, active: true };
    setPos({ x: rect.left, y: rect.top });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    setPos(clamp(e.clientX - drag.current.ox, e.clientY - drag.current.oy));
  };
  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    const rect = ref.current?.getBoundingClientRect();
    if (rect) { setPos({ x: rect.left, y: rect.top }); persist({ x: rect.left, y: rect.top }); }
  };

  // Keep the panel on-screen if the window shrinks.
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  const toggleMin = () =>
    setMinimized((m) => { const nm = !m; persist({ minimized: nm }); return nm; });

  if (hidden || !loaded) return null; // hidden route, or pre-restore first paint

  // Minimized panels dock to their default corner (bottom); expanded panels sit
  // wherever you dragged them.
  const style: React.CSSProperties =
    pos && !minimized ? { left: pos.x, top: pos.y } : cornerStyle(defaultCorner);

  return (
    <aside
      ref={ref}
      className="fixed z-[60] rounded-card border border-hairline bg-surface shadow-glass backdrop-blur-glass"
      style={{ width, ...style }}
      aria-label={title}
    >
      {/* drag handle / title bar */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={[
          'flex items-center gap-2 px-3 py-2.5',
          minimized ? 'rounded-card cursor-default' : 'rounded-t-card cursor-grab active:cursor-grabbing',
        ].join(' ')}
        style={{ touchAction: 'none', userSelect: 'none' }}
      >
        <Grip />
        <span className="font-sans text-[11px] font-semibold uppercase tracking-labelWide text-champagne">{title}</span>
        <span className="flex-1" />
        {headerRight}
        <button
          data-no-drag
          type="button"
          onClick={toggleMin}
          aria-label={minimized ? 'Expand panel' : 'Minimize panel'}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-hairline2 text-textDim transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
            {minimized ? <><path d="M6 2v8" /><path d="M2 6h8" /></> : <path d="M2 6h8" />}
          </svg>
        </button>
      </div>

      {!minimized && <div className="px-4 pb-4 pt-1">{children}</div>}
    </aside>
  );
}

function Grip() {
  return (
    <span className="grid grid-cols-2 gap-[3px] opacity-50" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="h-[3px] w-[3px] rounded-full bg-textMute" />
      ))}
    </span>
  );
}
