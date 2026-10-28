import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { BASE, signedInContext, type Who } from "./support/login";
import { paletteSearch } from "./support/palette";

/**
 * What each kind of person is offered, signed in through the form.
 *
 * `permission-surfaces.spec.ts` compares a manager and a driver with minted
 * cookies. This file covers the rest of decision 13.3: an employee with a full
 * profile, one who may only READ deliveries, and two companies that hired one
 * module each. Same three surfaces — sidebar, ⌘K, URL — plus the write button
 * a read-only person must not be able to use.
 *
 * Every absence has a presence beside it in the same session: an absence
 * passes beautifully on a page that rendered nothing at all.
 */

// Every login here goes through the form, and the API allows eight a minute
// per address: a test may wait out the window once or twice (support/login).
test.setTimeout(300_000);

interface Expectation {
  who: Who;
  /** Top-level sidebar links (always visible, never inside a collapsed group). */
  sidebar: { present: string[]; absent: string[] };
  /** Pages searched by name in ⌘K. */
  palette: { present: string[]; absent: string[] };
  /** Pages typed in the URL bar that must NOT open. */
  closed: string[];
  /** And one that must, so the closed ones are not just a broken session. */
  open: string;
  /**
   * The tab strips, exactly and in order: /dashboard's (by role),
   * /dashboard/deliveries' and the Torre's views (by permission; null where
   * the page is closed).
   */
  tabs: {
    dashboard: string[];
    deliveries: string[] | null;
    tower: string[] | null;
  };
}

// The registrations only since the meeting of 14/10/2026: the operation's
// sections are views of the Torre de controle.
const ALL_DELIVERY_TABS = [
  "Entregas",
  "Embarcadores",
  "Importações",
  "Tipos de Ocorrência",
  "Motivos de Status",
  "Mensagens ao Cliente",
];

// The map panel that was the whole Torre before (Painel) and the four
// sections that left Entregas (Monitoramento is Rotas now), in display order.
const ALL_TOWER_VIEWS = [
  "Rotas",
  "Painel",
  "Ocorrências",
  "Atendimentos",
  "Auditoria",
];

// "Análise Gráfica" and "Limites de Uso" are the administrator's; an
// employee's dashboard has the overview only, whatever the profile.
const ADMIN_DASHBOARD_TABS = [
  "Visão geral",
  "Análise Gráfica",
  "Limites de Uso",
];
const USER_DASHBOARD_TABS = ["Visão geral"];

const DELIVERY_PAGES = ["Entregas", "Rotas", "Torre de Controle"];

const CASES: Expectation[] = [
  {
    who: "fullUser",
    sidebar: {
      present: [...DELIVERY_PAGES, "Multas", "Integrações"],
      absent: [],
    },
    palette: {
      present: [
        "Entregas",
        "Multas",
        "Contas a pagar",
        "Cadastro de abastecimento",
      ],
      absent: [],
    },
    closed: [
      // BUSINESS_ADMIN only, whatever the profile says.
      "/dashboard/activity",
    ],
    open: "/dashboard/fine",
    tabs: {
      dashboard: USER_DASHBOARD_TABS,
      deliveries: ALL_DELIVERY_TABS,
      tower: ALL_TOWER_VIEWS,
    },
  },
  {
    who: "readOnlyUser",
    sidebar: {
      present: DELIVERY_PAGES,
      absent: ["Multas", "Integrações"],
    },
    palette: {
      present: ["Entregas", "Rotas"],
      absent: [
        "Multas",
        "Contas a pagar",
        "Cadastro de abastecimento",
        "Integrações",
      ],
    },
    closed: [
      "/dashboard/fine",
      "/dashboard/fuel",
      "/dashboard/integrations",
      "/dashboard/driver",
    ],
    open: "/dashboard/deliveries",
    tabs: {
      dashboard: USER_DASHBOARD_TABS,
      deliveries: ALL_DELIVERY_TABS,
      tower: ALL_TOWER_VIEWS,
    },
  },
  {
    who: "fleetOnlyAdmin",
    sidebar: {
      present: ["Multas"],
      absent: [...DELIVERY_PAGES, "Integrações", "Pausas dos motoristas"],
    },
    palette: {
      present: ["Multas", "Cadastro de abastecimento"],
      absent: ["Entregas", "Rotas", "Torre de Controle"],
    },
    closed: [
      "/dashboard/deliveries",
      "/dashboard/routes",
      "/dashboard/control-tower",
      "/dashboard/integrations",
    ],
    open: "/dashboard/fuel",
    tabs: { dashboard: ADMIN_DASHBOARD_TABS, deliveries: null, tower: null },
  },
  {
    who: "deliveriesOnlyAdmin",
    sidebar: {
      present: [...DELIVERY_PAGES, "Integrações"],
      absent: ["Multas"],
    },
    palette: {
      present: ["Entregas", "Torre de Controle"],
      absent: ["Multas", "Cadastro de abastecimento", "Contas a pagar"],
    },
    closed: [
      "/dashboard/fine",
      "/dashboard/fuel",
      "/dashboard/account-payable",
      "/dashboard/service-order",
    ],
    open: "/dashboard/routes",
    tabs: {
      dashboard: ADMIN_DASHBOARD_TABS,
      deliveries: ALL_DELIVERY_TABS,
      tower: ALL_TOWER_VIEWS,
    },
  },
];

async function noErrorSurface(page: Page, path: string): Promise<void> {
  await expect(
    page.locator("[data-error-surface]"),
    `a tela caiu no limite de erro: ${path}`,
  ).toHaveCount(0);
}

