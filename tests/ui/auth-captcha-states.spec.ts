import { expect, test, type Page, type Route } from "./support/test";

import {
  TURNSTILE_DUMMY_TOKEN,
  TURNSTILE_FRAME_PREFIX,
  TURNSTILE_SCRIPT_BODY,
} from "./support/external-doubles";
import { DOUBLES_PORT } from "./support/suite-config";
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
 * Nothing here reaches Cloudflare. Its api.js is the suites' double, served
 * from the same URL (so the page's CSP treats it exactly like the real one:
 * same host, loaded by a nonced chunk under 'strict-dynamic';
 * support/external-doubles.ts). It draws a grey box and fires the callbacks
 * the scenario asks for, and counts render, reset and remove calls in
 * `window.__ts`. The widget's own frame, the part a stub that only draws a
 * box would skip, is served from Cloudflare's host too and loaded under the
 * page's CSP ("the widget's frame" below). The server's check of the token
 * goes to the local siteverify double in CI (last case).
 *
 * There used to be one case against the real widget. It was the only test
 * here that could fail because of Cloudflare and not because of the page,
 * and what it alone proved — that Cloudflare's frame is allowed by the CSP —
 * is now proved without Cloudflare (frame-src is also held by
 * tests/unitaires/content-security-policy.test.ts). The real widget, with
 * the real key, is what staging runs.
 *
 * Nothing of Cloudflare's loads before a person uses the page (a pointer, a
 * key or a touch: person-input.ts), so each case clicks the e-mail field
 * first, as someone starting to fill the form; the first case checks the
 * page before that click.
 */

const API_JS = /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/;
const CLOUDFLARE = /challenges\.cloudflare\.com/;

type Scenario = "pass" | "error-once" | "expire" | "hang" | "frame";

interface StubLog {
  renders: number;
  removes: number;
  resets: number;
  options: Array<Record<string, unknown>>;
}

/** The suites' api.js double (support/external-doubles.ts). */
const STUB = TURNSTILE_SCRIPT_BODY;

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
 * (`next dev`: the forms render it only when NODE_ENV is production). On
 * /login, a person then clicks the e-mail field, which starts the captcha.
 */
async function open(
  page: Page,
  path: string,
  { asPerson = true }: { asPerson?: boolean } = {},
): Promise<void> {
  await page.goto(path, { waitUntil: "domcontentloaded" });

  if (path === "/login") await waitForHydration(page.getByLabel("Email"));
  else await waitForHydration(page.locator("form").first());

  if (path === "/login") {
    test.skip(
      (await captcha(page).count()) === 0,
      "o Turnstile só monta na build de produção (NODE_ENV=production)",
    );

    if (asPerson) await page.getByLabel("Email").click();
  }
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

/**
 * A visitor who has not used the page, as Lighthouse or a crawler is.
 * Playwright runs its own page scripts as a user gesture (its Chromium
 * driver evaluates with `userGesture: true`), so waiting for hydration
 * already marked the page as used and the captcha started at once. Pinned
 * here to "never used": only real input can start it, as for Lighthouse,
 * which evaluates without a gesture.
 */
async function asVisitorWhoHasNotActed(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "userActivation", {
      configurable: true,
      get: () => ({ hasBeenActive: false, isActive: false }),
    });
  });
}

test.describe("login: nothing of Cloudflare's before a person uses the page", () => {
  test.beforeEach(async ({ page }) => {
    await asVisitorWhoHasNotActed(page);
  });

  test("no request reaches challenges.cloudflare.com until a click; then the widget loads", async ({
    page,
  }) => {
    // What Lighthouse counted as third-party cookies (Best Practices 77 in a
    // browser holding cloudflare.com cookies) rode on these requests.
    const toCloudflare: string[] = [];

    page.on("request", (request) => {
      if (CLOUDFLARE.test(request.url())) toCloudflare.push(request.url());
    });

    await stubTurnstile(page, "pass");
    await open(page, "/login", { asPerson: false });

    // An audit or a crawler: the page loads and no one touches it.
    await page.waitForTimeout(3_000);

    expect(
      toCloudflare,
      "o captcha carregou sem ninguém usar a página",
    ).toEqual([]);
    await expect(captcha(page)).toHaveAttribute("data-captcha-state", "idle");
    // A still box that says what starts the check, not a load that never ends.
    await expect(page.locator("[data-captcha-idle]")).toBeVisible();
    await expect(page.locator("[data-captcha-idle]")).toContainText(
      "Começa quando você usar o formulário.",
    );
    await expect(page.locator("[data-captcha-skeleton]")).toHaveCount(0);
    await expect(captcha(page).locator("[aria-busy]")).toHaveCount(0);
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "começa quando você usar o formulário" }),
    ).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeDisabled();

    const idle = await captcha(page).boundingBox();

    await page.getByLabel("Email").click();

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "verified",
      { timeout: 15_000 },
    );
    expect(toCloudflare.some((url) => API_JS.test(url))).toBe(true);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();

    // The placeholder held the widget's place: nothing moved when it came.
    const verified = await captcha(page).boundingBox();

    expect(idle?.height).toBeGreaterThanOrEqual(65);
    expect(
      Math.abs((verified?.height ?? 0) - (idle?.height ?? 0)),
    ).toBeLessThan(1);
  });

  test("a pointer moving over the form starts it, so a filled-in form never waits on a dead button", async ({
    page,
  }) => {
    await stubTurnstile(page, "pass");
    await open(page, "/login", { asPerson: false });

    await expect(captcha(page)).toHaveAttribute("data-captcha-state", "idle");

    // Over the e-mail field, on the way to Entrar: no press, no key.
    const field = await page.getByLabel("Email").boundingBox();

    await page.mouse.move(field!.x + 10, field!.y + field!.height / 2, {
      steps: 4,
    });

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "verified",
      { timeout: 15_000 },
    );
    await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });
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

