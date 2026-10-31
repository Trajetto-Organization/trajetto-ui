import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Puts React in scope for the classic-runtime JSX below.
import { React } from "./helpers/render-html";

void React;

/**
 * The captcha's visible states and its token (README §10), with
 * react-turnstile replaced by a double that records each widget instance
 * and lets the test fire Cloudflare's callbacks. The wrapper, its state
 * machine, the useCaptchaToken hook and the controlled hidden input are the
 * real ones, wired the way the login form wires them.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

interface FakeBound {
  reset: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  getResponse: ReturnType<typeof vi.fn>;
  isExpired: ReturnType<typeof vi.fn>;
}

interface FakeInstance {
  id: number;
  props: Record<string, unknown> & {
    onLoad?: (widgetId: string, bound: FakeBound) => void;
    onSuccess?: (token: string, pre: boolean, bound: FakeBound) => void;
    onExpire?: (token: string, bound: FakeBound) => void;
    onError?: (error?: unknown, bound?: FakeBound) => unknown;
    onTimeout?: (bound: FakeBound) => void;
    onBeforeInteractive?: (bound: FakeBound) => void;
    onUnsupported?: (bound: FakeBound) => void;
  };
  alive: boolean;
  bound: FakeBound;
  /** The theme of each Cloudflare render of this widget. */
  renders: string[];
}

const fake = vi.hoisted(() => ({
  instances: [] as FakeInstance[],
  mounts: 0,
  unmounts: 0,
}));

const env = vi.hoisted(() => ({
  theme: undefined as string | undefined,
  sitekey: "1x00000000000000000000AA" as string | null,
}));

vi.mock("react-turnstile", async () => {
  const ReactModule = await import("react");

  function FakeTurnstile(props: FakeInstance["props"]) {
    const ref = ReactModule.useRef<FakeInstance | null>(null);

    if (!ref.current) {
      ref.current = {
        id: fake.instances.length,
        props,
        alive: false,
        renders: [],
        bound: {
          reset: vi.fn(),
          execute: vi.fn(),
          getResponse: vi.fn(),
          isExpired: vi.fn(),
        },
      };
      fake.instances.push(ref.current);
    }
    ref.current.props = props;

    ReactModule.useEffect(() => {
      const instance = ref.current!;
      instance.alive = true;
      fake.mounts += 1;

      return () => {
        instance.alive = false;
        fake.unmounts += 1;
      };
    }, []);

    // react-turnstile draws the widget again whenever its theme changes
    // (the theme is in its render effect's deps).
    ReactModule.useEffect(() => {
      ref.current!.renders.push(String(props.theme));
    }, [props.theme]);

    return ReactModule.createElement("div", {
      "data-fake-turnstile": ref.current.id,
    });
  }

  return { default: FakeTurnstile };
});

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: env.theme }),
}));

vi.mock("@/env/use-public-config", () => ({
  usePublicConfig: () =>
    env.sitekey ? { turnstileSiteKey: env.sitekey } : null,
}));

import {
  CaptchaTurnstile,
  THEME_SETTLE_MS,
  useCaptchaToken,
} from "@/components/shared/custom/captcha-turnstile";

let root: Root | null = null;
let api: ReturnType<typeof useCaptchaToken> | null = null;
let showWidget: ((show: boolean) => void) | null = null;

/** The form side, as the login form has it. */
function Harness(): JSX.Element {
  const captcha = useCaptchaToken();
  const [show, setShow] = useState(true);

  api = captcha;
  showWidget = setShow;

  return (
    <form>
      {show ? (
        <CaptchaTurnstile
          {...captcha.widget}
          size="flexible"
          loadTimeoutMs={15_000}
        />
      ) : null}
      <input type="hidden" name="turnstileToken" value={captcha.token ?? ""} />
      <button
        type="submit"
        disabled={captcha.missing}
        aria-describedby={captcha.describedBy}
      >
        Entrar
      </button>
    </form>
  );
}

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector);
const box = () => $("[data-captcha-state]")!;
const state = () => box().getAttribute("data-captcha-state");
const tokenInput = () => $<HTMLInputElement>('input[name="turnstileToken"]')!;
const submitButton = () => $<HTMLButtonElement>('button[type="submit"]')!;
const statusText = () => $('[role="status"]')?.textContent ?? "";
const alertBox = () => $('[role="alert"]');
const skeleton = () => $("[data-captcha-skeleton]");
const idleBox = () => $("[data-captcha-idle]");
const alive = () => fake.instances.filter((instance) => instance.alive);
const widget = () => {
  const live = alive();

  expect(live).toHaveLength(1);

  return live[0];
};
const buttonNamed = (name: string) =>
  [...document.querySelectorAll("button")].find((button) =>
    button.textContent?.includes(name),
  );

