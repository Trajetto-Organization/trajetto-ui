"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isDeploymentSkewError, reloadOnce } from "@/lib/deployment-skew";

/**
 * What a screen says when its render threw.
 *
 * There was no `error.tsx` anywhere in this application. Next's own fallback
 * is what a person got: a blank page in production, and in development a
 * stack trace over the whole viewport. Either way the sidebar disappeared,
 * the navigation went with it, and the only way out was the browser's back
 * button — on a dispatch desk, in the middle of a shift.
 *
 * Three things a person needs here, and they are all missing from a blank
 * page: that something broke and it is not their fault, a way to try the same
 * screen again without losing the session, and a way out of it.
 *
 * `digest` is the only thing Next gives the client about a server-side
 * failure — the message itself is stripped in production, deliberately. It is
 * shown because it is the string that connects what somebody saw to a line in
 * the server log, and "there was an error" with nothing to quote is a support
 * call that cannot go anywhere.
 */

interface ErrorSurfaceProps {
  error: Error & { digest?: string };

  /** Next's own retry: re-renders the segment that threw. */
  reset: () => void;

  /**
   * What "Tentar novamente" should actually do, when `reset` alone is not
   * enough.
   *
   * `reset` clears the boundary's state and re-renders from the RSC payload
   * the client already holds — so for a failure that happened during the
   * SERVER render, pressing it replays the same cached failure and nothing
   * ever changes. Both boundary bugs found in /admin were exactly that.
   *
   * The recovery is `router.refresh()` first, which throws the payload away
   * and asks the server again. It lives in the BOUNDARY rather than here
   * because `useRouter` is only mounted under the app router: calling it from
   * this component broke `global-error.tsx`, which replaces the root layout
   * and therefore has no router at all ("invariant expected app router to be
   * mounted"). A presentational component that cannot be rendered by one of
   * its three callers is not presentational.
   */
  onRetry?: () => void;

  /** Where "leave this screen" goes. The protected area has its own. */
  homeHref?: string;
  homeLabel?: string;

  /** Set on the root boundary, which renders without the app's chrome. */
  standalone?: boolean;
}

const ErrorSurface = ({
  error,
  reset,
  homeHref = "/",
  homeLabel = "Ir para o início",
  standalone = false,
  onRetry,
}: ErrorSurfaceProps): JSX.Element => {
  useEffect(() => {
    /*
      The browser console is the only sink this app has on the client today,
      and a boundary that swallows the error silently is worse than no
      boundary: the screen recovers and nobody ever learns why it broke.

      When a reporter is wired up (Sentry and friends), this is its one call
      site — every boundary in the app funnels through this component.
    */
    // eslint-disable-next-line no-console
    console.error("[Trajetto] erro não tratado na renderização:", error);

    /*
      A chunk this page cannot load, or a Server Action the server no longer
      knows, means the tab is from an older build — "Tentar novamente" would
      ask the same stale page for the same missing file. A full load fetches
      the current build; once per build, so a chunk that is really gone
      cannot loop.
    */
    if (isDeploymentSkewError(error)) {
      try {
        reloadOnce(
          window.sessionStorage,
          process.env.NEXT_PUBLIC_BUILD_SHA || "unknown",
          () => window.location.reload(),
        );
      } catch {
        // No session storage: the buttons below are the way out.
      }
    }
  }, [error]);

  return (
    <div
      /**
       * A handle every test suite can check for, and the reason it exists is
       * uncomfortable: this component is well-designed enough to pass for a
       * working screen.
       *
       * The two boundary bugs found by hand in /admin were caught here and
       * answered with a calm apology, a heading, a button and a correct
       * layout — so axe found no violations, the responsive suite found no
       * overflow, and a completely dead screen reported green in both. The
       * suites were not wrong about what they measured; they were measuring
       * the error page.
       *
       * `role="alert"` was already here and is not enough to key on: other
       * things in the product legitimately use it. This attribute means
       * exactly one thing.
       */
      data-error-surface
      className={
        standalone
          ? "flex min-h-screen w-full items-center justify-center p-6"
          : "flex min-h-[60vh] w-full items-center justify-center p-6"
      }
      role="alert"
    >
      <div className="w-full max-w-md space-y-6 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center
          rounded-full bg-amber-500/10"
        >
          <AlertTriangle
            className="h-7 w-7 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Alguma coisa quebrou nesta tela
          </h1>

          <p className="text-sm text-muted-foreground">
            O erro é nosso, não seu. Seus dados não foram perdidos — a tela é
            que não conseguiu terminar de montar.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {/*
            Tentar novamente primeiro: it is the action that costs nothing and
            works for the common case, a request that failed once.

            What it DOES is the boundary's decision, not this component's —
            see `onRetry`. Bare `reset` cannot recover a failure that happened
            during the server render, and the two boundaries that have a
            router pass something that can.
          */}
          <Button type="button" onClick={onRetry ?? reset} className="gap-2">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>

          {/*
            A plain anchor, deliberately, where the rest of the app uses
            `next/link`.

            Client-side navigation out of an active error boundary does not
            reliably work: the router is in the state that produced the error,
            and clicking a Link left the URL exactly where it was — measured,
            not assumed. A full load is also the better recovery here, because
            whatever client state led to the crash is thrown away with it.
          */}
          <Button asChild type="button" variant="outline" className="gap-2">
            <a href={homeHref}>
              <Home className="h-4 w-4" aria-hidden="true" />
              {homeLabel}
            </a>
          </Button>
        </div>

        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Código do erro: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
};

export { ErrorSurface };
