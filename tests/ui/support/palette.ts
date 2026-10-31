import { expect, type Page } from "@playwright/test";

/*
  The command palette (⌘K), shared by the permission and module specs.
*/

/**
 * Opens the command palette.
 *
 * The shortcut is pressed more than once on purpose. The palette's shell binds
 * its listener during hydration (kbar itself is imported later, when the
 * browser is idle or on the first press, and a press made while it loads
 * opens it once it lands), and against a dev server under three parallel
 * workers the page can be painted, answered and idle on the network while that
 * listener is still not there — so a single press lands in the gap and the
 * palette never opens. It failed about one run in six, which is the worst rate there is: too
 * rare to chase, often enough to teach people to re-run the suite.
 *
 * Pressing again is also what a person does when a shortcut does nothing, and
 * it cannot hide a real failure: the palette not opening after eight attempts
 * across sixteen seconds is the palette not opening.
 */
async function openPalette(page: Page) {
  // kbar's portal does not forward data attributes; its ARIA roles are stable.
  const palette = page.locator('[role="dialog"], [role="listbox"]').first();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.keyboard.press("Control+k");

    try {
      await expect(palette).toBeVisible({ timeout: 2_000 });
      break;
    } catch {
      // Still hydrating. Press again.
    }
  }

  await expect(palette, "o ⌘K não abriu").toBeVisible({ timeout: 5_000 });

  return palette;
}

/** A search no entry of the palette can match (kbar's fuzzy threshold is 0.2). */
const MATCHES_NOTHING = "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";

/**
 * What the palette offers for a search, read as text.
 *
 * Searched, not scrolled: the results list is VIRTUALIZED (kbar renders only
 * the rows inside its 407px window), so reading the whole list as text saw the
 * first dozen entries and reported "Integrações não está no ⌘K" for a manager
 * who had it one scroll away. Typing the name is also how a person finds a page
 * there, and it makes the absence checks stronger: the palette is asked for the
 * page by name and must not produce it.
 */
async function paletteSearch(page: Page, query: string): Promise<string[]> {
  await openPalette(page);

  const results = page.locator("[data-kbar-results]");
  const entries = results.locator("[data-kbar-item]");
  const input = page.getByPlaceholder("Digite um comando ou pesquise...");

  /*
    kbar filters on a THROTTLED copy of the search (100 ms, then a render),
    so a list read right after typing can still be the unfiltered one. That
    is harmless for a presence and worthless for an absence: the unfiltered
    first window simply does not reach the page asked for, and "not offered"
    passed without anything having been searched. A fixed 300 ms only made
    that rarer; comparing against the list read before typing did not help
    either, because the virtualized list redraws itself once it has measured
    its rows.

    So the search starts from a state with a single possible look: a search
    nothing matches (kbar's threshold is 0.2) empties the list, and an empty
    list only exists once the filter has run. Then the real search: from
    there, the first entry to appear can only be its answer.

    A search with no answer leaves the list empty, which looks the same as
    "not answered yet". That case is given ten times what the emptying
    search just took on this page (two seconds at least) — the same filter
    under the same load — before it reads as "nothing offered".
  */
  await expect(
    entries.first(),
    "o ⌘K abriu sem nenhuma entrada; a busca não mediria nada",
  ).toBeAttached({ timeout: 10_000 });

  const emptying = Date.now();

  await input.fill(MATCHES_NOTHING);
  await expect(entries, "o ⌘K não filtrou a lista").toHaveCount(0, {
    timeout: 10_000,
  });

  const filterTook = Date.now() - emptying;

  await input.fill(query);
  await expect(input).toHaveValue(query);

  const answered = await entries
    .first()
    .waitFor({ state: "attached", timeout: Math.max(2_000, filterTook * 10) })
    .then(
      () => true,
      () => false,
    );

  const text = answered ? await results.innerText() : "";

  await page.keyboard.press("Escape");
  await expect(
    page.getByPlaceholder("Digite um comando ou pesquise..."),
  ).toBeHidden({ timeout: 5_000 });

  return text
    .split(String.fromCharCode(10))
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Everything the palette shows before anything is typed (its first window). */
async function paletteEntries(page: Page): Promise<string[]> {
  const palette = await openPalette(page);

  const text = await palette.innerText();

  await page.keyboard.press("Escape");

  return text
    .split(String.fromCharCode(10))
    .map((line) => line.trim())
    .filter(Boolean);
}

export { openPalette, paletteEntries, paletteSearch };