for (const expectation of CASES) {
  test.describe(`${expectation.who}`, () => {
    // One form login per person for the whole describe: the API allows eight
    // logins a minute from one address, and the session is what is under test.
    test.describe.configure({ mode: "serial" });

    let context: BrowserContext;
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      ({ context, page } = await signedInContext(browser, expectation.who));
    });

    test.afterAll(async () => {
      await context?.close();
    });

    test("the sidebar offers what the person can open, and only that", async () => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
      await noErrorSurface(page, "/dashboard");

      for (const name of expectation.sidebar.present) {
        await expect(
          page.getByRole("link", { name, exact: true }).first(),
          `${name} deveria estar na sidebar de ${expectation.who}`,
        ).toBeVisible({ timeout: 60_000 });
      }

      for (const name of expectation.sidebar.absent) {
        await expect(
          page.getByRole("link", { name, exact: true }),
          `${name} está na sidebar de ${expectation.who}`,
        ).toHaveCount(0);
      }
    });

    test("⌘K offers the same", async () => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });

      for (const name of expectation.palette.present) {
        const found = await paletteSearch(page, name);

        expect(
          found.some((entry) => entry.includes(name)),
          `${name} não aparece no ⌘K de ${expectation.who} — oferecido: ${found.join(" | ")}`,
        ).toBe(true);
      }

      for (const name of expectation.palette.absent) {
        const found = await paletteSearch(page, name);

        expect(
          found.some((entry) => entry === name || entry.startsWith(`${name} `)),
          `${name} é oferecido no ⌘K de ${expectation.who} — oferecido: ${found.join(" | ")}`,
        ).toBe(false);
      }
    });

    test("the tabs show what the role and the profile read", async () => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
      await noErrorSurface(page, "/dashboard");

      const dashboardTabs = page.locator(
        '[data-tutorial="dashboard-tabs"] [role="tab"]',
      );

      await expect(dashboardTabs.first()).toBeVisible({ timeout: 60_000 });
      await expect(
        dashboardTabs,
        `abas do /dashboard de ${expectation.who}`,
      ).toHaveText(expectation.tabs.dashboard);

      if (!expectation.tabs.deliveries) return;

      await page.goto(`${BASE}/dashboard/deliveries`, {
        waitUntil: "domcontentloaded",
      });
      await noErrorSurface(page, "/dashboard/deliveries");

      // The desk strip (the phone menu is the other nav with the same name).
      const deliveryTabs = page.locator(
        'nav[aria-label="Seções de entregas"]:has(ul) li a > span:first-of-type',
      );

      await expect(deliveryTabs.first()).toBeVisible({ timeout: 60_000 });
      await expect(
        deliveryTabs,
        `abas de Entregas de ${expectation.who}`,
      ).toHaveText(expectation.tabs.deliveries);

      if (!expectation.tabs.tower) return;

      // The view named in the URL: the bare Torre may replace itself with
      // the view this browser chose last, mid-check.
      await page.goto(`${BASE}/dashboard/control-tower?view=routes`, {
        waitUntil: "domcontentloaded",
      });
      await noErrorSurface(page, "/dashboard/control-tower");

      // The desk strip again; the label's span, not the tickets' badge.
      const towerViews = page.locator(
        'nav[aria-label="Visões da torre de controle"]:has(ul) li a > span:first-of-type',
      );

      await expect(towerViews.first()).toBeVisible({ timeout: 60_000 });
      await expect(
        towerViews,
        `visões da Torre de ${expectation.who}`,
      ).toHaveText(expectation.tabs.tower);
    });

    test("typing the URL does not open what was not offered", async () => {
      await page.goto(`${BASE}${expectation.open}`, {
        waitUntil: "domcontentloaded",
      });
      await expect(
        page,
        `${expectation.who} não abre ${expectation.open}`,
      ).toHaveURL(new RegExp(expectation.open.replace(/\//g, "\\/")), {
        timeout: 60_000,
      });
      await noErrorSurface(page, expectation.open);

      for (const path of expectation.closed) {
        await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });

        await expect
          .poll(() => new URL(page.url()).pathname, {
            message: `${expectation.who} abriu ${path} digitando a URL`,
            timeout: 60_000,
          })
          .not.toBe(path);

        // Bounced home, not logged out: the session is fine, the page is not theirs.
        expect(
          page.url(),
          `${expectation.who} perdeu a sessão em ${path}`,
        ).not.toContain("/login");
      }
    });
  });
}

test.describe("the write button for a read-only person", () => {
  test.describe.configure({ mode: "serial" });

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ({ context, page } = await signedInContext(browser, "readOnlyUser"));
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("Importar exists for everyone and only works for whoever writes", async ({
    browser,
  }) => {
    await page.goto(`${BASE}/dashboard/deliveries`, {
      waitUntil: "domcontentloaded",
    });
    await noErrorSurface(page, "/dashboard/deliveries");

    const readOnlyImport = page.getByRole("button", { name: "Importar" });

    await expect(readOnlyImport).toBeVisible({ timeout: 60_000 });
    await expect(
      readOnlyImport,
      "quem só lê consegue importar entregas",
    ).toBeDisabled();

    // The same button, enabled, for somebody who may write — or the
    // disabled state above could be the button being broken for everyone.
    const writer = await signedInContext(browser, "fullUser");

    await writer.page.goto(`${BASE}/dashboard/deliveries`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      writer.page.getByRole("button", { name: "Importar" }),
    ).toBeEnabled({
      timeout: 60_000,
    });

    await writer.context.close();
  });
});
