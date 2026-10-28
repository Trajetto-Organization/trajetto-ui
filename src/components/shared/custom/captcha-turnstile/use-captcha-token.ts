"use client";

import { useCallback, useId, useMemo, useState } from "react";

interface CaptchaWidgetBinding {
  resetSignal: number;
  statusId: string;
  onTokenChange: (token: string | null) => void;
}

interface CaptchaToken {
  /** Whether this build asks for the token (production builds only). */
  required: boolean;
  /** The token of the mounted widget, or null: never the skeleton, never a spent one. */
  token: string | null;
  /** True while the form must not be sent: the token is required and there is none. */
  missing: boolean;
  /** For the submit button's aria-describedby while it is disabled by the captcha. */
  describedBy: string | undefined;
  /** Spread on <CaptchaTurnstile>. */
  widget: CaptchaWidgetBinding;
  /** Drops the token and draws a new widget (after the server consumed it). */
  reset: () => void;
}

/**
 * The captcha token of one form, held as state and fed by the widget.
 *
 * The token exists only while the widget that issued it is mounted and has
 * not expired, failed or been reset: the widget reports null on each of
 * those, and on unmount (the quote form's step 3 unmounts it on "Voltar").
 * A spent token is never sent twice: the form calls reset() when the server
 * answer shows the token was verified (token-consumed.ts).
 *
 * `required` is read on each call, not at module load, so a test can stub
 * NODE_ENV; Next inlines it in the bundle either way.
 */
function useCaptchaToken(): CaptchaToken {
  const required = process.env.NODE_ENV === "production";
  const statusId = useId();
  const [token, setToken] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  const onTokenChange = useCallback((next: string | null) => {
    setToken(next);
  }, []);

  const reset = useCallback(() => {
    setToken(null);
    setResetSignal((value) => value + 1);
  }, []);

  const widget = useMemo(
    () => ({ resetSignal, statusId, onTokenChange }),
    [resetSignal, statusId, onTokenChange],
  );

  const missing = required && !token;

  return {
    required,
    token,
    missing,
    describedBy: missing ? statusId : undefined,
    widget,
    reset,
  };
}

export { useCaptchaToken };
export type { CaptchaToken, CaptchaWidgetBinding };
