import { useEffect, useState } from "react";

/**
 * `value`, once it has stopped changing for `delayMs`.
 *
 * Starts at the first value rather than empty, so a search that arrives
 * already filled is used on the first request instead of 300 ms later.
 */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}

export { useDebouncedValue };
