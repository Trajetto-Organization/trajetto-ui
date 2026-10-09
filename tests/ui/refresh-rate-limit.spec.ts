import { test, expect, type Page } from "@playwright/test";

import { open } from "./support/operation";
import { waitForHydration } from "./support/ui";

/**
 * The fifteen-second cooldown, pressed for real.
 *
 * The unit test beside this one proves every "Atualizar" in the product is
 * WIRED to the limit. It cannot prove the limit does anything: a button that
 * registers a click, disables itself for a frame and fires the request anyway
 * would satisfy it completely.
 *
 * So this presses the button until it locks and then watches the network.
 * What matters is not that the button greys out — it is that nothing more
 * leaves the browser.
 */
const PANEL = "/dashboard/integrations?tab=webhooks";

/**
 * Calls of ONE server action, which is how a panel asks for its list again.
 *
 * Counting every POST to the page URL counted the wrong things: the shell runs
 * its own server actions on the same URL — the session check, the
 * notifications — and under three parallel workers that turned "exactly three
 * refreshes" into nine. Next stamps each action with a `Next-Action` header,
 * so the first call after the first press names the one being measured and
 * everything else is somebody else's traffic.
 */
function countActions(page: Page): {
  count: () => number;
  times: () => number[];
  identify: (id: string) => void;
} {
  const seen: Array<{ action: string; at: number }> = [];

  let watching: string | null = null;

  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    if (!request.url().includes("/dashboard/integrations")) return;

    const action = request.headers()["next-action"];

    if (!action) return;

    seen.push({ action, at: Date.now() });
  });

  const mine = () => seen.filter((entry) => entry.action === watching);

  return {
    count: () => mine().length,
    times: () => mine().map((entry) => entry.at),
    identify: (id: string) => {
      watching = id;
    },
  };
}

/** The limit's own window, as `RefreshButton` declares it. */
const WINDOW_MS = 30_000;

/**
 * The most refreshes that left the browser inside any thirty-second window.
 *
 * Counting the whole run instead was the wrong measurement, and it failed on
 * the weather. The limit is a SLIDING window, so what it allows depends on
 * the spacing of the presses — and the spacing here is the test's own, not a
 * user's: each press waits for the button to come back from its refetch, and
 * under three parallel workers against a dev server that round trip can take
 * ten seconds. Three presses spaced like that no longer share a window, the
 * first one ages out, a fourth is legitimately allowed, and a total of four
 * was read as a leak that never happened.
 *
 * This asks the question the rule actually answers, which no pacing can
 * distort: was there ever a window with more than three in it?
 */
function mostWithinWindow(times: number[]): number {
  return times.reduce((worst, start) => {
    const inside = times.filter(
      (at) => at >= start && at - start < WINDOW_MS,
    ).length;

    return Math.max(worst, inside);
  }, 0);
}

/** The action id behind the refresh button, learnt from one press. */
async function actionBehind(
  page: Page,
  press: () => Promise<void>,
): Promise<string> {
  const request = page.waitForRequest(
    (candidate) =>
      candidate.method() === "POST" &&
      Boolean(candidate.headers()["next-action"]),
    { timeout: 20_000 },
  );

  await press();

  return (await request).headers()["next-action"];
}

const refreshOn = (page: Page) =>
  page.getByRole("button", { name: /Atualizar|Aguarde/ }).first();

/**
 * Waits for the panel's OWN first load to be over.
 *
 * react-query fetches on mount, through the same server action the button
 * runs — so the panel's arrival puts one call on the wire that nobody pressed
 * for. On a quiet machine it lands before the listener is attached and is
 * never seen; under three parallel workers it lands after, and the run reads
 * as four refreshes where a person made three. The limit was never involved.
 *
 * The skeleton is the honest barrier: it is on screen exactly while
 * `isLoading` is true, which is exactly while that first fetch is in flight.
 */
async function panelSettled(page: Page): Promise<void> {
  // A press before hydration is a dead click, and pressUntilLocked would
  // count it as one of its attempts.
  await waitForHydration(refreshOn(page));

  await expect(page.locator("main .animate-pulse")).toHaveCount(0, {
    timeout: 60_000,
  });
}

/**
 * Presses Atualizar until the cooldown takes, or gives up.
 *
 * Not a fixed loop of four clicks: the button is ALSO disabled while its
 * refetch is in flight, so firing four times in a row lands two of them on a
 * dead control and the limit never trips. A user pressing impatiently waits
 * for the button to come back and presses again — which is exactly the
 * behaviour the limit is for.
 */
async function pressUntilLocked(page: Page, attempts = 12): Promise<void> {
  const button = refreshOn(page);

  for (let press = 0; press < attempts; press += 1) {
    // Disabled while its refetch is in flight; on the dev server under three
    // workers that flight took longer than the 15 s this used to allow.
    await expect(button).toBeEnabled({ timeout: 60_000 });

    await button.click();

    // The cooldown announces itself in seconds; the in-flight state does not.
    if (/\d+s/.test((await button.innerText()).trim())) return;
  }

  throw new Error(
    `o botão não travou depois de ${attempts} toques dentro da janela`,
  );
}

