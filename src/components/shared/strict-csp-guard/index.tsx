"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import {
  documentHasNonce,
  enforceStrictDocument,
} from "@/lib/strict-csp-document";

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Backstop for soft navigations into per-request pages from a prerendered
 * document: that document keeps its 'unsafe-inline' policy, so the page is
 * reloaded to get the nonce policy (src/lib/strict-csp-document.ts).
 */
const StrictCspGuard = (): null => {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    enforceStrictDocument({
      pathname,
      hasNonce: documentHasNonce(document),
      storage: sessionStore(),
      reload: () => window.location.reload(),
    });
  }, [pathname]);

  return null;
};

export { StrictCspGuard };
