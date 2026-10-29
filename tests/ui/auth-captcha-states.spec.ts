import { expect, test, type Page, type Route } from "@playwright/test";

import { waitForHydration } from "./support/ui";

/**
 * The Turnstile captcha's states in a real browser (README §10): skeleton
 * while it loads, an alert with a way out when api.js is blocked or hangs,
 * and a submit that only opens with a fresh token.
 *
 * The widget only mounts in a production build (the forms check NODE_ENV),
 * so this file runs against the CI's standalone server
 * (.github/workflows/browser-suites.yml, Turnstile's always-pass test keys)
 * and skips itself on `next dev`, where there is no captcha to test.
 *
 * Most cases replace Cloudflare's api.js with a stub served from the same
 * URL (so the page's CSP treats it exactly like the real one: same host,
 * loaded by a nonced chunk under 'strict-dynamic'). The stub draws a grey
 * box and fires the callbacks the scenario asks for, and counts render,
 * reset and remove calls in `window.__ts`.
 */

const API_JS = /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/;
const CLOUDFLARE = /challenges\.cloudflare\.com/;

type Scenario = "pass" | "error-once" | "expire" | "hang";

interface StubLog {
  renders: number;
  removes: number;
  resets: number;
  options: Array<Record<string, unknown>>;
}

/** Cloudflare's api.js, reduced to what react-turnstile calls. */
const STUB = `(() => {
  const log = (window.__ts = window.__ts || { renders: 0, removes: 0, resets: 0, options: [] });
  const widgets = {};
  let next = 0;
  const run = (id) => {
    setTimeout(() => {
      const widget = widgets[id];
      if (!widget) return;
      const o = widget.options;
      const scenario = window.__tsScenario || "pass";
      if (scenario === "pass") o.callback && o.callback("XXXX.DUMMY.TOKEN." + id);
      if (scenario === "error-once") {
        window.__tsScenario = "pass";
        o["error-callback"] && o["error-callback"]("300030");
      }
      if (scenario === "expire") {
        o.callback && o.callback("XXXX.DUMMY.TOKEN." + id);
        // Expires once; the renewal then never answers.
        setTimeout(() => {
          window.__tsScenario = "hang";
          widgets[id] && o["expired-callback"] && o["expired-callback"]("x");
        }, 400);
      }
    }, 200);
  };
  window.turnstile = {
    render(el, options) {
      const id = "stub-" + next++;
      log.renders += 1;
      log.options.push({
        theme: options.theme,
        language: options.language,
        size: options.size,
        refreshExpired: options["refresh-expired"],
        responseField: options["response-field"],
      });
      const frame = document.createElement("div");
      frame.setAttribute("data-stub-widget", id);
      frame.style.height = "65px";
      frame.style.background = "#9ca3af";
      el.appendChild(frame);
      widgets[id] = { frame, options };
      run(id);
      return id;
    },
    reset(id) { log.resets += 1; run(id); },
    remove(id) {
      log.removes += 1;
      const widget = widgets[id];
      if (widget) { widget.frame.remove(); delete widgets[id]; }
    },
    getResponse() { return undefined; },
    isExpired() { return false; },
    execute() {},
  };
  const onload = new URL(document.currentScript.src).searchParams.get("onload");
  if (onload && typeof window[onload] === "function") window[onload]();
})();`;

async function stubTurnstile(
  page: Page,
  scenario: Scenario,
  { delayMs = 0 }: { delayMs?: number } = {},
): Promise<void> {
  await page.addInitScript((value) => {
    (window as unknown as { __tsScenario: string }).__tsScenario = value;
  }, scenario);
  await page.route(API_JS, async (route: Route) => {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: STUB,
    });
  });
}

async function setTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.addInitScript((value) => {
    try {
      localStorage.setItem("theme", value);
    } catch {
      // Blocked storage: the page starts on the system theme.
    }
  }, theme);
}

const stubLog = (page: Page) =>
  page.evaluate(() => (window as unknown as { __ts?: StubLog }).__ts ?? null);

const captcha = (page: Page) => page.locator("[data-captcha-state]");
const tokenField = (page: Page) =>
  page.locator('input[type="hidden"][name="turnstileToken"]');

/**
 * Opens a form and skips the test where the build has no captcha
 * (`next dev`: the forms render it only when NODE_ENV is production).
 */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "domcontentloaded" });

  if (path === "/login") await waitForHydration(page.getByLabel("Email"));
  else await waitForHydration(page.locator("form").first());

  if (path === "/login") {
    test.skip(
      (await captcha(page).count()) === 0,
      "o Turnstile só monta na build de produção (NODE_ENV=production)",
    );
  }
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

test.describe("login: Cloudflare unreachable", () => {
  test("a blocked api.js shows an alert with a reload, and Entrar stays disabled", async ({
    page,
  }) => {
    await page.route(CLOUDFLARE, (route) => route.abort());
    await open(page, "/login");

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "blocked",
      { timeout: 10_000 },
    );
    await expect(captcha(page).getByRole("alert")).toContainText(
      "Não foi possível carregar a verificação de segurança",
    );
    await expect(
      page.getByRole("button", { name: "Recarregar página" }),
    ).toBeVisible();
    await expect(page.locator("[data-captcha-skeleton]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeDisabled();
    await expect(tokenField(page)).toHaveValue("");

    // The alert fits a phone without a sideways scroll.
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `rolagem lateral a ${width} px`).toBeLessThanOrEqual(0);
    }
  });

  test("a hanging api.js shows the skeleton, then a timeout, never forever", async ({
    page,
  }) => {
    // Never answered: the request stays pending for the page's life.
    await page.route(API_JS, () => undefined);
    await open(page, "/login");

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "loading",
    );
    await expect(captcha(page).locator('[aria-busy="true"]')).toHaveCount(1);
    await expect(page.locator("[data-captcha-skeleton]")).toBeVisible();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Carregando verificação de segurança" }),
    ).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeDisabled();

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "timeout",
      { timeout: 25_000 },
    );
    await expect(page.locator("[data-captcha-skeleton]")).toHaveCount(0);
    await expect(captcha(page).getByRole("alert")).toContainText(
      "demorando mais que o normal",
    );
    await expect(
      page.getByRole("button", { name: "Recarregar página" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });
});

