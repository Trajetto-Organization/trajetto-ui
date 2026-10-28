"use client";

import { useCallback, useEffect, useState } from "react";

import { isCoveredByDialog } from "@/hooks/use-route-events";

interface Fullscreen {
  /** On a full screen now, by the browser's API or by the CSS fallback. */
  isFullscreen: boolean;
  /** The CSS fallback is the one on (no Fullscreen API, or it refused). */
  isFallback: boolean;
  toggle: () => void;
}

/** The browser's full screen is on, and it is the page's (see below). */
function isPageFullscreen(): boolean {
  return (
    typeof document !== "undefined" &&
    document.fullscreenElement === document.documentElement
  );
}

/**
 * The Torre on the whole screen, for a TV or a monitor on the wall
 * (product meeting of 14/10/2026).
 *
 * The browser's full screen goes on the WHOLE page, never on the Torre's own
 * container, and the container is pinned over the page in both modes. The
 * browser paints only the element on full screen and its subtree: on the
 * container, every dialog, menu, popover and toast — all portalled to
 * `document.body` — would open unseen, and a modal one would still set
 * `pointer-events: none` on the body, freezing the Torre until Esc. Where
 * there is no Fullscreen API (iOS Safari on an iPhone) or the browser
 * refuses, the pinned container alone is the fallback; Esc leaves both — the
 * browser handles its own mode, and a key listener the fallback.
 */
function useFullscreen(): Fullscreen {
  const [native, setNative] = useState<boolean>(false);
  const [fallback, setFallback] = useState<boolean>(false);

  // Esc, the browser's own button or another element taking the screen all
  // end the native mode without asking: follow the document, not the click.
  // Read once on mount too: switching views may mount a new Torre while the
  // page is still on full screen.
  useEffect(() => {
    const onChange = () => setNative(isPageFullscreen());

    onChange();
    document.addEventListener("fullscreenchange", onChange);

    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Leaving the Torre's page leaves the full screen too: the page went on it
  // for the Torre alone. Another view of the same page keeps it — the check
  // waits for the navigation to settle the address.
  useEffect(() => {
    const pathname = window.location.pathname;

    return () => {
      setTimeout(() => {
        if (
          window.location.pathname !== pathname &&
          isPageFullscreen() &&
          typeof document.exitFullscreen === "function"
        ) {
          document.exitFullscreen().catch(() => undefined);
        }
      }, 0);
    };
  }, []);

  const isFullscreen = native || fallback;

  // The page under the pinned container must not scroll with it.
  useEffect(() => {
    if (!isFullscreen) return;

    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!fallback) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // A dialog over the Torre takes its own Esc first.
      if (event.key === "Escape" && !isCoveredByDialog()) setFallback(false);
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [fallback]);

  const enter = useCallback(async () => {
    const page = document.documentElement;

    if (
      document.fullscreenEnabled &&
      typeof page.requestFullscreen === "function"
    ) {
      try {
        await page.requestFullscreen();
        return;
      } catch {
        // Refused (no user gesture, a policy): the fallback still helps.
      }
    }

    setFallback(true);
  }, []);

  const exit = useCallback(async () => {
    setFallback(false);

    if (
      document.fullscreenElement &&
      typeof document.exitFullscreen === "function"
    ) {
      try {
        await document.exitFullscreen();
      } catch {
        // Already left.
      }
    }
  }, []);

  const toggle = useCallback(() => {
    void (isFullscreen ? exit() : enter());
  }, [isFullscreen, enter, exit]);

  return { isFullscreen, isFallback: fallback, toggle };
}

export { useFullscreen, type Fullscreen };
