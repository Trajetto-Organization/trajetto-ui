"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { STALE_BUILD_EVENT, type StaleBuildDetail } from "@/lib/action-result";
import {
  isDeploymentSkewError,
  isNewBuild,
  reloadOnce,
} from "@/lib/deployment-skew";

/**
 * Notices when the server moved to a new build while this tab stayed open.
 *
 * After a deploy, a page loaded before it asks for chunks and Server Actions
 * the new build no longer has: screens fail to open, forms answer "Erro
 * inesperado", and nothing recovers until the person presses F5 — which
 * nobody tells them to do.
 *
 * So the tab compares the build it was loaded from with the one the server
 * answers (`/build-id.json`) when it comes back into view, and every few
 * minutes while it is in view. On a difference it says so and offers the
 * reload; the next navigation does a full load instead of a client one. It
 * never reloads a page on its own while somebody may be typing into it.
 *
 * A chunk that fails to load anywhere on the page is the same condition, seen
 * from the other side: that one reloads once, right away.
 */
const BUILD = process.env.NEXT_PUBLIC_BUILD_SHA;

const CHECK_EVERY_MS = 5 * 60 * 1000;

// Focus and visibility fire every time somebody switches windows, all day,
// in every open tab: without a floor that is a request to the web server per
// alt-tab. A deploy is noticed just as well with one question a minute.
const MIN_CHECK_GAP_MS = 60 * 1000;

const TOAST_ID = "deployment-skew";

function reloadPage(): void {
  window.location.reload();
}

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const DeploymentSkewGuard = (): null => {
  const pathname = usePathname();

  const stale = useRef<boolean>(false);
  const lastPathname = useRef<string | null>(pathname);

  // Leaving the page is the moment nothing typed can be lost: load the new
  // build instead of navigating inside the old one.
  useEffect(() => {
    if (stale.current && pathname !== lastPathname.current) {
      reloadPage();
      return;
    }

    lastPathname.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let inFlight = false;
    let lastCheckAt = Number.NEGATIVE_INFINITY;

    const markStale = (): void => {
      stale.current = true;

      toast.info("Uma nova versão do Trajetto foi publicada.", {
        id: TOAST_ID,
        description:
          "Recarregue a página para continuar na versão atual. O que você não salvou continua na tela até lá.",
        duration: Infinity,
        action: { label: "Recarregar", onClick: reloadPage },
      });
    };

    const check = async (): Promise<void> => {
      if (stale.current || inFlight) return;
      if (document.visibilityState === "hidden") return;
      if (Date.now() - lastCheckAt < MIN_CHECK_GAP_MS) return;

      inFlight = true;
      lastCheckAt = Date.now();

      try {
        const response = await fetch("/build-id.json", { cache: "no-store" });
        if (!response.ok) return;

        const { sha } = (await response.json()) as { sha?: string | null };

        if (!isNewBuild(BUILD, sha)) return;

        markStale();
      } catch {
        // Offline, or the server is restarting: the next check will tell.
      } finally {
        inFlight = false;
      }
    };

    const onVisibility = (): void => {
      if (document.visibilityState === "visible") void check();
    };

    const onFocus = (): void => void check();

    const onSkew = (error: unknown): void => {
      if (!isDeploymentSkewError(error)) return;

      const storage = sessionStore();
      if (storage) reloadOnce(storage, BUILD || "unknown", reloadPage);
    };

    const onError = (event: ErrorEvent): void => onSkew(event.error);
    const onRejection = (event: PromiseRejectionEvent): void =>
      onSkew(event.reason);

    // A Server Action that answered `undefined` (see lib/action-result) is
    // the same news as a new /build-id.json, and more certain: the server
    // no longer knows this page's actions. Same notice, same full load on
    // the next navigation, and no reload while the form is still filled.
    // Shown again even if already stale when the person just did something:
    // they may have closed the notice, and what they tried did not happen. A
    // background read (a poll, a refetch on focus) says it once.
    const onStaleAction = (event: Event): void => {
      const { detail } = event as CustomEvent<StaleBuildDetail | undefined>;

      if (detail?.background && stale.current) return;

      markStale();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener(STALE_BUILD_EVENT, onStaleAction);

    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener(STALE_BUILD_EVENT, onStaleAction);
      window.clearInterval(timer);
    };
  }, []);

  return null;
};

export { DeploymentSkewGuard };
