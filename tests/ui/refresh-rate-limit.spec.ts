import { test, expect, type Page } from "@playwright/test";

import { open } from "./support/operation";

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

/** Server-action calls, which is how a panel asks for its list again. */
function countActions(page: Page): { count: () => number } {
  let count = 0;

  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    if (!request.url().includes("/dashboard/integrations")) return;

    count += 1;
  });

  return { count: () => count };
}

const refreshOn = (page: Page) =>
  page.getByRole("button", { name: /Atualizar|Aguarde/ }).first();

/**
 * Presses Atualizar until the cooldown takes, or gives up.
 *
 * Not a fixed loop of four clicks: the button is ALSO disabled while its
 * refetch is in flight, so firing four times in a row lands two of them on a
 * dead control and the limit never trips. A user pressing impatiently waits
 * for the button to come back and presses again — which is exactly the
 * behaviour the limit is for.
 */
async function pressUntilLocked(page: Page, attempts = 8): Promise<void> {
  const button = refreshOn(page);

  for (let press = 0; press < attempts; press += 1) {
    await expect(button).toBeEnabled({ timeout: 15_000 });

    await button.click();

    // The cooldown announces itself in seconds; the in-flight state does not.
    if (/\d+s/.test((await button.innerText()).trim())) return;
  }

  throw new Error(
    `o botão não travou depois de ${attempts} toques dentro da janela`,
  );
}

test.describe("o botão Atualizar de um painel", () => {
  test("trava depois de três toques e SEGURA a rede", async ({ page }) => {
    await open(page, PANEL);

    const button = refreshOn(page);

    await expect(button).toBeVisible({ timeout: 30_000 });

    // Counted from here: the page's own first load is not what is being
    // measured.
    const traffic = countActions(page);

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
     * Exactly three, and the count is the assertion.
     *
     * The limit allows three presses in the window and the FOURTH is the one
     * that trips it. At that moment the button is still enabled, so the only
     * thing standing between that press and a fourth refetch is the guard
     * inside the handler — `if (!registerClick()) return`. Removing it leaves
     * every visible symptom identical (the button still locks, still counts
     * down) and quietly sends one more request. The button being disabled
     * afterwards hides the rest; it cannot hide this one.
     */
    expect(
      afterLock,
      `o limite permite 3 atualizações na janela e saíram ${afterLock}`,
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
  });

  test("e o cooldown não vaza para outro painel", async ({ page }) => {
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

  test("e sobrevive a um recarregamento da página", async ({ page }) => {
    /**
     * Otherwise the limit is a suggestion: F5 and press again. It is kept in
     * `localStorage` precisely so a reload does not reset it.
     */
    await open(page, PANEL);

    const button = refreshOn(page);

    await expect(button).toBeVisible({ timeout: 30_000 });

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

  test("e solta sozinho quando o tempo passa", async ({ page }) => {
    // The other half. A limit that never releases is not a limit, it is a
    // broken button — and the countdown would have been lying.
    await open(page, PANEL);

    const button = refreshOn(page);

    await expect(button).toBeVisible({ timeout: 30_000 });

    await pressUntilLocked(page);

    await expect(button).toBeDisabled();

    await expect(refreshOn(page), "o botão nunca voltou").toBeEnabled({
      timeout: 25_000,
    });

    await expect(refreshOn(page)).toContainText("Atualizar");
  });
});
