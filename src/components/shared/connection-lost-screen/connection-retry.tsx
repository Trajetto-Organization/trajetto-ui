"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getRetryDelay, useConnectionStore } from "@/lib/connection-status";
import { ConnectionLostScreen } from ".";

interface ConnectionRetryProps {
  /**
   * When true the screen is shown from the first render and never hides itself.
   *
   * Used by the server gate: the page could not be built at all, so recovering
   * means re-running the server component, and if that works this component is
   * unmounted by the new render rather than by its own state.
   */
  alwaysVisible?: boolean;
}

/**
 * Drives the retry loop behind the connection-lost screen.
 *
 * Two callers, one behaviour. From the client the screen appears over a page
 * that is already rendered, and a successful re-check clears it. From the
 * server gate the page does not exist yet, so recovery is a `router.refresh()`
 * that re-runs the layout — the same button, the same countdown, a different
 * definition of "worked".
 */
const ConnectionRetry = ({
  alwaysVisible = false,
}: ConnectionRetryProps): JSX.Element | null => {
  const router = useRouter();

  const isUnreachable = useConnectionStore((state) => state.isUnreachable);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const [secondsUntilRetry, setSecondsUntilRetry] = useState<number | null>(
    null,
  );

  const attempt = useRef(0);
  const releaseTimeout = useRef<ReturnType<typeof setTimeout>>();

  const isVisible = alwaysVisible || isUnreachable;

  const retry = useCallback(() => {
    setIsRetrying(true);
    setSecondsUntilRetry(null);

    attempt.current += 1;

    if (alwaysVisible) {
      // Re-runs the server component that failed. If the API is back the whole
      // layout renders and this screen disappears with it; if not, the same
      // screen is returned and the countdown starts over.
      router.refresh();
    } else {
      // Reuses the security check already wired to this event, so a recovery
      // that reveals a revoked session still ends in a proper logout instead of
      // silently letting the user back in.
      window.dispatchEvent(new CustomEvent("security-check-required"));
    }

    // The check is asynchronous and reports back through the store; this only
    // releases the button so it cannot be held down. Kept in a ref so a retry
    // that finishes after the screen is gone does not set state on an unmounted
    // component.
    clearTimeout(releaseTimeout.current);
    releaseTimeout.current = setTimeout(() => setIsRetrying(false), 1500);
  }, [alwaysVisible, router]);

  useEffect(() => () => clearTimeout(releaseTimeout.current), []);

  // Countdown to the next automatic attempt.
  useEffect(() => {
    if (!isVisible || isRetrying) return;

    let remaining = Math.round(getRetryDelay(attempt.current) / 1000);
    setSecondsUntilRetry(remaining);

    const interval = setInterval(() => {
      remaining -= 1;

      if (remaining <= 0) {
        clearInterval(interval);
        retry();

        return;
      }

      setSecondsUntilRetry(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, isRetrying, retry]);

  // Coming back from a sleeping laptop or a tunnel is a better signal than any
  // timer, so it jumps the queue.
  useEffect(() => {
    if (!isVisible) return;

    const onBackOnline = () => retry();
    window.addEventListener("online", onBackOnline);

    return () => window.removeEventListener("online", onBackOnline);
  }, [isVisible, retry]);

  if (!isVisible) return null;

  return (
    <ConnectionLostScreen
      onRetry={retry}
      isRetrying={isRetrying}
      secondsUntilRetry={secondsUntilRetry}
    />
  );
};

export { ConnectionRetry };
