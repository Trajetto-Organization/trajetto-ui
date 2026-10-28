import { expect, test, type Page, type Request } from "@playwright/test";

import { api, ndjson, open } from "./support/operation";

/**
 * What a filter tick costs, counted on the wire (spec §13).
 *
 * A small catalog whose whole set is on screen answers the tick in the
 * browser: the URL moves (so reload, a shared link and Back give the same
 * answer from the server) and nothing is requested — no server render, no
 * relay read. A big list still asks the server, once per tick.
 *
 * Needs the stack of tests/ui/README.md (API on 3334, Next on 3100).
 */

/**
 * What a table tick could cost: a server render (navigation, refresh or
 * prefetch, or a full document) or a relay read of the screen's own list.
 * The shell's background reads (tickets summary, notification preferences)
 * run on their own schedule and are not the table's.
 */
const LIST_RELAYS = /\/api\/relay\/(occurrence-type|vehicle)\//;

function isListRequest(request: Request): boolean {
  const url = request.url();
  const headers = request.headers();

  return (
    headers["rsc"] === "1" ||
    url.includes("_rsc=") ||
    LIST_RELAYS.test(url) ||
    (request.resourceType() === "document" && !url.includes("/socket.io/"))
  );
}

/**
 * Rebuilds announced by the dev server's HMR socket. A file saved while a
 * spec counts (another session editing the repository) makes Next re-render
 * the page from the server, a request no click asked for; such a window is
 * measured again rather than blamed on the table.
 */
function watchRebuilds(page: Page) {
  const state = { rebuilds: 0 };

  page.on("websocket", (socket) => {
    if (!socket.url().includes("webpack-hmr")) return;

    socket.on("framereceived", (frame) => {
      if (/"(building|serverComponentChanges)"/.test(String(frame.payload))) {
        state.rebuilds += 1;
      }
    });
  });

  return state;
}

/**
 * Opens the screen and runs `measure`, again (up to three times) when the
 * dev server rebuilt in the middle. Returns the list requests it counted.
 */
async function measured(
  page: Page,
  path: string,
  measure: (seen: string[]) => Promise<void>,
): Promise<string[]> {
  const hmr = watchRebuilds(page);

  for (let attempt = 1; ; attempt += 1) {
    await open(page, path);

    const seen: string[] = [];
    const onRequest = (request: Request) => {
      if (isListRequest(request)) seen.push(request.url());
    };
    const rebuildsBefore = hmr.rebuilds;

    page.on("request", onRequest);
    await measure(seen);
    page.off("request", onRequest);

    if (hmr.rebuilds === rebuildsBefore || attempt === 3) return seen;
  }
}

async function tick(page: Page, filter: string, choice: string) {
  const trigger = page
    .getByRole("button", { name: new RegExp(`^${filter}`) })
    .first();

  // A click before hydration focuses the button and opens nothing.
  await expect(async () => {
    await trigger.click();
    await expect(page.getByRole("option").first()).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 60_000 });

  await page.getByRole("option", { name: new RegExp(`^${choice}`) }).click();
  // Closing the popover is "done": a server table sends what was ticked.
  await page.keyboard.press("Escape");
}

test("a complete catalog answers a filter tick with no request at all", async ({
  page,
}) => {
  const listing = await api(
    "/occurrence-type/list-occurrence-type?page=1&pageSize=1",
  );
  const meta = ndjson(await listing.text()).find((line) => "meta" in line)
    ?.meta as { total: number } | undefined;

  test.skip(
    !meta || meta.total > 100,
    "a catalogue above 100 types is answered on the server",
  );

  const ticked = await measured(
    page,
    "/dashboard/deliveries?tab=occurrence-types",
    async () => {
      await tick(page, "Status", "Inativo");

      await expect(page).toHaveURL(/status=inactive/);
      // Every row left on screen is an inactive type.
      for (const row of await page
        .locator('[data-tutorial="data-table"] tbody tr')
        .allTextContents()) {
        expect(row).not.toMatch(/\bAtivo\b/);
      }

      // Anything late would show up in this window.
      await page.waitForTimeout(1500);
    },
  );

  expect(ticked, "pedidos ao marcar um filtro local").toEqual([]);

  // Back, still in the browser: the URL follows, nothing is asked.
  const back: string[] = [];
  const onRequest = (request: Request) => {
    if (isListRequest(request)) back.push(request.url());
  };

  page.on("request", onRequest);
  await page.goBack();
  await expect(page).not.toHaveURL(/status=inactive/);
  await page.waitForTimeout(1000);
  page.off("request", onRequest);

  expect(back, "pedidos ao voltar").toEqual([]);
});

test("a big list asks the server once per filter tick", async ({ page }) => {
  const seen = await measured(page, "/dashboard/vehicle", async () => {
    await tick(page, "Status", "Inativo");

    // A server render on the dev server can take a while under load.
    await expect(page).toHaveURL(/status=INACTIVE/, { timeout: 60_000 });
    await expect(page.locator("[data-table-busy]")).toHaveCount(0, {
      timeout: 60_000,
    });
    await page.waitForTimeout(1500);
  });

  const navigations = seen.filter((url) =>
    new URL(url).pathname.startsWith("/dashboard/vehicle"),
  );

  expect(navigations, "uma navegação por filtro no servidor").toHaveLength(1);
  expect(navigations[0]).toContain("status=INACTIVE");
});
