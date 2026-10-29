"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import Turnstile, { type BoundTurnstileObject } from "react-turnstile";
import { useTheme } from "next-themes";
import { RefreshCw, RotateCw, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { usePublicConfig } from "@/env/use-public-config";
import { cn } from "@/lib/utils";

import {
  INITIAL_CAPTCHA,
  STATUS_TEXT,
  WAITING,
  captchaReducer,
  classifyTurnstileError,
  failureMessage,
  type CaptchaEvent,
} from "./captcha-machine";
import {
  CaptchaSkeleton,
  WIDGET_HEIGHT_PX,
  WIDGET_MIN_WIDTH_PX,
  type CaptchaSize,
} from "./captcha-skeleton";

/** How long the widget may take to issue a token or show a challenge. */
const LOAD_TIMEOUT_MS = 15_000;

interface CaptchaTurnstileProps {
  /** Defaults to the site key of the running environment (TURNSTILE_SITE_KEY). */
  sitekey?: string;
  /** The fresh token, or null whenever there is none (loading, expired, failed, reset, unmounted). */
  onTokenChange: (token: string | null) => void;
  /** A new value discards the widget and its token and draws a new one. */
  resetSignal?: number;
  /** Id of the status text, for the submit's aria-describedby (useCaptchaToken). */
  statusId?: string;
  delayMs?: number;
  loadTimeoutMs?: number;
  size?: CaptchaSize;
  /**
   * Drawn instead of `size` when the container is narrower than that
   * widget's minimum (flexible never goes under 300 px). Measured once,
   * before the first paint: only for a captcha mounted on the client (the
   * quote's step 3), as a server-rendered box would change size.
   */
  fallbackSize?: CaptchaSize;
  className?: string;
}

type WidgetTheme = "light" | "dark" | "auto";

// useLayoutEffect warns on the server; the measurement only runs in a browser.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const hasTurnstileScript = (): boolean =>
  typeof window !== "undefined" &&
  typeof (window as { turnstile?: unknown }).turnstile !== "undefined";

/**
 * Cloudflare Turnstile with a visible state for every outcome
 * (captcha-machine.ts): a skeleton while it loads, an alert with a way out
 * when it fails or hangs, and a token only while one is valid.
 *
 * The box is in the server markup with the widget's height, so the iframe
 * that mounts later fills space already there instead of pushing the form
 * down (a 0.10 layout shift on /login). The skeleton sits behind the
 * widget: the iframe covers it as soon as it paints.
 */
const CaptchaTurnstile = ({
  sitekey,
  onTokenChange,
  resetSignal = 0,
  statusId,
  delayMs = 500,
  loadTimeoutMs = LOAD_TIMEOUT_MS,
  size: preferredSize = "normal",
  fallbackSize,
  className,
}: CaptchaTurnstileProps): JSX.Element => {
  const [shouldMount, setShouldMount] = useState<boolean>(false);

  // The quote's step 3 is 234 px wide on a 320 px phone: a flexible widget
  // (300 px minimum) was cut off at the card's edge.
  const boxRef = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(true);
  const size = fits || !fallbackSize ? preferredSize : fallbackSize;

  useIsomorphicLayoutEffect(() => {
    if (!fallbackSize) return;

    const available = boxRef.current?.parentElement?.clientWidth ?? 0;

    setFits(available >= WIDGET_MIN_WIDTH_PX[preferredSize]);
  }, [fallbackSize, preferredSize]);

  const [machine, dispatch] = useReducer(captchaReducer, INITIAL_CAPTCHA);
  const { attempt, status } = machine;

  const ownStatusId = useId();
  const describedId = statusId ?? ownStatusId;

  // Read at run time (src/env), not inlined at build: the image is promoted
  // from staging to production with production's key.
  const publicConfig = usePublicConfig();
  const resolvedSitekey = sitekey ?? publicConfig?.turnstileSiteKey ?? null;

  // The app's theme, not the system's. Frozen while a token is held: a new
  // theme redraws the widget, which would ask for a new challenge.
  const { resolvedTheme } = useTheme();
  const appTheme: WidgetTheme =
    resolvedTheme === "dark" || resolvedTheme === "light"
      ? resolvedTheme
      : "auto";
  const [widgetTheme, setWidgetTheme] = useState<WidgetTheme>(appTheme);

  // The parent's reset (a consumed token): a new widget, decided during
  // render so no frame shows the old one as valid.
  const [seenReset, setSeenReset] = useState(resetSignal);

  if (resetSignal !== seenReset) {
    setSeenReset(resetSignal);
    dispatch({ type: "retry" });
  }

  const verified = status === "verified";

  // Caught up during render too, not in an effect: after a theme change
  // while verified, the reset above mounted the new widget in the frozen
  // theme and the effect then changed it, so Cloudflare drew it twice.
  if (!verified && widgetTheme !== appTheme) setWidgetTheme(appTheme);

  const emitRef = useRef(onTokenChange);
  const alive = useRef(true);
  // Callbacks of a widget that was already replaced are ignored.
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;

  useEffect(() => {
    emitRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    alive.current = true;

    return () => {
      // Unmounted (the quote form's "Voltar"): its token goes with it.
      alive.current = false;
      emitRef.current(null);
    };
  }, []);

  // Every new attempt starts without a token.
  useEffect(() => {
    if (attempt > 0) emitRef.current(null);
  }, [attempt]);

  useEffect(() => {
    const timer = setTimeout(() => setShouldMount(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  // Watchdog: no token and no challenge in time means timeout, never an
  // endless skeleton. A late answer still counts (timeout → verified).
  const waiting = WAITING.has(status);

  useEffect(() => {
    if (!waiting) return;

    const timer = setTimeout(
      () => dispatch({ type: "watchdog" }),
      loadTimeoutMs,
    );

    return () => clearTimeout(timer);
  }, [waiting, status, attempt, loadTimeoutMs]);

  const handle = useCallback(
    (from: number, event: CaptchaEvent, token?: string): boolean => {
      if (!alive.current || from !== attemptRef.current) return false;

      dispatch(event);

      if (event.type === "solved") emitRef.current(token ?? null);
      else if (event.type !== "drawn") emitRef.current(null);

      return true;
    },
    [],
  );

  const callbacks = useMemo(
    () => ({
      onLoad: () => {
        handle(attempt, { type: "drawn" });
      },
      onBeforeInteractive: () => {
        handle(attempt, { type: "interactive" });
      },
      onSuccess: (token: string) => {
        handle(attempt, { type: "solved" }, token);
      },
      onExpire: (_token: string, bound?: BoundTurnstileObject) => {
        // refresh-expired is "never": this is the only refresh, so a spent
        // token is never left looking valid.
        if (handle(attempt, { type: "expired" })) bound?.reset();
      },
      onTimeout: () => {
        handle(attempt, { type: "challenge-timeout" });
      },
      onError: (error?: unknown, bound?: BoundTurnstileObject) => {
        const failure = classifyTurnstileError(error, Boolean(bound));

        // The site key or the domain is wrong: worth a log (the code only).
        if (failure.kind === "config") {
          console.error("[Turnstile] configuração recusada:", failure.code);
        }

        handle(attempt, { type: "failed", failure });

        // Handled: Turnstile skips its own console warning. Its automatic
        // retry may call this again for the same problem; the state is
        // idempotent (error → error, and error → verified on success).
        return true;
      },
      onUnsupported: () => {
        handle(attempt, {
          type: "failed",
          failure: { kind: "unsupported", code: null },
        });
      },
    }),
    [attempt, handle],
  );

  const retry = () => dispatch({ type: "retry" });
  const reload = () => window.location.reload();

  const failure = failureMessage(machine);
  // api.js never loaded (blocked, or still hanging): a new widget would wait
  // on the same failed load, so only a reload recovers.
  const needsReload =
    status === "blocked" ||
    (status === "timeout" && !machine.drawn && !hasTurnstileScript());

  // The widget's size stays reserved unless it never drew: then the alert
  // takes its place instead of an empty box.
  const holdSpace = machine.drawn || failure === null;
  const reserved = holdSpace
    ? {
        minHeight: WIDGET_HEIGHT_PX[size],
        minWidth: WIDGET_MIN_WIDTH_PX[size],
      }
    : undefined;

  return (
    <div
      ref={boxRef}
      className={cn("mt-5", className)}
      data-captcha-state={status}
    >
      {/* Busy on the widget's area only: the status line below must stay
          outside it, or screen readers would hold its updates back. */}
      <div
        className="relative"
        style={reserved}
        aria-busy={status === "loading" ? true : undefined}
      >
        {status === "loading" ? (
          <CaptchaSkeleton size={size} className="absolute left-0 top-0" />
        ) : null}

        {/* Positioned after the skeleton, so the iframe paints over it.
            line-height 0: the widget's iframe is inline, and the line's
            descender added 6 px under it (71 px drawn in a 65 px box,
            measured with the always-pass key), moving the form on load. */}
        <div className="relative leading-[0]">
          {shouldMount && resolvedSitekey ? (
            <Turnstile
              key={attempt}
              sitekey={resolvedSitekey}
              theme={widgetTheme}
              language="pt-br"
              size={size}
              // The form sends the token from its own controlled input.
              responseField={false}
              refreshExpired="never"
              {...callbacks}
            />
          ) : null}
        </div>
      </div>

      <div id={describedId}>
        <p role="status" className="sr-only">
          {STATUS_TEXT[status]}
        </p>

        {failure ? (
          <Alert
            variant="destructive"
            className="mt-3 p-3 [&>svg]:left-3 [&>svg]:top-3"
          >
            <ShieldAlert aria-hidden="true" className="size-4" />
            <AlertDescription>
              <p className="break-words">{failure}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 text-foreground"
                onClick={needsReload ? reload : retry}
              >
                {needsReload ? (
                  <>
                    <RefreshCw aria-hidden="true" />
                    Recarregar página
                  </>
                ) : (
                  <>
                    <RotateCw aria-hidden="true" />
                    Tentar novamente
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
};

export { CaptchaTurnstile, LOAD_TIMEOUT_MS };
export { useCaptchaToken } from "./use-captcha-token";
export type { CaptchaToken } from "./use-captcha-token";