test.describe("a panel's Atualizar button", () => {
  test("locks after three taps and HOLDS the network", async ({ page }) => {
    await open(page, PANEL);

    const button = refreshOn(page);

    await expect(button).toBeVisible({ timeout: 30_000 });

    await panelSettled(page);

    // Counted from here: the page's own first load is not what is being
    // measured.
    const traffic = countActions(page);

    // One press to learn which action the button runs, then the rest.
    traffic.identify(
      await actionBehind(page, async () => {
        await expect(button).toBeEnabled({ timeout: 15_000 });
        await button.click();
      }),
    );

    await pressUntilLocked(page);

    await expect(
      button,
      "o botão continua disponível depois de estourar o limite",
    ).toBeDisabled();

    /**
     * And it says how long, on its own face.
     *
     * A disabled button with no explanation is indistinguishable from a
     * broken one; the number is what turns "quebrou" into "espera aí".
     */
    await expect(button).toContainText(/\d+s/);

    const afterLock = traffic.count();

    /**
     * Three per window, and the window is the assertion.
     *
     * The limit allows three presses inside thirty seconds and the one that
     * follows them is the one that trips it. At that moment the button is
     * still enabled, so the only thing standing between that press and a
     * fourth refetch is the guard inside the handler —
     * `if (!registerClick()) return`. Removing it leaves every visible
     * symptom identical (the button still locks, still counts down) and
     * quietly sends one more request. The button being disabled afterwards
     * hides the rest; it cannot hide that one, because the press that trips
     * the limit is BY DEFINITION inside the same window as the three before
     * it — otherwise it would not have tripped anything.
     */
    const worst = mostWithinWindow(traffic.times());

    expect(
      worst,
      `o limite permite 3 atualizações em 30s e saíram ${worst}`,
    ).toBe(3);

    // More presses while locked. Forced, because a user with a trackpad will
    // hit a disabled button several times before reading it.
    for (let press = 0; press < 3; press += 1) {
      await button.click({ force: true });
    }

    await page.waitForTimeout(1_500);

    expect(
      traffic.count(),
      "apertar durante o cooldown ainda dispara chamadas ao servidor",
    ).toBe(afterLock);

    // And the cooldown presses did not open a window of their own.
    expect(mostWithinWindow(traffic.times())).toBe(3);
  });

  test("and the cooldown does not leak to another panel", async ({ page }) => {
    /**
     * The cooldown lives in `localStorage` under a key per control. Two
     * screens sharing one means pressing Atualizar on Webhooks locks the
     * button on Chaves de API, for fifteen seconds, with no explanation —
     * which is why the unit test beside this one refuses duplicate keys, and
     * why this one checks the keys are really separate at runtime.
     */
    await open(page, PANEL);

    const button = refreshOn(page);

    await expect(button).toBeVisible({ timeout: 30_000 });

    await panelSettled(page);

    await pressUntilLocked(page);

    await expect(button).toBeDisabled();

    await open(page, "/dashboard/integrations?tab=api-keys");

    const other = refreshOn(page);

    await expect(other).toBeVisible({ timeout: 30_000 });

    await expect(
      other,
      "o cooldown dos webhooks travou o botão das chaves de API",
    ).toBeEnabled();
  });

  test("and survives a page reload", async ({ page }) => {
    /**
     * Otherwise the limit is a suggestion: F5 and press again. It is kept in
     * `localStorage` precisely so a reload does not reset it.
     */
    await open(page, PANEL);

    const button = refreshOn(page);

    await expect(button).toBeVisible({ timeout: 30_000 });

    await panelSettled(page);

    await pressUntilLocked(page);

    await expect(button).toBeDisabled();

    await page.reload({ waitUntil: "networkidle" });

    const afterReload = refreshOn(page);

    await expect(afterReload).toBeVisible({ timeout: 30_000 });

    await expect(
      afterReload,
      "recarregar a página zerou o cooldown",
    ).toBeDisabled();

    await expect(afterReload).toContainText(/\d+s/);
  });

  test("and releases on its own when the time passes", async ({ page }) => {
    // The other half. A limit that never releases is not a limit, it is a
    // broken button — and the countdown would have been lying.
    await open(page, PANEL);

    const button = refreshOn(page);

    await expect(button).toBeVisible({ timeout: 30_000 });

    await panelSettled(page);

    await pressUntilLocked(page);

    await expect(button).toBeDisabled();

    await expect(refreshOn(page), "o botão nunca voltou").toBeEnabled({
      timeout: 25_000,
    });

    await expect(refreshOn(page)).toContainText("Atualizar");
  });
});