async function flush(ms = 0): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function fire(callback: () => void): Promise<void> {
  await act(async () => {
    callback();
  });
}

/** An input event, as the browser dispatches it under the page. */
async function press(input: string): Promise<void> {
  await act(async () => {
    document.body.dispatchEvent(new Event(input, { bubbles: true }));
  });
}

/** The sticky activation a browser keeps once a person used the page (jsdom has none). */
function markActivated(): void {
  Object.defineProperty(navigator, "userActivation", {
    configurable: true,
    value: { hasBeenActive: true, isActive: true },
  });
}

/** A person's first input: the activation it leaves, and the event. */
async function person(): Promise<void> {
  markActivated();
  await press("keydown");
}

/** Renders the form; a person uses the page unless told otherwise. */
async function mount({ asPerson = true } = {}): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => root!.render(<Harness />));
  if (asPerson) await person();
  await flush(1);
}

/** Drives the current widget to a fresh token. */
async function solve(token: string): Promise<FakeInstance> {
  const current = widget();

  await fire(() => current.props.onLoad?.("w", current.bound));
  await fire(() => current.props.onSuccess?.(token, false, current.bound));

  return current;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("NODE_ENV", "production");
  fake.instances.length = 0;
  fake.mounts = 0;
  fake.unmounts = 0;
  env.theme = undefined;
  env.sitekey = "1x00000000000000000000AA";
  delete (window as { turnstile?: unknown }).turnstile;
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  api = null;
  showWidget = null;
  document.body.innerHTML = "";
  delete (navigator as { userActivation?: unknown }).userActivation;
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("before a person uses the page", () => {
  it("holds the box with a still placeholder and loads nothing: no widget, not busy, never a timeout", async () => {
    await mount({ asPerson: false });

    expect(state()).toBe("idle");
    expect(fake.instances).toHaveLength(0);
    // Not the pulsing skeleton of a load: a still box that says what starts it.
    expect(skeleton()).toBeNull();
    expect(idleBox()).not.toBeNull();
    expect(idleBox()!.getAttribute("aria-hidden")).toBe("true");
    expect(idleBox()!.textContent).toContain(
      "Começa quando você usar o formulário.",
    );
    expect(idleBox()!.getAttribute("style")).toContain("height: 65px");
    expect(box().innerHTML).toContain("min-height: 65px");
    expect(box().querySelector("[aria-busy]")).toBeNull();
    expect(statusText()).toBe(
      "A verificação de segurança começa quando você usar o formulário.",
    );
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().getAttribute("aria-describedby")).toBe(
      api!.widget.statusId,
    );

    // The person may take their time: no watchdog runs before the start.
    await flush(60_000);

    expect(state()).toBe("idle");
    expect(alertBox()).toBeNull();
    expect(fake.instances).toHaveLength(0);
  });

  it.each(["pointerdown", "keydown", "touchstart"])(
    "loads on the person's first %s, once",
    async (input) => {
      await mount({ asPerson: false });
      await press(input);
      await flush(1);

      expect(state()).toBe("loading");
      expect(alive()).toHaveLength(1);

      await press("keydown");
      await press("pointerdown");

      expect(fake.mounts).toBe(1);
    },
  );

  it("loads when a pointer moves over the form, not elsewhere on the page", async () => {
    // Firefox before 119 and Safari before 17.5 send nothing for a press on
    // the disabled submit: the pointer on its way there starts the check.
    await mount({ asPerson: false });
    const outside = document.createElement("div");
    document.body.appendChild(outside);

    await act(async () => {
      outside.dispatchEvent(new Event("pointermove", { bubbles: true }));
    });
    await flush(1);

    expect(state()).toBe("idle");

    await act(async () => {
      submitButton().dispatchEvent(new Event("pointermove", { bubbles: true }));
    });
    await flush(1);

    expect(state()).toBe("loading");
    expect(idleBox()).toBeNull();
    expect(skeleton()).not.toBeNull();
    expect(alive()).toHaveLength(1);
  });

  it("does not load on focus alone (the forgot form focuses its field on load)", async () => {
    await mount({ asPerson: false });
    const field = document.createElement("input");
    document.body.appendChild(field);

    await act(async () => field.focus());
    await flush(1);

    expect(document.activeElement).toBe(field);
    expect(state()).toBe("idle");
    expect(fake.instances).toHaveLength(0);
  });

  it("loads at once where the person already used the page (the browser's sticky activation)", async () => {
    markActivated();
    await mount({ asPerson: false });

    expect(state()).toBe("loading");
    expect(alive()).toHaveLength(1);
  });

  it("stops waiting when it unmounts before the person comes", async () => {
    const removed = vi.spyOn(window, "removeEventListener");

    await mount({ asPerson: false });
    await act(async () => root!.unmount());
    root = null;

    expect(removed.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(["pointerdown", "keydown", "touchstart"]),
    );

    await press("keydown");

    expect(fake.instances).toHaveLength(0);
  });
});

