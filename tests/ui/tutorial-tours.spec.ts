import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import {
  BASE,
  anyVehicle,
  createRoute,
  driverToken,
  managerForThisSpec,
  ownDelivery,
} from "./support/operation";

/**
 * The guided tours against the running stack (decisions 9.1–9.3).
 *
 * The unit suites prove the rules (placement, keys, anchors present in the
 * source). This file proves what only a browser can: on a real screen, at
 * the sizes people actually use, every step lands on something visible, the
 * spotlight is on it, and the card does not cover it.
 *
 * Unlike `open()` in support/operation, the session here does NOT suppress
 * the tours: a fresh browser context has never seen one, which is the whole
 * point. Same requirements as the other UI suites: API on 3334, Next on
 * 3100, the seeded load fixture.
 */

interface Viewport {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

/** 1366x768, and the same notebook with Windows at 125% (1093x614 CSS px). */
const DESKTOPS: Viewport[] = [
  { name: "1366x768", width: 1366, height: 768 },
  {
    name: "1366x768 at 125%",
    width: 1093,
    height: 614,
    deviceScaleFactor: 1.25,
  },
];

const PHONE = { width: 390, height: 844 };

/** Screens whose tours are walked step by step. */
const TOURS: string[] = [
  "/dashboard",
  "/dashboard/vehicle",
  "/dashboard/driver",
  "/dashboard/deliveries",
  "/dashboard/deliveries?tab=shippers",
  "/dashboard/routes",
  // Every view named: the bare Torre opens on the view this browser chose
  // last, which is not necessarily Rotas (its default).
  "/dashboard/control-tower?view=routes",
  "/dashboard/control-tower?view=panel",
  "/dashboard/control-tower?view=occurrences",
  "/dashboard/control-tower?view=tickets",
  "/dashboard/driver-pauses",
  "/dashboard/integrations?tab=api-keys",
  "/dashboard/integrations?tab=webhooks",
  "/dashboard/kanban",
  "/dashboard/activity",
];

/**
 * The MASTER minted for the browser suites. Read here rather than through
 * `openAsMaster`, which suppresses the tours on purpose.
 */
function masterToken(): string {
  const sessions = JSON.parse(
    readFileSync(
      "../trajetto-api/tests/load/fixtures/browser-sessions.json",
      "utf8",
    ),
  ) as { master: string };

  return sessions.master;
}

async function signInWithTours(
  page: Page,
  viewport: { width: number; height: number },
  token: string = managerForThisSpec(),
): Promise<void> {
  await page
    .context()
    .addCookies([
      { name: "tkey", value: token, domain: "localhost", path: "/" },
    ]);

  // Counts the Audio the TOUR builds: it must build none on a phone or with
  // reduced motion (decision 9.3). Only its own sounds (`*-tutorial.aac`): the
  // operations alert balloon preloads its chime for anyone who can use the
  // chat (decision 14.6), and counting that one failed this check on a tour
  // that built nothing.
  await page.addInitScript(() => {
    const RealAudio = window.Audio;
    const counter = window as unknown as { __tutorialAudios: number };

    counter.__tutorialAudios = 0;

    window.Audio = function Audio(this: unknown, src?: string) {
      if (src && /-tutorial\.[a-z0-9]+$/i.test(src))
        counter.__tutorialAudios += 1;

      return new RealAudio(src);
    } as unknown as typeof window.Audio;
  });

  await page.setViewportSize(viewport);
}

async function goto(page: Page, path: string): Promise<void> {
  await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });

  await expect(page.locator("main").first()).toBeVisible({ timeout: 60_000 });
  expect(page.url(), `caiu no login: ${path}`).not.toContain("/login");
  await expect(page.locator("[data-error-surface]")).toHaveCount(0);
}

const card = (page: Page) => page.locator("[data-tutorial-card]");

