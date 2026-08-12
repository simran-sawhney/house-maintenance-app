import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * True only after client hydration, false during SSR — without a
 * setState-in-effect. Used to gate `createPortal`, which needs `document`.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true, // client snapshot
    () => false, // server snapshot
  );
}
