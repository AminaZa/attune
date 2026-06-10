import type { StateCreator, StoreApi } from 'zustand';

/**
 * BroadcastChannel middleware — mirrors store state across tabs of the SAME
 * ORIGIN. This is what makes the dashboard tab (laptop) and the `/cabin` tab
 * (projector) move as "one system, two views" (dev-decisions §4.3).
 *
 * How it works:
 *   - After every local `set`, the picked (serializable) slice is posted on the
 *     channel.
 *   - On receiving a message, we apply it with the RAW `set` (not the wrapped
 *     one) and behind an `applyingRemote` guard, so remote updates never echo
 *     back and cause a loop.
 *
 * Only the data keys in `pick` cross the wire — actions/functions stay local.
 */
export interface BroadcastOptions<T> {
  /** Channel name — both tabs must use the same one. */
  name: string;
  /** Which state keys to mirror across tabs (data only, never functions). */
  pick: (keyof T)[];
}

type Middleware = <T extends object>(
  config: StateCreator<T, [], []>,
  options: BroadcastOptions<T>
) => StateCreator<T, [], []>;

export const broadcast: Middleware = (config, options) => (set, get, api) => {
  const channel: BroadcastChannel | null =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(options.name) : null;

  let applyingRemote = false;

  const pickSlice = (state: ReturnType<typeof get>) => {
    const slice: Record<string, unknown> = {};
    for (const key of options.pick) slice[key as string] = (state as Record<string, unknown>)[key as string];
    return slice;
  };

  // Wrap `set` so local mutations are broadcast; remote-applied mutations are not.
  const wrappedSet: typeof set = (partial, replace) => {
    (set as (p: typeof partial, r?: typeof replace) => void)(partial, replace);
    if (channel && !applyingRemote) {
      channel.postMessage(pickSlice(get()));
    }
  };

  if (channel) {
    channel.onmessage = (event: MessageEvent) => {
      applyingRemote = true;
      try {
        // RAW set + merge (replace=false): apply the mirrored slice without re-broadcasting.
        (set as (p: Partial<ReturnType<typeof get>>, r?: false) => void)(
          event.data as Partial<ReturnType<typeof get>>,
          false
        );
      } finally {
        applyingRemote = false;
      }
    };
  }

  // Expose teardown for HMR / tests via the store api.
  (api as StoreApi<ReturnType<typeof get>> & { destroyBroadcast?: () => void }).destroyBroadcast =
    () => channel?.close();

  return config(wrappedSet, get, api);
};