describe("loading", () => {
  it("shows the skeleton, busy and announced, with the submit disabled and no token", async () => {
    await mount();

    expect(state()).toBe("loading");
    expect(box().querySelector("[aria-busy]")?.getAttribute("aria-busy")).toBe(
      "true",
    );
    expect(box().querySelector("[aria-busy] [role=status]")).toBeNull();
    expect(skeleton()).not.toBeNull();
    expect(skeleton()!.getAttribute("aria-hidden")).toBe("true");
    expect(statusText()).toBe("Carregando verificação de segurança…");
    expect(submitButton().disabled).toBe(true);
    expect(tokenInput().value).toBe("");
    // The disabled submit says why.
    expect(submitButton().getAttribute("aria-describedby")).toBe(
      api!.widget.statusId,
    );
    expect(document.getElementById(api!.widget.statusId)).not.toBeNull();
  });

  it("keeps loading once the widget is drawn, until it answers", async () => {
    await mount();
    const current = widget();

    await fire(() => current.props.onLoad?.("w", current.bound));

    expect(state()).toBe("loading");
    expect(skeleton()).not.toBeNull();
    expect(submitButton().disabled).toBe(true);
  });

  it("asks Cloudflare for the app's theme, in Portuguese, without its own input field", async () => {
    env.theme = "dark";
    await mount();

    expect(widget().props).toMatchObject({
      sitekey: "1x00000000000000000000AA",
      theme: "dark",
      language: "pt-br",
      size: "flexible",
      responseField: false,
      refreshExpired: "never",
    });
  });

  it("uses 'auto' while the app's theme is not known", async () => {
    await mount();

    expect(widget().props.theme).toBe("auto");
  });
});

describe("ready and verified", () => {
  it("is ready (skeleton gone, submit still disabled) when a challenge is shown", async () => {
    await mount();
    const current = widget();

    await fire(() => current.props.onLoad?.("w", current.bound));
    await fire(() => current.props.onBeforeInteractive?.(current.bound));

    expect(state()).toBe("ready");
    expect(skeleton()).toBeNull();
    expect(box().querySelector("[aria-busy]")).toBeNull();
    expect(statusText()).toBe(
      "Conclua a verificação de segurança para continuar.",
    );
    expect(submitButton().disabled).toBe(true);
  });

  it("is verified with the token in the controlled input and the submit enabled", async () => {
    await mount();
    await solve("token-1");

    expect(state()).toBe("verified");
    expect(skeleton()).toBeNull();
    expect(tokenInput().value).toBe("token-1");
    expect(submitButton().disabled).toBe(false);
    expect(submitButton().hasAttribute("aria-describedby")).toBe(false);
    expect(statusText()).toBe("Verificação de segurança concluída.");
    expect(alertBox()).toBeNull();
  });

  it("drops the token when an unsolved challenge times out", async () => {
    await mount();
    const current = await solve("token-1");

    await fire(() => current.props.onTimeout?.(current.bound));

    expect(state()).toBe("ready");
    expect(tokenInput().value).toBe("");
    expect(submitButton().disabled).toBe(true);
  });
});

