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
  const palette = await openPalette(page);

  await page.getByPlaceholder("Digite um comando ou pesquise...").fill(query);

  // kbar filters on input; give the list one frame to re-render.
  await page.waitForTimeout(300);

  const results = page.locator("[data-kbar-results]");
  const text = (await results.count()) ? await results.innerText() : "";

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
