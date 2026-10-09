"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  getPublicConfig,
  loadPublicConfig,
  subscribePublicConfig,
  type PublicConfig,
} from "./client";

/** First wait after a failed fetch; doubles up to the cap. */
const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 30_000;

/**
 * The public configuration for rendering (the captcha's site key, the map
 * tiles). Null on the server pass and on the first client pass, so a
 * prerendered page and its hydration agree; then the page's own copy, or the
 * fetched one on a page that had none.
 *
 * A failed fetch (a 503 during a rollout, a network blip) is retried with
 * backoff while the page is open: without it, the login captcha stayed
 * missing until a reload.
 */
function usePublicConfig(): PublicConfig | null {
  const config = useSyncExternalStore(
    subscribePublicConfig,
    getPublicConfig,
    () => null,
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (config) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    loadPublicConfig().catch((error: unknown) => {
      console.error("[public-config]", error);

      if (!active) return;

      const delay = Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);

      timer = setTimeout(() => setAttempt((value) => value + 1), delay);
    });

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [config, attempt]);

  return config;
}

export { usePublicConfig };