describe("expired", () => {
  it("clears the token, resets the widget and disables the submit until a new token", async () => {
    await mount();
    const current = await solve("token-1");

    await fire(() => current.props.onExpire?.("token-1", current.bound));

    expect(state()).toBe("expired");
    expect(tokenInput().value).toBe("");
    expect(submitButton().disabled).toBe(true);
    expect(current.bound.reset).toHaveBeenCalledTimes(1);
    expect(statusText()).toBe(
      "A verificação de segurança expirou e está sendo renovada.",
    );

    await fire(() =>
      current.props.onSuccess?.("token-2", false, current.bound),
    );

    expect(state()).toBe("verified");
    expect(tokenInput().value).toBe("token-2");
    expect(submitButton().disabled).toBe(false);
  });

  it("times out if the renewal never comes", async () => {
    await mount();
    const current = await solve("token-1");

    await fire(() => current.props.onExpire?.("token-1", current.bound));
    await flush(15_000);

    expect(state()).toBe("timeout");
    expect(submitButton().disabled).toBe(true);
  });
});

describe("error", () => {
  it("shows an alert and retries with a new widget, never the old token", async () => {
    await mount();
    const first = await solve("token-1");

    let handled: unknown;
    await fire(() => {
      handled = first.props.onError?.("300030", first.bound);
    });

    expect(handled).toBe(true);
    expect(state()).toBe("error");
    expect(tokenInput().value).toBe("");
    expect(submitButton().disabled).toBe(true);
    expect(alertBox()?.textContent).toContain(
      "A verificação de segurança falhou. Tente novamente.",
    );
    expect(statusText()).toBe("");

    const retry = buttonNamed("Tentar novamente")!;
    expect(retry.getAttribute("type")).toBe("button");

    await fire(() => retry.click());

    expect(fake.unmounts).toBe(1);
    expect(fake.mounts).toBe(2);
    expect(alive()).toHaveLength(1);
    expect(widget()).not.toBe(first);
    expect(state()).toBe("loading");
    expect(skeleton()).not.toBeNull();
    expect(alertBox()).toBeNull();

    // A late answer of the discarded widget is ignored.
    await fire(() => first.props.onSuccess?.("stale", false, first.bound));

    expect(tokenInput().value).toBe("");
    expect(submitButton().disabled).toBe(true);

    await solve("token-2");

    expect(tokenInput().value).toBe("token-2");
    expect(submitButton().disabled).toBe(false);
  });

  it("goes back to verified when Cloudflare's own retry succeeds", async () => {
    await mount();
    const current = widget();

    await fire(() => current.props.onLoad?.("w", current.bound));
    await fire(() => current.props.onError?.("600010", current.bound));
    await fire(() =>
      current.props.onSuccess?.("token-1", false, current.bound),
    );

    expect(state()).toBe("verified");
    expect(alertBox()).toBeNull();
    expect(tokenInput().value).toBe("token-1");
  });

  it("says the browser is not supported, with a retry", async () => {
    await mount();
    const current = widget();

    await fire(() => current.props.onLoad?.("w", current.bound));
    await fire(() => current.props.onUnsupported?.(current.bound));

    expect(state()).toBe("error");
    expect(alertBox()?.textContent).toContain(
      "Seu navegador não é compatível com a verificação de segurança.",
    );
    expect(buttonNamed("Tentar novamente")).toBeDefined();
  });

  it("logs a configuration error's code (never a token) and offers a retry", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await mount();
    const current = widget();

    await fire(() => current.props.onLoad?.("w", current.bound));
    await fire(() => current.props.onError?.("110200", current.bound));

    expect(alertBox()?.textContent).toContain(
      "A verificação de segurança está indisponível no momento.",
    );
    expect(log).toHaveBeenCalledWith(
      "[Turnstile] configuração recusada:",
      "110200",
    );
    expect(buttonNamed("Tentar novamente")).toBeDefined();
  });

  it("keeps the widget's space while its own error is on screen", async () => {
    await mount();
    const current = widget();

    await fire(() => current.props.onLoad?.("w", current.bound));
    await fire(() => current.props.onError?.("300030", current.bound));

    expect(box().innerHTML).toContain("min-height: 65px");
  });
});

