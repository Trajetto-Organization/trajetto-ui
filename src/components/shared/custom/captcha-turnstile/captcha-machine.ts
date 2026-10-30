/**
 * The captcha's states, as a pure reducer (no React, no DOM), so every
 * transition is tested on its own (tests/unitaires/captcha-machine.test.ts).
 *
 * - idle: nothing requested yet. A still box of the widget's size says what
 *   starts the check, until a person uses the page (person-input.ts):
 *   before that, no request reaches challenges.cloudflare.com.
 * - loading: the box shows a skeleton while api.js downloads and the iframe
 *   loads. The skeleton sits BEHIND the widget, so the iframe covers it the
 *   moment it paints (Turnstile has no "visible" callback).
 * - ready: an interactive challenge is on screen, waiting for the person.
 * - verified: a fresh token exists. The only state in which a form may send.
 * - expired: the token timed out (300 s); the widget is being reset.
 * - error: the widget reported an error; "Tentar novamente" draws a new one.
 * - timeout: nothing happened within the watchdog's limit.
 * - blocked: api.js could not load (blocked, offline). react-turnstile keeps
 *   that failure for the page's life, so only a reload recovers.
 */

type CaptchaStatus =
  | "idle"
  | "loading"
  | "ready"
  | "verified"
  | "expired"
  | "error"
  | "timeout"
  | "blocked";

type TurnstileFailureKind =
  "script" | "frame" | "config" | "clock" | "unsupported" | "retryable";

interface TurnstileFailure {
  kind: TurnstileFailureKind;
  /** Cloudflare's error code, when there is one (never a token). */
  code: string | null;
}

interface CaptchaMachine {
  status: CaptchaStatus;
  /** Bumped on every retry and reset: the widget's key, so each attempt is a new widget. */
  attempt: number;
  /** Whether the current widget was drawn (render() ran); false while api.js is pending. */
  drawn: boolean;
  failure: TurnstileFailure | null;
}

type CaptchaEvent =
  /** A person used the page (person-input.ts): the widget may load. */
  | { type: "start" }
  /** onLoad: render() ran, the iframe is loading. */
  | { type: "drawn" }
  /** before-interactive-callback: a challenge the person must solve is shown. */
  | { type: "interactive" }
  /** callback: a token was issued. */
  | { type: "solved" }
  /** expired-callback: the token is no longer valid. */
  | { type: "expired" }
  /** timeout-callback: an interactive challenge was not solved in time (the widget refreshes itself). */
  | { type: "challenge-timeout" }
  /** error-callback, unsupported-callback, or api.js failing to load. */
  | { type: "failed"; failure: TurnstileFailure }
  /** The watchdog: no token and no challenge within the limit. */
  | { type: "watchdog" }
  /** "Tentar novamente", or the form discarding a token the server consumed. */
  | { type: "retry" };

const INITIAL_CAPTCHA: CaptchaMachine = {
  status: "idle",
  attempt: 0,
  drawn: false,
  failure: null,
};

/**
 * The states in which the watchdog runs: something is expected to happen.
 * Not idle: the person may take as long as they like to start.
 */
const WAITING: ReadonlySet<CaptchaStatus> = new Set(["loading", "expired"]);

function captchaReducer(
  state: CaptchaMachine,
  event: CaptchaEvent,
): CaptchaMachine {
  switch (event.type) {
    case "start":
      return state.status === "idle" ? { ...state, status: "loading" } : state;

    case "drawn":
      // A widget drawn again keeps a token it already issued (a token stays
      // valid at Cloudflare until it is used or expires).
      if (state.status === "verified") return { ...state, drawn: true };

      return { ...state, status: "loading", drawn: true, failure: null };

    case "interactive":
    case "challenge-timeout":
      return { ...state, status: "ready", failure: null };

    case "solved":
      // Allowed from any state: Cloudflare retries on its own after an
      // error, and a late answer after the watchdog is still a valid one.
      return { ...state, status: "verified", failure: null };

    case "expired":
      return { ...state, status: "expired", failure: null };

    case "failed":
      return {
        ...state,
        status: event.failure.kind === "script" ? "blocked" : "error",
        failure: event.failure,
      };

    case "watchdog":
      return WAITING.has(state.status)
        ? { ...state, status: "timeout" }
        : state;

    case "retry":
      return {
        status: "loading",
        attempt: state.attempt + 1,
        drawn: false,
        failure: null,
      };
  }
}