test.describe("login: the widget's frame (Cloudflare's host, under the page's CSP)", () => {
  test("loads, hands over the token and moves nothing", async ({ page }) => {
    // Every CSP refusal on the page, the frame's included.
    await page.addInitScript(() => {
      const seen: string[] = [];

      (window as unknown as { __csp: string[] }).__csp = seen;
      document.addEventListener(
        "securitypolicyviolation",
        (event) => {
          seen.push(`${event.violatedDirective} ${event.blockedURI}`);
        },
        true,
      );
    });

    const framed: string[] = [];

    page.on("requestfinished", (request) => {
      if (request.url().includes(TURNSTILE_FRAME_PREFIX))
        framed.push(request.url());
    });

    await stubTurnstile(page, "frame");
    await open(page, "/login");

    const before = await captcha(page).boundingBox();

    // The token only comes from inside the frame, so "verified" means the
    // frame was allowed, loaded and spoke to the page.
    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "verified",
      { timeout: 15_000 },
    );
    const after = await captcha(page).boundingBox();

    await expect(
      captcha(page).locator(
        'iframe[src^="https://challenges.cloudflare.com/"]',
      ),
    ).toHaveCount(1);
    expect(
      framed.length,
      "o frame do widget não foi carregado",
    ).toBeGreaterThanOrEqual(1);
    const refusedWidget = (
      await page.evaluate(
        () => (window as unknown as { __csp: string[] }).__csp,
      )
    ).filter(
      (violation) =>
        violation.startsWith("frame-src") ||
        violation.includes("challenges.cloudflare.com"),
    );

    expect(refusedWidget, "a CSP da página recusou algo do widget").toEqual([]);

    expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(
      1,
    );
    await expect(tokenField(page)).toHaveValue(TURNSTILE_DUMMY_TOKEN);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });
});

test.describe("login: the server checks the token", () => {
  test("a submitted login is checked with siteverify — the local double, never Cloudflare", async ({
    page,
  }) => {
    const siteverifyStats = async (): Promise<number> => {
      const response = await fetch(`http://127.0.0.1:${DOUBLES_PORT}/stats`);

      return ((await response.json()) as { verifications: number })
        .verifications;
    };

    await open(page, "/login");

    const before = await siteverifyStats();

    await expect(captcha(page)).toHaveAttribute(
      "data-captcha-state",
      "verified",
      { timeout: 15_000 },
    );

    // An address with no account: the answer is the same "credenciais
    // inválidas" as a wrong password, and no real account's lock counter
    // (ten failures an hour) is touched.
    await page.getByLabel("Email").fill(`ninguem.${Date.now()}@trajetto.test`);
    await page.getByLabel("Senha").fill("Senha-que-nao-existe-1");
    await page.getByRole("button", { name: "Entrar" }).click();

    const outcome = await Promise.race([
      page
        .getByText("Credenciais inválidas!")
        .waitFor({ timeout: 60_000 })
        .then(() => "asked-the-api" as const),
      page
        .getByText("Falha no desafio de segurança.")
        .waitFor({ timeout: 60_000 })
        .then(() => "captcha-refused" as const),
    ]).catch(() => "no-answer" as const);

    expect(
      outcome,
      "captcha-refused: o servidor recusou o token (o dublê do siteverify não " +
        "respondeu, ou o servidor da web está sem TURNSTILE_SITEVERIFY_URL " +
        "apontando para ele); no-answer: o formulário não respondeu em 60 s",
    ).toBe("asked-the-api");

    // The login only reached the API because the check passed; the double
    // counting it says the check was the local one.
    expect(
      await siteverifyStats(),
      "o servidor validou o token em outro lugar (Cloudflare?): configure " +
        `TURNSTILE_SITEVERIFY_URL=http://127.0.0.1:${DOUBLES_PORT}/turnstile/v0/siteverify no servidor da web`,
    ).toBeGreaterThan(before);
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