test.describe("login: the widget's answers (stubbed api.js)", () => {
  test("a token enables Entrar; the box keeps its height from skeleton to widget", async ({
    page,
  }) => {
    await setTheme(page, "light");
    await stubTurnstile(page, "pass", { delayMs: 1_500 });
    await open(page, "/login");

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "loading",
    );
    const before = await captcha(page).boundingBox();

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "verified",
      { timeout: 15_000 },
    );
    const after = await captcha(page).boundingBox();

    expect(before?.height).toBeGreaterThanOrEqual(65);
    expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(
      1,
    );
    await expect(tokenField(page)).toHaveValue(/^XXXX\.DUMMY\.TOKEN\./);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();

    const log = await stubLog(page);
    expect(log?.renders).toBe(1);
    expect(log?.options[0]).toMatchObject({
      theme: "light",
      language: "pt-br",
      size: "flexible",
      refreshExpired: "never",
      responseField: false,
    });
  });

  test("the widget follows the app's dark theme", async ({ page }) => {
    await setTheme(page, "dark");
    await stubTurnstile(page, "pass");
    await open(page, "/login");

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "verified",
      { timeout: 15_000 },
    );
    expect((await stubLog(page))?.options[0].theme).toBe("dark");
  });

  test("an error offers a retry that draws one new widget, never two", async ({
    page,
  }) => {
    await stubTurnstile(page, "error-once");
    await open(page, "/login");

    await expect(captcha(page)).toHaveAttribute("data-captcha-state", "error", {
      timeout: 15_000,
    });
    await expect(captcha(page).getByRole("alert")).toContainText(
      "A verificação de segurança falhou",
    );
    await expect(page.getByRole("button", { name: "Entrar" })).toBeDisabled();

    await page.getByRole("button", { name: "Tentar novamente" }).click();

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "verified",
      { timeout: 15_000 },
    );
    await expect(page.locator("[data-stub-widget]")).toHaveCount(1);
    expect(await stubLog(page)).toMatchObject({ renders: 2, removes: 1 });
    await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  test("an expired token is dropped, the widget reset, and Entrar disabled again", async ({
    page,
  }) => {
    await stubTurnstile(page, "expire");
    await open(page, "/login");

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "expired",
      { timeout: 15_000 },
    );
    await expect(tokenField(page)).toHaveValue("");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeDisabled();
    expect((await stubLog(page))?.resets).toBe(1);
  });
});

test.describe("login: the real widget (always-pass test key)", () => {
  test("goes from skeleton to a token without moving the form", async ({
    page,
  }) => {
    await open(page, "/login");

    const before = await captcha(page).boundingBox();

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "verified",
      { timeout: 30_000 },
    );
    const after = await captcha(page).boundingBox();

    expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(
      1,
    );
    await expect(tokenField(page)).not.toHaveValue("");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });
});

test.describe("quote: leaving step 3 drops the token", () => {
  test("back and forward again: a new widget, and the submit waits for its token", async ({
    page,
  }) => {
    await stubTurnstile(page, "pass");
    await open(page, "/orcamento");

    const form = page.locator("form").first();

    await form
      .locator('label:has(input[name="fleet_size"][value="6-15"])')
      .click();
    await form.getByRole("button", { name: /Continuar/ }).click();
    await form.locator("#name").fill("Ana Souza");
    await form.locator("#company").fill("Transportes Rápidos");
    await form.locator("#email").fill("ana@transportes.com.br");
    await form.locator("#telephone").fill("11912345678");
    await form.getByRole("button", { name: /Continuar/ }).click();
    await expect(page.getByText("Etapa 3 de 3")).toBeVisible();

    test.skip(
      (await captcha(page).count()) === 0,
      "o Turnstile só monta na build de produção (NODE_ENV=production)",
    );

    const send = form.getByRole("button", { name: /Solicitar Orçamento/ });

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "verified",
      { timeout: 15_000 },
    );
    await expect(send).toBeEnabled();

    // The next widget never answers: the submit must not open on its own.
    await page.evaluate(() => {
      (window as unknown as { __tsScenario: string }).__tsScenario = "hang";
    });
    await form.getByRole("button", { name: "Voltar" }).click();
    await expect(page.getByText("Etapa 2 de 3")).toBeVisible();
    await expect(captcha(page)).toHaveCount(0);

    await form.getByRole("button", { name: /Continuar/ }).click();
    await expect(page.getByText("Etapa 3 de 3")).toBeVisible();

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "loading",
    );
    await expect(tokenField(page)).toHaveValue("");
    await expect(send).toBeDisabled();
    await expect
      .poll(async () => (await stubLog(page))?.renders, { timeout: 10_000 })
      .toBe(2);
    expect((await stubLog(page))?.removes).toBe(1);
    await expect(send).toBeDisabled();
  });
});