describe("script blocked", () => {
  it("offers a page reload, with no skeleton and no empty box", async () => {
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      reload,
    } as Location);

    await mount();
    const current = widget();

    // react-turnstile's own rejection: no bound widget.
    await fire(() => {
      current.props.onError?.("Failed to load Turnstile.");
    });

    expect(state()).toBe("blocked");
    expect(skeleton()).toBeNull();
    expect(box().innerHTML).not.toContain("min-height");
    expect(alertBox()?.textContent).toContain(
      "Não foi possível carregar a verificação de segurança.",
    );
    expect(buttonNamed("Tentar novamente")).toBeUndefined();
    expect(submitButton().disabled).toBe(true);

    await fire(() => buttonNamed("Recarregar página")!.click());

    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe("timeout", () => {
  it("never keeps the skeleton: after the limit it says so and offers a retry", async () => {
    await mount();
    const current = widget();

    await fire(() => current.props.onLoad?.("w", current.bound));
    // The limit counts from the start (mount() already ran 1 ms after it).
    await flush(14_998);
    expect(state()).toBe("loading");

    await flush(1);

    expect(state()).toBe("timeout");
    expect(skeleton()).toBeNull();
    expect(alertBox()?.textContent).toContain(
      "A verificação de segurança está demorando mais que o normal.",
    );
    expect(submitButton().disabled).toBe(true);

    // A late token still counts.
    await fire(() =>
      current.props.onSuccess?.("token-1", false, current.bound),
    );

    expect(state()).toBe("verified");
    expect(tokenInput().value).toBe("token-1");
  });

  it("retries with a new widget when the drawn one hangs", async () => {
    await mount();
    const current = widget();

    await fire(() => current.props.onLoad?.("w", current.bound));
    await flush(15_000);
    await fire(() => buttonNamed("Tentar novamente")!.click());

    expect(widget()).not.toBe(current);
    expect(state()).toBe("loading");
  });

  it("offers a reload when api.js never arrived (a new widget would wait on it)", async () => {
    await mount();
    await flush(15_000);

    expect(state()).toBe("timeout");
    expect(buttonNamed("Recarregar página")).toBeDefined();
    expect(box().innerHTML).not.toContain("min-height");
  });

  it("times out without a site key (the public configuration never came)", async () => {
    env.sitekey = null;
    await mount();

    expect(alive()).toHaveLength(0);
    expect(skeleton()).not.toBeNull();

    await flush(15_000);

    expect(state()).toBe("timeout");
    expect(buttonNamed("Recarregar página")).toBeDefined();
    expect(submitButton().disabled).toBe(true);
  });
});

describe("the token's life", () => {
  it("is dropped and a new widget drawn when the form resets it (a consumed token)", async () => {
    await mount();
    const first = await solve("token-1");

    await fire(() => api!.reset());

    expect(first.alive).toBe(false);
    expect(alive()).toHaveLength(1);
    expect(tokenInput().value).toBe("");
    expect(submitButton().disabled).toBe(true);
    expect(state()).toBe("loading");
  });

  it("goes with the widget when it unmounts, and a new widget waits for a new one", async () => {
    await mount();
    await solve("token-1");

    await fire(() => showWidget!(false));

    expect(alive()).toHaveLength(0);
    expect(tokenInput().value).toBe("");
    expect(submitButton().disabled).toBe(true);

    await fire(() => showWidget!(true));
    await flush(1);

    expect(state()).toBe("loading");
    expect(tokenInput().value).toBe("");
    expect(submitButton().disabled).toBe(true);

    await solve("token-2");

    expect(tokenInput().value).toBe("token-2");
  });

  it("never has two widgets alive across retries and resets", async () => {
    await mount();

    for (let round = 0; round < 3; round += 1) {
      const current = widget();
      await fire(() => current.props.onLoad?.("w", current.bound));
      await fire(() => current.props.onError?.("300030", current.bound));
      await fire(() => buttonNamed("Tentar novamente")!.click());
      expect(alive()).toHaveLength(1);
      await fire(() => api!.reset());
      expect(alive()).toHaveLength(1);
    }

    expect(fake.mounts - fake.unmounts).toBe(1);
  });
});

describe("theme", () => {
  /** The app's theme switch, as next-themes reports it. */
  async function switchTheme(theme: string): Promise<void> {
    env.theme = theme;
    await act(async () => root!.render(<Harness />));
  }

  it("follows the app's theme once it settles", async () => {
    env.theme = "light";
    await mount();

    expect(widget().props.theme).toBe("light");

    await switchTheme("dark");
    await flush(THEME_SETTLE_MS - 1);

    expect(widget().props.theme).toBe("light");

    await flush(1);

    expect(widget().props.theme).toBe("dark");
    expect(widget().renders).toEqual(["light", "dark"]);
  });

  it("follows it while verified too, keeping the token until the new widget issues one", async () => {
    env.theme = "light";
    await mount();
    const current = await solve("token-1");

    await switchTheme("dark");
    await flush(THEME_SETTLE_MS);

    // Drawn again in place, in the new theme.
    expect(widget()).toBe(current);
    expect(current.renders).toEqual(["light", "dark"]);

    // The redraw reports a load: the form keeps its token and may send.
    await fire(() => current.props.onLoad?.("w2", current.bound));

    expect(state()).toBe("verified");
    expect(tokenInput().value).toBe("token-1");
    expect(submitButton().disabled).toBe(false);

    await fire(() =>
      current.props.onSuccess?.("token-2", false, current.bound),
    );

    expect(tokenInput().value).toBe("token-2");
  });

  it("asks the person when the redraw needs them, like any challenge", async () => {
    env.theme = "light";
    await mount();
    const current = await solve("token-1");

    await switchTheme("dark");
    await flush(THEME_SETTLE_MS);
    await fire(() => current.props.onBeforeInteractive?.(current.bound));

    // What the form says matches what the widget shows.
    expect(state()).toBe("ready");
    expect(tokenInput().value).toBe("");
  });

  it("draws nothing while the switch is clicked back and forth, then the theme that stays, once", async () => {
    env.theme = "light";
    await mount();

    for (const theme of ["dark", "light", "dark", "light", "dark"]) {
      await switchTheme(theme);
      await flush(THEME_SETTLE_MS / 4);
    }

    // Every click restarted the challenge before; nothing yet.
    expect(widget().renders).toEqual(["light"]);

    await flush(THEME_SETTLE_MS);

    expect(widget().renders).toEqual(["light", "dark"]);
    expect(fake.mounts).toBe(1);
  });

  it("is not drawn again when the switching ends where it began", async () => {
    env.theme = "light";
    await mount();

    await switchTheme("dark");
    await flush(THEME_SETTLE_MS / 2);
    await switchTheme("light");
    await flush(THEME_SETTLE_MS * 2);

    expect(widget().renders).toEqual(["light"]);
  });

  it("mounts in the theme of now when it starts after a switch", async () => {
    env.theme = "light";
    await mount({ asPerson: false });

    // Nothing drawn yet: there is nothing to wait for.
    await switchTheme("dark");
    await person();
    await flush(1);

    expect(widget().renders).toEqual(["dark"]);
  });

  it("draws the widget a consumed token brings once, in the app's theme of now", async () => {
    // The theme used to catch up in an effect: the new widget mounted in the
    // frozen theme and was drawn again a moment later.
    env.theme = "light";
    await mount();
    await solve("token-1");

    env.theme = "dark";
    await act(async () => root!.render(<Harness />));

    await fire(() => api!.reset());

    expect(widget().renders).toEqual(["dark"]);
  });
});

describe("a container narrower than the widget (the quote's step 3 on a phone)", () => {
  async function mountIn(width: number): Promise<void> {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
      width,
    );
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () =>
      root!.render(
        <CaptchaTurnstile
          onTokenChange={() => undefined}
          size="flexible"
          fallbackSize="compact"
        />,
      ),
    );
    await person();
    await flush(1);
  }

  it("draws the compact widget, with its box, when 300 px do not fit", async () => {
    await mountIn(234);

    expect(widget().props.size).toBe("compact");
    expect(box().innerHTML).toContain("min-height: 140px");
    expect(skeleton()!.getAttribute("style")).toContain("height: 140px");
  });

  it("keeps the flexible widget where it fits", async () => {
    await mountIn(304);

    expect(widget().props.size).toBe("flexible");
    expect(box().innerHTML).toContain("min-height: 65px");
  });
});

describe("outside production", () => {
  it("does not ask for a token", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await mount();

    expect(api!.required).toBe(false);
    expect(api!.missing).toBe(false);
    expect(submitButton().disabled).toBe(false);
  });
});
