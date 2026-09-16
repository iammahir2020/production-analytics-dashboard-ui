import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * True only after the component has mounted on the client. For rendering
 * client-only state (e.g. a stored theme preference) that the server can't
 * know, without a hydration mismatch — the React-idiomatic way to express
 * this (via useSyncExternalStore) rather than useState+useEffect, which
 * causes an avoidable extra render.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
