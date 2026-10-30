import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The captcha token in the three forms that carry it (README §10): login,
 * /forgot and the quote's step 3, in a production build (NODE_ENV stubbed).
 *
 * Fixed here: a token the server had already verified stayed in the form
 * after "verify your e-mail" and after /forgot's success, so the next submit
 * failed with "Falha no desafio de segurança."; the quote's "Voltar" from
 * step 3 left the submit enabled over a captcha still loading, and the
 * request went without a token.
 *
 * Stood in for: Next's form hooks (this runner's react-dom has none), the
 * server actions, the theme and the public configuration, and
 * react-turnstile, by a double that records each widget and fires its
 * callbacks. The forms, the wrapper and the token hook are the real ones.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const formState = vi.hoisted(() => ({ current: null as unknown }));

interface FakeInstance {
  props: {
    onLoad?: (widgetId: string, bound: unknown) => void;
    onSuccess?: (token: string, pre: boolean, bound: unknown) => void;
  };
  alive: boolean;
}

const fake = vi.hoisted(() => ({ instances: [] as FakeInstance[] }));

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormState: (_action: unknown, initial: unknown) => [
    formState.current ?? initial,
    () => {},
  ],
  useFormStatus: () => ({ pending: false }),
}));

vi.mock("react-turnstile", async () => {
  const ReactModule = await import("react");

  function FakeTurnstile(props: FakeInstance["props"]) {
    const ref = ReactModule.useRef<FakeInstance | null>(null);

    if (!ref.current) {
      ref.current = { props, alive: false };
      fake.instances.push(ref.current);
    }
    ref.current.props = props;

    ReactModule.useEffect(() => {
      const instance = ref.current!;
      instance.alive = true;

      return () => {
        instance.alive = false;
      };
    }, []);

    return null;
  }

  return { default: FakeTurnstile };
});

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));
vi.mock("@/env/use-public-config", () => ({
  usePublicConfig: () => ({ turnstileSiteKey: "1x00000000000000000000AA" }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));
vi.mock("@/socket", () => ({ disconnectSocket: () => {} }));
vi.mock("@/lib/clear-session-state", () => ({ clearSessionState: () => {} }));

vi.mock("@/actions/user/login-user", () => ({
  handleLoginUser: vi.fn(async () => ({})),
}));
vi.mock("@/actions/user/forgot-password-user", () => ({
  handleForgotPassword: vi.fn(async () => ({})),
}));
vi.mock("@/actions/user/two-factor-authentication-user", () => ({
  handleTwoFactorAuthenticationUser: vi.fn(async () => ({})),
}));
vi.mock("@/actions/user/resend-two-factor-code", () => ({
  handleResendTwoFactorCode: vi.fn(async () => ({})),
}));
vi.mock("@/actions/quote/create-quote", () => ({
  handleQuoteSubmit: () => undefined,
}));

import { LoginForm } from "@/components/auth/login-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { QuoteForm } from "@/components/quote-form";

(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;
let element: ReactElement | null = null;

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const tokenInput = () => $<HTMLInputElement>('input[name="turnstileToken"]');
const submitButton = () => $<HTMLButtonElement>('button[type="submit"]');
const alive = () => fake.instances.filter((instance) => instance.alive);

async function flush(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/**
 * A person's first key: the sticky activation the browser keeps after it
 * (jsdom has none; it lets the quote's step 3 load at once), and the event.
 */
async function person(): Promise<void> {
  Object.defineProperty(navigator, "userActivation", {
    configurable: true,
    value: { hasBeenActive: true, isActive: true },
  });
  await act(async () => {
    document.body.dispatchEvent(new Event("keydown", { bubbles: true }));
  });
}

/** Renders the form; a person uses the page unless told otherwise. */
async function mount(
  next: ReactElement,
  { asPerson = true } = {},
): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  element = next;

  await act(async () => root!.render(next));
  if (asPerson) await person();
  await flush(0);
}

const captchaState = () =>
  $("[data-captcha-state]").getAttribute("data-captcha-state");

/** A new server answer, as useFormState hands it over. */
async function answer(state: unknown): Promise<void> {
  formState.current = state;
  // A clone: new props, same component, so the form re-renders in place.
  await act(async () => root!.render(React.cloneElement(element!)));
  await flush(0);
}

async function solve(token: string): Promise<FakeInstance> {
  const live = alive();

  expect(live).toHaveLength(1);
  await act(async () => live[0].props.onLoad?.("w", {}));
  await act(async () => live[0].props.onSuccess?.(token, false, {}));

  return live[0];
}

async function type(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(input),
    "value",
  )!.set!;

  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submit(form: HTMLFormElement): Promise<void> {
  await act(async () => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await flush(0);
}

let consoleSpy: { mockRestore: () => void } | null = null;

beforeEach(() => {
  // As in live-validation-forms.test.ts: the one warning this runner's
  // react-dom prints for `<form action={fn}>` is about the runtime.
  const consoleError = console.error.bind(console);
  consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation((...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        (args[0].includes("Invalid value for prop %s on <%s> tag") ||
          args[0].includes("Invalid value for prop `action`"))
      )
        return;
      consoleError(...args);
    });

  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubEnv("NODE_ENV", "production");
  formState.current = null;
  fake.instances.length = 0;
});

afterEach(async () => {
  consoleSpy?.mockRestore();
  await act(async () => root?.unmount());
  root = null;
  element = null;
  document.body.innerHTML = "";
  delete (navigator as { userActivation?: unknown }).userActivation;
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("login", () => {
  it("loads nothing of Cloudflare's until the person uses the form", async () => {
    await mount(createElement(LoginForm), { asPerson: false });

    expect(captchaState()).toBe("idle");
    expect(fake.instances).toHaveLength(0);
    expect(submitButton().disabled).toBe(true);
    expect(tokenInput().value).toBe("");

    await person();
    await flush(0);

    expect(captchaState()).toBe("loading");
    expect(alive()).toHaveLength(1);
  });

  it("keeps Entrar disabled until the widget issues a token, then sends it", async () => {
    await mount(createElement(LoginForm));

    expect(submitButton().textContent).toContain("Entrar");
    expect(submitButton().disabled).toBe(true);
    expect(tokenInput().value).toBe("");
    expect(captchaState()).toBe("loading");

    await solve("token-1");

    expect(submitButton().disabled).toBe(false);
    expect(tokenInput().value).toBe("token-1");
  });

  it.each([
    [
      "the e-mail notice (200 emailVerification)",
      { emailVerification: "Verifique seu e-mail." },
    ],
    [
      "an error message",
      { loginError: { loginErrorMessage: "Credenciais inválidas!" } },
    ],
  ])(
    "draws a new widget and drops the spent token after %s",
    async (_case, state) => {
      await mount(createElement(LoginForm));
      const first = await solve("token-1");

      await answer(state);

      expect(first.alive).toBe(false);
      expect(alive()).toHaveLength(1);
      expect(tokenInput().value).toBe("");
      expect(submitButton().disabled).toBe(true);

      await solve("token-2");

      expect(tokenInput().value).toBe("token-2");
      expect(submitButton().disabled).toBe(false);
    },
  );

  it("keeps the unused token after field errors only (the action stopped before siteverify)", async () => {
    await mount(createElement(LoginForm));
    const first = await solve("token-1");

    await answer({ loginError: { password: ["A senha é obrigatória."] } });

    expect(first.alive).toBe(true);
    expect(tokenInput().value).toBe("token-1");
    expect(submitButton().disabled).toBe(false);
  });
});

describe("forgot", () => {
  it("its autofocus does not load the captcha; the person's first key does", async () => {
    await mount(createElement(ForgotPasswordForm), { asPerson: false });

    expect(document.activeElement).toBe($('input[name="email"]'));
    expect(captchaState()).toBe("idle");
    expect(fake.instances).toHaveLength(0);

    await person();
    await flush(0);

    expect(captchaState()).toBe("loading");
    expect(alive()).toHaveLength(1);
  });

  it("draws a new widget and drops the spent token after the success", async () => {
    await mount(createElement(ForgotPasswordForm));
    expect(submitButton().disabled).toBe(true);

    const first = await solve("token-1");
    expect(submitButton().disabled).toBe(false);

    await answer({ successMessage: "E-mail enviado." });

    expect(first.alive).toBe(false);
    expect(tokenInput().value).toBe("");
    expect(submitButton().disabled).toBe(true);
  });

  it("does the same after an error message", async () => {
    await mount(createElement(ForgotPasswordForm));
    const first = await solve("token-1");

    await answer({
      forgotPasswordError: {
        forgotPasswordErrorMessage: "Falha no desafio de segurança.",
      },
    });

    expect(first.alive).toBe(false);
    expect(tokenInput().value).toBe("");
  });
});

describe("quote", () => {
  async function toStepThree(): Promise<void> {
    const form = $<HTMLFormElement>("form");

    await act(async () => {
      $<HTMLInputElement>('input[name="fleet_size"][value="6-15"]').click();
    });
    await submit(form);

    await type($<HTMLInputElement>("#name"), "Ana Souza");
    await type($<HTMLInputElement>("#company"), "Transportes Rápidos");
    await type($<HTMLInputElement>("#email"), "ana@transportes.com.br");
    await type($<HTMLInputElement>("#telephone"), "11912345678");
    await submit(form);

    expect(document.body.textContent).toMatch(/Etapa 3 de 3/);
    // Reached by the person's input: the captcha loads at once.
    await flush(0);
  }

  it("has no captcha before step 3", async () => {
    await mount(createElement(QuoteForm));

    expect(document.querySelector("[data-captcha-state]")).toBeNull();
    expect(document.querySelector('input[name="turnstileToken"]')).toBeNull();
  });

  it("back and forward from step 3: the old token is gone and the submit waits for a new one", async () => {
    await mount(createElement(QuoteForm));
    await toStepThree();

    expect(submitButton().disabled).toBe(true);
    expect(submitButton().getAttribute("aria-describedby")).toMatch(
      /^quote-privacy-notice \S+$/,
    );

    const first = await solve("token-1");

    expect(submitButton().disabled).toBe(false);
    expect(tokenInput().value).toBe("token-1");
    expect(submitButton().getAttribute("aria-describedby")).toBe(
      "quote-privacy-notice",
    );

    // "Voltar" to step 2 unmounts the widget.
    await act(async () =>
      $<HTMLButtonElement>('button[aria-label="Voltar"]').click(),
    );
    await flush(0);

    expect(document.body.textContent).toMatch(/Etapa 2 de 3/);
    expect(first.alive).toBe(false);
    expect(document.querySelector('input[name="turnstileToken"]')).toBeNull();

    // "Continuar" back to step 3: a new widget, loading, the submit disabled.
    await submit($<HTMLFormElement>("form"));
    expect(document.body.textContent).toMatch(/Etapa 3 de 3/);
    await flush(0);

    expect(captchaState()).toBe("loading");
    expect(tokenInput().value).toBe("");
    expect(submitButton().disabled).toBe(true);

    await solve("token-2");

    expect(tokenInput().value).toBe("token-2");
    expect(submitButton().disabled).toBe(false);
  });

  it("draws a new widget after the API's error message (the token was sent)", async () => {
    await mount(createElement(QuoteForm));
    await toStepThree();
    const first = await solve("token-1");

    await answer({
      createQuoteError: {
        createQuoteErrorMessage: "Falha na verificação de segurança.",
      },
    });

    expect(first.alive).toBe(false);
    expect(tokenInput().value).toBe("");
    expect(submitButton().disabled).toBe(true);
  });
});
