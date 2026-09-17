"use client";

import { useEffect, useState } from "react";

// Debounces the *value*, not the event handler — the input stays fully
// responsive to every keystroke (its own local state updates immediately);
// only the value this hook returns lags behind until typing pauses. That's
// what lets a consumer safely trigger a fetch/URL update off the returned
// value without debouncing the input's own responsiveness.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
