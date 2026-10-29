"use client";

import { useEffect } from "react";

import { loadPublicConfig } from "./client";

/**
 * On a prerendered page (no configuration in the HTML), fetches it right
 * away: the root layout stays mounted across client navigations, so a person
 * who goes from the landing page or /login into the panel keeps this page's
 * document, and the panel's first API call should not wait for it.
 */
function PublicConfigPrefetch(): null {
  useEffect(() => {
    loadPublicConfig().catch((error: unknown) => {
      console.error("[public-config]", error);
    });
  }, []);

  return null;
}

export { PublicConfigPrefetch };
