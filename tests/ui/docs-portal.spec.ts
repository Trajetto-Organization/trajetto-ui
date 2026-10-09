import { test, expect, type Page } from "@playwright/test";

import {
  DOCS_CONSOLE_PATH,
  DOCS_REFERENCE_PATH,
  DOCS_SECTIONS,
  hrefOf,
} from "../../src/app/docs/_lib/navigation";

/**
 * The public developer portal (/docs), in a real browser, against the API.
 *
 * The unit suites render the guides and the reference from a copy of the
 * public document. What only a browser against the running stack shows: the
 * guides reach the production server (they are read from disk at request
 * time, so a build that does not trace them serves nothing), the reference is
 * built from the document the API serves right now, the copy buttons really
 * copy, the pages fit a phone, and the console link lands on the API.
 *
 * No session: the portal is public. Same requirements as the rest of
 * tests/ui (API on 3334, this app on 3100).
 */
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";
const API = process.env.LOAD_BASE_URL ?? "http://localhost:3334";

/** Every page of the menu; the console is a redirect, checked on its own. */
const PAGES = DOCS_SECTIONS.flatMap((section) => section.items)
  .filter((item) => item.kind !== "console")
  .map((item) => hrefOf(item));

async function open(
  page: Page,
  path: string,
  width = 1440,
): Promise<number | undefined> {
  await page.setViewportSize({ width, height: 900 });

  const response = await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  return response?.status();
}

test.describe("the developer portal", () => {
  for (const path of PAGES) {
    test(`${path} opens for a visitor, with the API's numbers`, async ({
      page,
    }) => {
      const errors: string[] = [];

      page.on("pageerror", (error) => errors.push(error.message));

      expect(await open(page, path)).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Documentação", exact: true }),
      ).toBeVisible();

      // With the API up, no view falls back to its "unavailable" notice.
      await expect(page.getByText("não respondeu agora")).toHaveCount(0);
      await expect(page.getByText("Referência indisponível agora")).toHaveCount(
        0,
      );

      expect(errors).toEqual([]);
    });
  }

  for (const width of [320, 390, 768, 1024, 1440]) {
    test(`fits ${width}px without horizontal scroll`, async ({ page }) => {
      for (const path of ["/docs", "/docs/assinatura", DOCS_REFERENCE_PATH]) {
        expect(await open(page, path, width)).toBe(200);

        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );

        expect(overflow, path).toBeLessThanOrEqual(0);
      }
    });
  }

  test("an unknown guide is a real 404", async ({ page }) => {
    expect(await open(page, "/docs/guia-que-nao-existe")).toBe(404);
  });

  test("the copy button copies the sample it sits on", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: BASE,
    });

    expect(await open(page, "/docs/assinatura")).toBe(200);

    const frame = page
      .locator("figure")
      .filter({ hasText: "function verifyTrajetto" })
      .first();
    const code = (await frame.locator("pre code").innerText()).trim();

    // The guide is server-rendered: a click that lands before React hydrates
    // the button does nothing (the dev server hydrates seconds after paint).
    // Clicking again until it answers measures the button, not the race.
    await expect(async () => {
      await frame.getByRole("button", { name: /^Copiar código/ }).click();
      await expect(frame.getByText("Copiado", { exact: true })).toBeVisible({
        timeout: 1_500,
      });
    }).toPass({ timeout: 30_000 });
    // Windows' clipboard stores line breaks as CRLF; the text is the same.
    const copied = await page.evaluate(() => navigator.clipboard.readText());

    expect(copied.replace(/\r\n/g, "\n").trim()).toBe(code);
  });
});