/** Opens the tour: it auto-starts on the first visit; `?` is the fallback. */
async function ensureTourOpen(page: Page): Promise<void> {
  try {
    await expect(card(page)).toHaveCount(1, { timeout: 8_000 });
  } catch {
    // Pressed until it opens, like the ⌘K specs: on a cold dev server the
    // page can be painted and idle while the "?" listener is still not bound
    // (hydration), and one press in that gap reads as a tour that never
    // opens. Thirty seconds of presses that open nothing is a real failure.
    await expect(async () => {
      // "?" is ignored while a field has focus; a click could hit a link.
      await page.evaluate(() =>
        (document.activeElement as HTMLElement | null)?.blur(),
      );
      if ((await card(page).count()) === 0) await page.keyboard.press("?");
      await expect(card(page)).toHaveCount(1, { timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
  }
}

interface StepState {
  status: string;
  anchor: string;
  placement: string;
  title: string;
  counter: string;
  card: Box;
  spotlight: Box | null;
  /** The anchor's first visible element, as the engine resolves it. */
  target: Box | null;
  viewport: { width: number; height: number };
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

async function readStep(page: Page): Promise<StepState> {
  return page.evaluate(() => {
    const toBox = (rect: DOMRect) => ({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });

    const element = document.querySelector<HTMLElement>("[data-tutorial-card]");

    // The tour ended (its last optional step dropped out): walkTour stops.
    if (!element) {
      const none = { top: 0, left: 0, width: 0, height: 0 };

      return {
        status: "gone",
        anchor: "",
        placement: "",
        title: "",
        counter: "",
        card: none,
        spotlight: null,
        target: null,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
    }

    const anchor = element.dataset.stepAnchor ?? "";
    let target: Box | null = null;

    if (anchor) {
      for (const candidate of Array.from(
        document.querySelectorAll(`[data-tutorial="${anchor}"]`),
      )) {
        const rect = candidate.getBoundingClientRect();
        const visible = (
          candidate as Element & {
            checkVisibility?: (options?: Record<string, boolean>) => boolean;
          }
        ).checkVisibility?.({ visibilityProperty: true });

        if (rect.width > 0 && rect.height > 0 && visible !== false) {
          target = toBox(rect);
          break;
        }
      }
    }

    const spotlight = document.querySelector("[data-tutorial-spotlight]");

    return {
      status: element.dataset.targetStatus ?? "",
      anchor,
      placement: element.dataset.placement ?? "",
      title: element.querySelector("h3")?.textContent ?? "",
      counter: element.querySelector("h3 + span")?.textContent ?? "",
      card: toBox(element.getBoundingClientRect()),
      spotlight: spotlight ? toBox(spotlight.getBoundingClientRect()) : null,
      target,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
}

/** Waits until the step is resolved, measured and shown. */
async function settledStep(page: Page): Promise<StepState> {
  await expect
    .poll(async () => (await readStep(page)).status, { timeout: 10_000 })
    .not.toBe("pending");

  const resolved = await readStep(page);

  if (resolved.status === "gone") return resolved;

  await expect(card(page)).toHaveClass(/\bvisible\b/, { timeout: 5_000 });

  // A found target gets its spotlight once measured; on a phone the drawer
  // is still sliding in when the card shows, and under a loaded dev server
  // that measurement lands a few frames later. Settled means drawn — and if
  // it never is, assertStep says so ("sem destaque").
  await expect
    .poll(
      async () => {
        const state = await readStep(page);

        return state.status !== "found" || state.spotlight !== null;
      },
      { timeout: 10_000 },
    )
    .toBe(true)
    .catch(() => undefined);

  /**
   * The step's own motion has ended. The engine reports a move done at 55% of
   * the flip (engine/stage.ts, FLIP_DONE_AT) so the new copy fades in while
   * the card settles; the last ~10% of the way is still travelling then. On a
   * loaded runner frames come late and that tail outlasted the 150 ms below:
   * a card still landing read as "o cartão pula". At rest the stage writes
   * the bare goal (`translate3d(…)`); mid-tween it appends a translate/scale.
   * A placement that flips by itself is still caught: it re-places the card
   * at rest, with no tween, and the 400 ms comparison below sees it move.
   */
  await expect
    .poll(
      () =>
        card(page).evaluate(
          (element) =>
            element.dataset.phase === "shown" &&
            !/\b(translate|translateY|scale)\(/.test(element.style.transform),
        ),
      { timeout: 10_000 },
    )
    .toBe(true)
    .catch(() => undefined);

  // One more frame of tracking after the reveal scroll.
  await page.waitForTimeout(150);

  const first = await readStep(page);

  // The card stays put: a placement that feeds back into itself (docked →
  // compact → a side fits → full → docked) flips on every frame.
  await page.waitForTimeout(400);

  const second = await readStep(page);

  if (second.counter === first.counter && second.status === first.status) {
    const where = `passo ${first.counter} "${first.title}"`;

    // Judged only while the target stands still. The dashboard's activity
    // feed and the tower are live, and the other workers write to the same
    // company, so a target can move or grow mid-step and carry the card with
    // it — that is the tracking working, not the flip-flop this guards
    // against (a placement that feeds back into itself moves the card while
    // NOTHING else moves).
    const still = (a: Box | null, b: Box | null) =>
      (a === null && b === null) ||
      (a !== null &&
        b !== null &&
        Math.abs(a.top - b.top) <= 1 &&
        Math.abs(a.left - b.left) <= 1 &&
        Math.abs(a.width - b.width) <= 1 &&
        Math.abs(a.height - b.height) <= 1);

    if (!still(first.spotlight, second.spotlight)) return second;

    expect(
      second.placement,
      `${where}: o cartão troca de posição sozinho`,
    ).toBe(first.placement);
    expect(
      Math.abs(second.card.top - first.card.top),
      `${where}: o cartão pula na vertical`,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(second.card.left - first.card.left),
      `${where}: o cartão pula na horizontal`,
    ).toBeLessThanOrEqual(1);
  }

  return second;
}

/** Waits until no loading skeleton is left (the Suspense content has streamed in). */
async function pageSettled(page: Page): Promise<void> {
  await expect(
    page.locator('main [data-tutorial="loading"], main [aria-busy="true"]'),
  ).toHaveCount(0, {
    timeout: 60_000,
  });
}

function overlap(a: Box, b: Box): number {
  const width =
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height =
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);

  return width > 0 && height > 0 ? width * height : 0;
}

function contains(outer: Box, inner: Box, tolerance = 2): boolean {
  return (
    inner.top >= outer.top - tolerance &&
    inner.left >= outer.left - tolerance &&
    inner.top + inner.height <= outer.top + outer.height + tolerance &&
    inner.left + inner.width <= outer.left + outer.width + tolerance
  );
}

/** The invariants every resolved step keeps, on any screen size. */
function assertStep(state: StepState, where: string): void {
  const label = `${where} — passo ${state.counter} "${state.title}" (${state.anchor || "centro"})`;

  // A required step that lost its anchor is the 15ce80b regression.
  expect(state.status, `${label}: âncora não encontrada`).not.toBe("missing");

  // The card itself never leaves the screen.
  expect(
    state.card.top,
    `${label}: cartão acima da tela`,
  ).toBeGreaterThanOrEqual(-1);
  expect(
    state.card.left,
    `${label}: cartão à esquerda da tela`,
  ).toBeGreaterThanOrEqual(-1);
  expect(
    state.card.top + state.card.height,
    `${label}: cartão abaixo da tela`,
  ).toBeLessThanOrEqual(state.viewport.height + 1);
  expect(
    state.card.left + state.card.width,
    `${label}: cartão à direita da tela`,
  ).toBeLessThanOrEqual(state.viewport.width + 1);

  if (state.status !== "found") return;

  expect(state.target, `${label}: alvo invisível`).not.toBeNull();
  expect(state.spotlight, `${label}: sem destaque`).not.toBeNull();

  const target = state.target as Box;
  const spotlight = state.spotlight as Box;

  // Scrolled into view: some of the target is on screen…
  expect(
    overlap(target, { top: 0, left: 0, ...state.viewport }),
    `${label}: alvo fora da tela`,
  ).toBeGreaterThan(0);

  // …and the spotlight sits on it (it is the target's visible part plus padding).
  const center = {
    top: spotlight.top + spotlight.height / 2,
    left: spotlight.left + spotlight.width / 2,
    width: 0,
    height: 0,
  };

  expect(contains(target, center, 12), `${label}: destaque fora do alvo`).toBe(
    true,
  );

  // The card does not cover what it explains, unless no side could fit it
  // and it docked compact in a corner (a target larger than the free space).
  //
  // A phone's bottom sheet has the same exception, in the engine's own terms
  // (computeSheetSide): when the target fits neither above nor below the
  // sheet — the open sidebar menu is taller than the screen minus the sheet —
  // the sheet stays at the bottom, where the thumb is, over part of it.
  const sheetHasCleanSide =
    spotlight.top + spotlight.height <=
      state.viewport.height - state.card.height - 8 ||
    spotlight.top >= state.card.height + 8;

  const mayCover =
    state.placement === "docked" ||
    (state.placement.startsWith("sheet-") && !sheetHasCleanSide);

  if (!mayCover) {
    expect(
      overlap(state.card, spotlight),
      `${label}: cartão cobre o alvo`,
    ).toBe(0);
  }
}

/** Walks the whole tour, checking every step; returns the anchors visited. */
async function walkTour(page: Page, where: string): Promise<StepState[]> {
  const visited: StepState[] = [];

  for (let guard = 0; guard < 40; guard++) {
    // The tour can end between the check below and this read: an optional
    // last step whose anchor never rendered leaves the walk.
    if ((await card(page).count()) === 0) break;

    const state = await settledStep(page);

    if (state.status === "gone") break;

    assertStep(state, where);
    visited.push(state);

    const [current, total] = state.counter.split(" de ").map(Number);

    if (current >= total) break;

    await card(page)
      .getByRole("button", { name: /Próximo/ })
      .click();

    // The total may shrink: an optional step whose anchor never rendered
    // leaves the tour when reached. Dropping the last one ends the tour.
    await expect
      .poll(
        async () =>
          (await card(page).count()) === 0 ||
          new RegExp(`^${current + 1} de \\d+$`).test(
            (await card(page).locator("h3 + span").textContent()) ?? "",
          ),
        { timeout: 15_000 },
      )
      .toBe(true);

    if ((await card(page).count()) === 0) break;
  }

  return visited;
}

test.describe.configure({ mode: "parallel" });

for (const viewport of DESKTOPS) {
  test.describe(`tours on a computer (${viewport.name})`, () => {
    test.use({ deviceScaleFactor: viewport.deviceScaleFactor ?? 1 });

    for (const path of TOURS) {
      test(`${path}: each step finds its target, highlights it and does not cover it`, async ({
        page,
      }) => {
        await signInWithTours(page, viewport);
        await goto(page, path);
        await ensureTourOpen(page);

        // Walked once the streamed content is in. The engine waits for an
        // anchor 1.5 s (6 s behind a loading skeleton) — plenty on a real
        // server; three workers on a dev server took longer, and a step
        // whose content was still on its way read as "âncora não encontrada".
        await pageSettled(page);

        const visited = await walkTour(page, `${path} @ ${viewport.name}`);

        expect(visited.length).toBeGreaterThan(1);
      });
    }
  });
}

test.describe("table: row with actions and empty table (decision 9.1)", () => {
  test("with records, the actions step scrolls to the ⋮ of the first row", async ({
    page,
  }) => {
    await signInWithTours(page, DESKTOPS[0]);
    await goto(page, "/dashboard/vehicle");
    await ensureTourOpen(page);

    const visited = await walkTour(page, "/dashboard/vehicle");
    const actions = visited.find((step) => step.anchor === "row-actions");

    expect(actions, "o passo de ações não chegou ao ⋮ da linha").toBeDefined();
    expect(actions?.status).toBe("found");
  });

  test("without records, the actions step explains the empty table", async ({
    page,
  }) => {
    await signInWithTours(page, DESKTOPS[0]);
    await goto(page, "/dashboard/vehicle?search=zz-tutorial-sem-resultado-zz");
    await ensureTourOpen(page);

    const visited = await walkTour(page, "/dashboard/vehicle vazia");

    expect(visited.some((step) => step.anchor === "row-actions")).toBe(false);

    const empty = visited.find((step) => step.anchor === "table-empty");

    expect(empty, "a variante de tabela vazia não apareceu").toBeDefined();
    expect(empty?.status).toBe("found");
  });
});

test.describe("tab in the URL and route page", () => {
  test("?view=occurrences opens the Ocorrências tour, not the Torre's default one", async ({
    page,
  }) => {
    await signInWithTours(page, DESKTOPS[0]);
    await goto(page, "/dashboard/control-tower?view=occurrences");
    await ensureTourOpen(page);

    await settledStep(page);
    await card(page)
      .getByRole("button", { name: /Próximo/ })
      .click();

    await expect(card(page).locator("h3")).toContainText("Ocorrências", {
      timeout: 10_000,
    });
  });

  test("a route's page has its own tour", async ({ page }) => {
    const vehicleId = await anyVehicle();
    const deliveryId = await ownDelivery(`Tutorial ${Date.now()}`);
    const route = await createRoute(
      [deliveryId],
      vehicleId,
      `Rota do tutorial ${Date.now()}`,
    );

    await signInWithTours(page, DESKTOPS[1]);
    await goto(page, `/dashboard/routes/${route.id}`);
    await ensureTourOpen(page);

    const visited = await walkTour(page, "/dashboard/routes/:routeId");

    expect(visited.map((step) => step.anchor)).toEqual(
      expect.arrayContaining(["route-header", "route-stops", "route-map"]),
    );
  });
});

test.describe("page state and 'já visto'", () => {
  test("the page leaves the tour with the inline styles it had", async ({
    page,
  }) => {
    await signInWithTours(page, DESKTOPS[0]);
    await goto(page, "/dashboard");

    const snapshot = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll("[data-tutorial]"))
          .filter((element) => !element.closest("[data-tutorial-overlay]"))
          .map(
            (element) =>
              `${element.getAttribute("data-tutorial")}|${
                // Radix Presence writes `animation-duration: 0s` on a tab
                // panel's first mount and drops it on the next render: a
                // transient of the page's own, present or not depending on
                // when the snapshot lands, and never the tour's.
                (element.getAttribute("style") ?? "")
                  // React re-serializes a server-rendered style ("outline:none"
                  // becomes "outline: none;"): compare declarations, not text.
                  .split(";")
                  .map((declaration) =>
                    declaration.trim().replace(/\s*:\s*/, ":"),
                  )
                  .filter(
                    (declaration) =>
                      declaration && declaration !== "animation-duration:0s",
                  )
                  .join(";")
              }|${element.className}`,
          ),
      );

    // Taken once the streamed content has settled — classes still change
    // while Suspense swaps skeletons for content. The tour may be open by
    // then; it writes nothing on the page, which is the point.
    await pageSettled(page);
    const before = await snapshot();

    await ensureTourOpen(page);
    await walkTour(page, "/dashboard");

    // walkTour stops ON the last step; finishing is the person's click.
    await card(page).getByRole("button", { name: "Concluir" }).click();
    await expect(card(page)).toHaveCount(0, { timeout: 10_000 });

    expect(await snapshot()).toEqual(before);
  });

  test("once finished, the tour does not reopen on its own and stays marked per user (v2)", async ({
    page,
  }) => {
    await signInWithTours(page, DESKTOPS[0]);
    await goto(page, "/dashboard/branch");
    await ensureTourOpen(page);

    await page.keyboard.press("Escape");
    await expect(card(page)).toHaveCount(0, { timeout: 10_000 });

    const keys = await page.evaluate(() => Object.keys(window.localStorage));

    expect(
      keys.some((key) => /^tutorial_v2:[^:]+:\/dashboard\/branch$/.test(key)),
    ).toBe(true);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("main").first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(2_500);

    await expect(card(page)).toHaveCount(0);
  });

  test("with reduced motion, no sound is loaded", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signInWithTours(page, DESKTOPS[0]);
    await goto(page, "/dashboard/supplier");
    await ensureTourOpen(page);

    await settledStep(page);
    await card(page)
      .getByRole("button", { name: /Próximo/ })
      .click();
    await settledStep(page);

    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __tutorialAudios: number }).__tutorialAudios,
      ),
    ).toBe(0);
  });
});

test.describe("back office and driver (decisions 9.2 and 9.3)", () => {
  test("/admin does not open on its own; '?' opens the tour with the company selector right at the start", async ({
    page,
  }) => {
    await signInWithTours(page, DESKTOPS[0], masterToken());
    await goto(page, "/admin/vehicle");
    await pageSettled(page);

    // On demand only: nothing opens by itself, even on a first visit.
    await page.waitForTimeout(3_000);
    await expect(card(page)).toHaveCount(0);

    // "?" pressed until it opens (as in ensureTourOpen): a single press
    // before /admin hydrated its listener opened nothing under three workers.
    await expect(async () => {
      await page.evaluate(() =>
        (document.activeElement as HTMLElement | null)?.blur(),
      );
      if ((await card(page).count()) === 0) await page.keyboard.press("?");
      await expect(card(page)).toHaveCount(1, { timeout: 3_000 });
    }).toPass({ timeout: 30_000 });

    const visited = await walkTour(page, "/admin/vehicle");
    const selectorIndex = visited.findIndex(
      (step) => step.anchor === "business-selector",
    );

    // Intro, welcome, then the selector — before anything that depends on it.
    expect(
      selectorIndex,
      "o passo do seletor de empresa não aconteceu",
    ).toBeGreaterThanOrEqual(0);
    expect(selectorIndex).toBeLessThanOrEqual(2);
    expect(visited[selectorIndex].status).toBe("found");
  });

  test("/driver has its own tour, which opens on its own on a computer", async ({
    page,
  }) => {
    await signInWithTours(page, DESKTOPS[1], driverToken());
    await goto(page, "/driver/vehicles");
    await ensureTourOpen(page);

    const visited = await walkTour(page, "/driver/vehicles @ 125%");

    expect(visited.length).toBeGreaterThan(1);
  });
});

test.describe("phone 390x844 (decision 9.3)", () => {
  test.use({ isMobile: true, hasTouch: true });

  test("/dashboard opens on its own as a bottom sheet and opens the sidebar on the menu step", async ({
    page,
  }) => {
    await signInWithTours(page, PHONE);
    await goto(page, "/dashboard");

    await expect(card(page)).toHaveCount(1, { timeout: 10_000 });

    const visited = await walkTour(page, "/dashboard @ celular");

    for (const step of visited) {
      expect(step.placement, `passo "${step.title}" não é sheet`).toMatch(
        /^sheet-/,
      );
      expect(Math.round(step.card.width)).toBe(PHONE.width);
      expect(step.card.height).toBeLessThanOrEqual(PHONE.height * 0.45 + 2);
    }

    const menu = visited.find((step) => step.anchor === "sidebar-menu");

    expect(menu, "o passo do menu não aconteceu").toBeDefined();
    expect(menu?.status, "a sidebar não abriu para o passo do menu").toBe(
      "found",
    );

    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __tutorialAudios: number }).__tutorialAudios,
      ),
    ).toBe(0);
  });

  test("other screens do not open the tour on their own on a phone", async ({
    page,
  }) => {
    await signInWithTours(page, PHONE);
    await goto(page, "/dashboard/vehicle");

    await page.waitForTimeout(3_000);

    await expect(card(page)).toHaveCount(0);
  });
});