/** react-turnstile's rejection when api.js fails to load (node_modules/react-turnstile). */
const SCRIPT_LOAD_FAILURE = "Failed to load Turnstile.";

/** Configuration errors: the site key, the domain, a parameter. Retrying does not fix them. */
const CONFIG_CODES = new Set([
  "110100",
  "110110",
  "110200",
  "110420",
  "110430",
  "400020",
  // Sitekey domain mismatch: the key's region against the script's host.
  "400021",
  "400030",
  "400040",
  "400070",
]);

/**
 * What a Turnstile error means for the person (developers.cloudflare.com/
 * turnstile/troubleshooting/client-side-errors/error-codes).
 *
 * `fromWidget` is false when react-turnstile reports the failure itself (no
 * bound widget): api.js never loaded.
 */
function classifyTurnstileError(
  error: unknown,
  fromWidget: boolean,
): TurnstileFailure {
  const raw =
    typeof error === "string" || typeof error === "number"
      ? String(error)
      : error instanceof Error
        ? error.message
        : "";

  if (!fromWidget || raw === SCRIPT_LOAD_FAILURE) {
    return { kind: "script", code: null };
  }

  const code = /^\d+$/.test(raw) ? raw : null;

  if (!code) return { kind: "retryable", code: null };
  if (CONFIG_CODES.has(code) || /^10[2-6]\d{3}$/.test(code)) {
    return { kind: "config", code };
  }
  if (code === "200100") return { kind: "clock", code };
  if (code === "110500" || code === "110510") {
    return { kind: "unsupported", code };
  }
  if (code === "200500") return { kind: "frame", code };

  return { kind: "retryable", code };
}

const FAILURE_MESSAGE: Record<TurnstileFailureKind, string> = {
  script:
    "Não foi possível carregar a verificação de segurança. Verifique sua conexão e se algum bloqueador está impedindo o acesso a challenges.cloudflare.com.",
  frame:
    "A verificação de segurança não abriu. Verifique sua conexão e se algum bloqueador está impedindo o acesso a challenges.cloudflare.com.",
  config:
    "A verificação de segurança está indisponível no momento. Tente novamente em alguns minutos.",
  clock:
    "A verificação de segurança falhou porque a data e a hora do dispositivo estão incorretas. Ajuste-as e tente novamente.",
  unsupported:
    "Seu navegador não é compatível com a verificação de segurança. Atualize-o ou use outro navegador.",
  retryable: "A verificação de segurança falhou. Tente novamente.",
};

const TIMEOUT_MESSAGE =
  "A verificação de segurança está demorando mais que o normal.";

/** Read by screen readers (polite); the failures go in an alert instead. */
const STATUS_TEXT: Record<CaptchaStatus, string> = {
  idle: "A verificação de segurança começa quando você usar o formulário.",
  loading: "Carregando verificação de segurança…",
  ready: "Conclua a verificação de segurança para continuar.",
  verified: "Verificação de segurança concluída.",
  expired: "A verificação de segurança expirou e está sendo renovada.",
  error: "",
  timeout: "",
  blocked: "",
};

/** The message of a failure state, or null outside them. */
function failureMessage(machine: CaptchaMachine): string | null {
  if (machine.status === "timeout") return TIMEOUT_MESSAGE;
  if (machine.status === "blocked") return FAILURE_MESSAGE.script;
  if (machine.status === "error") {
    return FAILURE_MESSAGE[machine.failure?.kind ?? "retryable"];
  }

  return null;
}

export {
  FAILURE_MESSAGE,
  INITIAL_CAPTCHA,
  SCRIPT_LOAD_FAILURE,
  STATUS_TEXT,
  TIMEOUT_MESSAGE,
  WAITING,
  captchaReducer,
  classifyTurnstileError,
  failureMessage,
};

export type {
  CaptchaEvent,
  CaptchaMachine,
  CaptchaStatus,
  TurnstileFailure,
  TurnstileFailureKind,
};
