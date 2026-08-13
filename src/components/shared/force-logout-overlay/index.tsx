"use client";

import { REASON_TO_COPY, useForceLogoutStore } from "@/lib/force-logout";

/**
 * Blocking full-screen state shown between a forced logout and the redirect.
 *
 * It replaces nothing — before this, the screen simply froze on a dashboard
 * whose buttons had started failing, and the user had no way to tell an
 * administrator revoking their access from the app being broken. A few hundred
 * milliseconds of "this is happening on purpose" is the whole difference.
 *
 * It also blocks interaction with the UI on its way out, which matters: the
 * page is still mounted and still clickable during the navigation, and every
 * click it accepts is a request against a session that no longer exists.
 *
 * The authoritative message — what happened and what to do — is the toast on
 * the login page. This one only covers the wait.
 */
const ForceLogoutOverlay = (): JSX.Element | null => {
  const reason = useForceLogoutStore((state) => state.reason);

  if (!reason) return null;

  const { title, description } = REASON_TO_COPY[reason];

  return (
    <div
      role="status"
      aria-live="assertive"
      // The shared fade runs for 500ms, which is longer than this overlay is
      // on screen before the redirect starts — it would only ever be caught
      // half-faded. A blocking state should arrive decisively.
      className="fixed inset-0 z-[100] flex items-center justify-center 
      bg-background/80 backdrop-blur-sm animate-fade-in [animation-duration:140ms]"
    >
      <div
        className="mx-4 flex max-w-sm flex-col items-center gap-4 
        rounded-xl border bg-card px-8 py-10 text-center shadow-lg"
      >
        <span
          aria-hidden
          className="size-8 rounded-full border-[3px] 
          border-muted-foreground/25 border-t-primary animate-spin"
        />

        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
};

export { ForceLogoutOverlay };
