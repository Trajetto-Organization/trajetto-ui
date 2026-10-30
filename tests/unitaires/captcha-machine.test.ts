// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  FAILURE_MESSAGE,
  INITIAL_CAPTCHA,
  SCRIPT_LOAD_FAILURE,
  STATUS_TEXT,
  TIMEOUT_MESSAGE,
  captchaReducer,
  classifyTurnstileError,
  failureMessage,
  type CaptchaEvent,
  type CaptchaMachine,
  type CaptchaStatus,
} from "@/components/shared/custom/captcha-turnstile/captcha-machine";
import {
  forgotConsumedCaptcha,
  loginConsumedCaptcha,
  quoteConsumedCaptcha,
} from "@/components/shared/custom/captcha-turnstile/token-consumed";

/**
 * The captcha's states and transitions (README §10), without React: what
 * each Turnstile callback does to the box, and which server answers spent
 * the token.
 */

/** The captcha once a person used the page: where every widget event lands. */
const started = captchaReducer(INITIAL_CAPTCHA, { type: "start" });

const run = (...events: CaptchaEvent[]): CaptchaMachine =>
  events.reduce(captchaReducer, started);

const at = (status: CaptchaStatus, drawn = true): CaptchaMachine => ({
  ...INITIAL_CAPTCHA,
  status,
  drawn,
});

const retryable = { kind: "retryable", code: "300030" } as const;

describe("captchaReducer", () => {
  it("starts idle, with nothing requested, nothing drawn and no failure", () => {
    expect(INITIAL_CAPTCHA).toEqual({
      status: "idle",
      attempt: 0,
      drawn: false,
      failure: null,
    });
  });

  it("loads once a person uses the page", () => {
    expect(started).toEqual({ ...INITIAL_CAPTCHA, status: "loading" });
  });

  it.each([
    "loading",
    "ready",
    "verified",
    "expired",
    "error",
    "timeout",
    "blocked",
  ] as const)("ignores a later start in %s (it only leaves idle)", (status) => {
    const state = at(status);

    expect(captchaReducer(state, { type: "start" })).toBe(state);
  });

  it("stays loading once the widget is drawn (the iframe has not painted yet)", () => {
    expect(run({ type: "drawn" })).toMatchObject({
      status: "loading",
      drawn: true,
    });
  });

  it("is ready when an interactive challenge is shown", () => {
    expect(run({ type: "drawn" }, { type: "interactive" }).status).toBe(
      "ready",
    );
  });

  it("is verified when a token is issued", () => {
    expect(run({ type: "drawn" }, { type: "solved" }).status).toBe("verified");
  });

  it("goes from verified to expired when the token times out", () => {
    expect(
      run({ type: "drawn" }, { type: "solved" }, { type: "expired" }).status,
    ).toBe("expired");
  });

  it("is ready again after an unsolved interactive challenge times out", () => {
    expect(captchaReducer(at("ready"), { type: "challenge-timeout" })).toEqual(
      at("ready"),
    );
  });

  it("is blocked when api.js failed to load, and errored on a widget error", () => {
    expect(
      run({ type: "failed", failure: { kind: "script", code: null } }),
    ).toMatchObject({ status: "blocked", drawn: false });
    expect(
      run({ type: "drawn" }, { type: "failed", failure: retryable }),
    ).toMatchObject({ status: "error", failure: retryable });
  });

  it.each(["loading", "expired"] as const)(
    "times out from %s when the watchdog fires",
    (status) => {
      expect(captchaReducer(at(status), { type: "watchdog" }).status).toBe(
        "timeout",
      );
    },
  );

  it.each([
    "idle",
    "ready",
    "verified",
    "error",
    "blocked",
    "timeout",
  ] as const)("ignores the watchdog in %s (nothing is pending)", (status) => {
    const state = at(status);

    expect(captchaReducer(state, { type: "watchdog" })).toBe(state);
  });

  it.each(["timeout", "error", "expired", "ready", "loading"] as const)(
    "accepts a late token after %s",
    (status) => {
      expect(captchaReducer(at(status), { type: "solved" }).status).toBe(
        "verified",
      );
    },
  );

  it("clears the failure when Cloudflare's own retry shows a challenge", () => {
    const failed = run(
      { type: "drawn" },
      { type: "failed", failure: retryable },
    );

    expect(captchaReducer(failed, { type: "interactive" })).toMatchObject({
      status: "ready",
      failure: null,
    });
  });

  it("starts a new attempt on retry: a new widget key, nothing drawn, loading", () => {
    const failed = run(
      { type: "drawn" },
      { type: "failed", failure: retryable },
    );
    const retried = captchaReducer(failed, { type: "retry" });

    expect(retried).toEqual({
      status: "loading",
      attempt: 1,
      drawn: false,
      failure: null,
    });
    expect(captchaReducer(retried, { type: "retry" }).attempt).toBe(2);
  });

  it("keeps a verified state when the same widget is drawn again", () => {
    expect(captchaReducer(at("verified"), { type: "drawn" }).status).toBe(
      "verified",
    );
  });

  it("goes back to loading when a widget is drawn after a timeout (api.js was late)", () => {
    expect(
      captchaReducer(at("timeout", false), { type: "drawn" }),
    ).toMatchObject({ status: "loading", drawn: true });
  });
});