test.describe("the portal's header and pager (site standard)", () => {
  for (const width of [1440, 1024]) {
    test(`shows the full navigation and the theme icon at ${width}px`, async ({
      page,
    }) => {
      expect(await open(page, "/docs/erros", width)).toBe(200);

      const nav = page.getByRole("navigation", {
        name: "Seções da documentação",
      });

      await expect(nav.getByRole("link", { name: "Guias" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Referência" })).toBeVisible();
      await expect(
        nav.getByRole("link", { name: /Console interativo/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /menu da documentação/ }),
      ).toBeHidden();
      // The sections column is there too.
      await expect(
        page.getByRole("complementary", { name: "Menu da documentação" }),
      ).toBeVisible();

      // The theme icon flips the class next-themes keeps on <html>.
      const toggle = page.getByRole("button", { name: /^Alternar para tema/ });
      const before = await page.evaluate(() =>
        document.documentElement.classList.contains("dark"),
      );

      await toggle.click();
      await expect
        .poll(() =>
          page.evaluate(() =>
            document.documentElement.classList.contains("dark"),
          ),
        )
        .toBe(!before);
    });
  }

  for (const width of [768, 390, 320]) {
    test(`collapses into a menu with every section at ${width}px`, async ({
      page,
    }) => {
      expect(await open(page, "/docs/erros", width)).toBe(200);

      await expect(
        page.getByRole("navigation", { name: "Seções da documentação" }),
      ).toBeHidden();

      const button = page.getByRole("button", {
        name: "Abrir menu da documentação",
      });

      // Server-rendered: retry the click until React has hydrated the button.
      await expect(async () => {
        await button.click();
        await expect(
          page.getByRole("button", { name: "Fechar menu da documentação" }),
        ).toBeVisible({
          timeout: 1_500,
        });
      }).toPass({ timeout: 30_000 });

      const toggle = page.getByRole("button", {
        name: "Fechar menu da documentação",
      });

      await expect(toggle).toHaveAttribute("aria-expanded", "true");

      const sections = page.getByRole("navigation", {
        name: "Documentação",
        exact: true,
      });

      await expect(
        sections.getByRole("link", { name: "Referência da API" }),
      ).toBeAttached();
      await expect(sections.getByRole("link", { name: "Erros" })).toBeFocused();
      await expect(
        page.getByRole("radiogroup", { name: "Tema" }),
      ).toBeAttached();
      expect(
        await page.evaluate(() => document.documentElement.style.overflow),
      ).toBe("hidden");

      // Nothing sticks out sideways with the panel open either.
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );

      expect(overflow).toBeLessThanOrEqual(0);

      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Abrir menu da documentação" }),
      ).toBeFocused();
      await expect(sections).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.style.overflow),
      ).toBe("");
    });
  }

  test("the pager's arrow slides on hover, like the site's cards", async ({
    page,
  }) => {
    expect(await open(page, "/docs/erros")).toBe(200);

    const next = page.locator('a[data-pager="next"]');
    const arrow = next.locator("svg");

    await expect(next).toContainText("Próximo");
    await expect(next).toContainText("Limites de uso");
    await expect(page.locator('a[data-pager="previous"]')).toContainText(
      "Idempotência",
    );

    const offsetX = () =>
      arrow.evaluate(
        (element) =>
          new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
      );

    expect(await offsetX()).toBe(0);
    await next.hover();
    await expect.poll(offsetX).toBeCloseTo(4, 0);
  });
});

test.describe("the reference", () => {
  test("shows every operation of the document the API serves now", async ({
    page,
    request,
  }) => {
    const document = await (
      await request.get(`${API}/integration/docs/openapi.json`)
    ).json();

    expect(await open(page, DOCS_REFERENCE_PATH)).toBe(200);

    const summaries = Object.values(
      document.paths as Record<string, Record<string, any>>,
    )
      .flatMap((item) => Object.values(item))
      .map((operation) => operation.summary as string)
      .filter(Boolean);

    expect(summaries.length).toBeGreaterThan(5);

    for (const summary of summaries) {
      await expect(
        page.getByText(summary, { exact: true }).first(),
        summary,
      ).toBeAttached();
    }

    // A write's curl keeps one Idempotency-Key per document across pastes.
    await expect(
      page.getByText('IDEMPOTENCY_KEY="pedido-10452"').first(),
    ).toBeAttached();
  });

  test("links the interactive console on the API", async ({ request }) => {
    const redirect = await request.get(`${BASE}${DOCS_CONSOLE_PATH}`, {
      maxRedirects: 0,
    });

    expect(redirect.status()).toBe(307);
    expect(redirect.headers().location).toBe(`${API}/integration/docs`);

    const console = await request.get(`${API}/integration/docs`);
    const html = await console.text();

    expect(console.status()).toBe(200);
    // The pinned Scalar build, integrity-checked, configured in Portuguese.
    expect(html).toMatch(
      /<script[^>]+integrity="sha384-[^"]+"[^>]+crossorigin/,
    );
    expect(html).toContain("data-configuration");
  });
});