describe("classifyTurnstileError", () => {
  it("treats react-turnstile's own failure (no widget) as the script not loading", () => {
    expect(classifyTurnstileError(SCRIPT_LOAD_FAILURE, false)).toEqual({
      kind: "script",
      code: null,
    });
    expect(classifyTurnstileError(undefined, false).kind).toBe("script");
    expect(classifyTurnstileError(SCRIPT_LOAD_FAILURE, true).kind).toBe(
      "script",
    );
  });

  it.each([
    ["110100", "config"],
    ["110110", "config"],
    ["110200", "config"],
    ["400020", "config"],
    // Sitekey domain mismatch (Cloudflare: not retryable).
    ["400021", "config"],
    ["400070", "config"],
    ["102001", "config"],
    ["106010", "config"],
    ["200100", "clock"],
    ["110500", "unsupported"],
    ["110510", "unsupported"],
    ["200500", "frame"],
    ["300030", "retryable"],
    ["600010", "retryable"],
    ["110600", "retryable"],
    ["110620", "retryable"],
  ] as const)("classifies %s as %s", (code, kind) => {
    expect(classifyTurnstileError(code, true)).toEqual({ kind, code });
  });

  it("treats an unknown, non-numeric error from the widget as retryable", () => {
    expect(classifyTurnstileError(new Error("boom"), true)).toEqual({
      kind: "retryable",
      code: null,
    });
    expect(classifyTurnstileError(300030, true).code).toBe("300030");
  });
});

describe("what the person reads", () => {
  it("has a pt-BR message for every failure and none outside failures", () => {
    expect(failureMessage(at("timeout"))).toBe(TIMEOUT_MESSAGE);
    expect(failureMessage(at("blocked", false))).toBe(FAILURE_MESSAGE.script);
    expect(
      failureMessage({
        ...at("error"),
        failure: { kind: "clock", code: "200100" },
      }),
    ).toMatch(/data e a hora/);
    expect(
      failureMessage({
        ...at("error"),
        failure: { kind: "unsupported", code: null },
      }),
    ).toMatch(/navegador não é compatível/);

    for (const status of [
      "idle",
      "loading",
      "ready",
      "verified",
      "expired",
    ] as const) {
      expect(failureMessage(at(status))).toBeNull();
      expect(STATUS_TEXT[status]).not.toBe("");
    }
  });

  it("announces loading as loading, not as a passed check", () => {
    expect(STATUS_TEXT.loading).toBe("Carregando verificação de segurança…");
    expect(STATUS_TEXT.verified).toBe("Verificação de segurança concluída.");
  });

  it("says, before anything loads, what starts the check", () => {
    expect(STATUS_TEXT.idle).toBe(
      "A verificação de segurança começa quando você usar o formulário.",
    );
  });
});

describe("which server answers spent the token", () => {
  it("login: an error message, the e-mail notice and the 2FA step did; field errors did not", () => {
    expect(loginConsumedCaptcha(null)).toBe(false);
    expect(loginConsumedCaptcha({})).toBe(false);
    expect(
      loginConsumedCaptcha({
        loginError: { email: ["O e-mail informado não é válido."] },
      } as never),
    ).toBe(false);
    expect(
      loginConsumedCaptcha({
        loginError: { loginErrorMessage: "Falha no desafio de segurança." },
      }),
    ).toBe(true);
    expect(
      loginConsumedCaptcha({ emailVerification: "Verifique seu e-mail." }),
    ).toBe(true);
    expect(loginConsumedCaptcha({ twoFactor: true })).toBe(true);
  });

  it("forgot: an error message and the success did; field errors did not", () => {
    expect(forgotConsumedCaptcha({})).toBe(false);
    expect(
      forgotConsumedCaptcha({
        forgotPasswordError: { email: ["x"] },
      } as never),
    ).toBe(false);
    expect(
      forgotConsumedCaptcha({
        forgotPasswordError: { forgotPasswordErrorMessage: "Erro" },
      }),
    ).toBe(true);
    expect(forgotConsumedCaptcha({ successMessage: "Enviado" })).toBe(true);
  });

  it("quote: the API's message and the success did; field errors did not", () => {
    expect(quoteConsumedCaptcha({})).toBe(false);
    expect(
      quoteConsumedCaptcha({ createQuoteError: { name: ["x"] } } as never),
    ).toBe(false);
    expect(
      quoteConsumedCaptcha({
        createQuoteError: { createQuoteErrorMessage: "TURNSTILE_FAILED" },
      }),
    ).toBe(true);
    expect(quoteConsumedCaptcha({ successMessage: "Recebido" })).toBe(true);
  });
});
