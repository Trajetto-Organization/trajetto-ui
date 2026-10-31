import { test, expect, type Page } from "./support/test";

import { open } from "./support/operation";

/**
 * A form refusing what it was given, and refusing it HERE.
 *
 * Every test in this folder so far presses buttons that work. That leaves the
 * larger half of a form untested, because most of what a person does to a form
 * is get it wrong first: a field left empty, an address pasted with the scheme
 * missing, a list of events nobody remembered to tick.
 *
 * Three things have to be true at once, and they fail independently:
 *
 * - the message has to be ATTACHED to the field. A toast is not: it is read
 *   out of context by a screen reader, it disappears while the wrong value
 *   stays on screen, and with three problems it shows one.
 * - the field has to SAY it is wrong — `aria-invalid`, and a description
 *   pointing at the message (WCAG 3.3.1). Without it the input announces as
 *   perfectly fine and the person never learns why nothing happened.
 * - and NOTHING may leave the browser. A dialog that asks the server whether
 *   an empty field is acceptable burns a round trip to be told what it
 *   already knew, and on a bad connection that is seconds of a spinner
 *   ending in a refusal.
 *
 * The third is the one no screenshot would catch, so it is measured on the
 * wire rather than looked at.
 */
const PANEL = "/dashboard/integrations?tab=webhooks";

/** Server actions leaving this page, which is how a save is sent. */
function countActions(page: Page): () => number {
  let sent = 0;

  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    if (!request.url().includes("/dashboard/integrations")) return;
    if (!request.headers()["next-action"]) return;

    sent += 1;
  });

  return () => sent;
}

async function openForm(page: Page): Promise<void> {
  await open(page, PANEL);

  // The panel's own first load, before anything is measured.
  await expect(page.locator("main .animate-pulse")).toHaveCount(0, {
    timeout: 30_000,
  });

  await page.getByRole("button", { name: "Novo endpoint" }).click();

  await expect(page.locator('[role="dialog"]')).toBeVisible({
    timeout: 15_000,
  });

  // The catalogue arrives on its own; the events cannot be ticked before it.
  await expect(
    page.locator('[role="dialog"] [role="checkbox"]:not([disabled])').first(),
  ).toBeVisible({ timeout: 20_000 });
}

const save = (page: Page) =>
  page
    .locator('[role="dialog"]')
    .getByRole("button", { name: /^Salvar|Criar/ });

test.describe("the webhook form facing invalid data", () => {
  test("shows what is wrong in each field, and does not call the server", async ({
    page,
  }) => {
    await openForm(page);

    const traffic = countActions(page);

    // Everything empty: three problems at once, which is the ordinary case.
    await save(page).click();

    const name = page.locator("#webhook-name");
    const url = page.locator("#webhook-url");

    await expect(name, "o campo Nome não se declarou inválido").toHaveAttribute(
      "aria-invalid",
      "true",
      { timeout: 10_000 },
    );

    await expect(url).toHaveAttribute("aria-invalid", "true");

    /**
     * All three, not the first.
     *
     * A form that answers one problem per attempt makes somebody press Salvar
     * three times to learn three things — and each attempt looks, from the
     * outside, exactly like the form being broken.
     */
    await expect(page.locator("#webhook-name-error")).toBeVisible();
    await expect(page.locator("#webhook-url-error")).toBeVisible();
    await expect(page.locator("#webhook-topics-error")).toBeVisible();

    // And the message is pointed at by the field, not merely near it.
    expect(await name.getAttribute("aria-describedby")).toBe(
      "webhook-name-error",
    );

    // The URL field also points at its hint ("Só https…").
    expect(await url.getAttribute("aria-describedby")).toContain(
      "webhook-url-error",
    );

    // Announced on insertion, which is what makes it reach a screen reader at
    // the moment it matters.
    await expect(page.locator("#webhook-url-error")).toHaveAttribute(
      "role",
      "alert",
    );

    await page.waitForTimeout(1_000);

    expect(
      traffic(),
      "o formulário chamou o servidor para saber se um campo vazio serve",
    ).toBe(0);
  });

  test("refuses http before asking, because it wrote 'só https' itself", async ({
    page,
  }) => {
    /**
     * The rule is printed under the field. Printing it and then making the
     * person wait for a round trip to be told exactly that is worse than not
     * printing it — and the server stays the authority either way: its
     * refusals are still shown verbatim when they are about something this
     * dialog cannot know.
     */
    await openForm(page);

    const traffic = countActions(page);

    await page.locator("#webhook-name").fill("ERP do embarcador");
    await page
      .locator("#webhook-url")
      .fill("http://erp.exemplo.com.br/eventos");

    await page
      .locator('[role="dialog"] [role="checkbox"]:not([disabled])')
      .first()
      .check();

    await save(page).click();

    await expect(page.locator("#webhook-url-error")).toContainText(/https/i, {
      timeout: 10_000,
    });

    await page.waitForTimeout(1_000);

    expect(traffic(), "o http foi enviado ao servidor mesmo assim").toBe(0);
  });

  test("and leaves the screen as the person fixes it", async ({ page }) => {
    /**
     * A message that stays under a field somebody is already fixing reads as
     * "still wrong", and the person deletes what they just typed to find out.
     */
    await openForm(page);

    await save(page).click();

    const name = page.locator("#webhook-name");

    await expect(name).toHaveAttribute("aria-invalid", "true", {
      timeout: 10_000,
    });

    await name.fill("ERP do embarcador");

    await expect(page.locator("#webhook-name-error")).toHaveCount(0);
    await expect(name).not.toHaveAttribute("aria-invalid", "true");

    // The others are untouched, and still wrong.
    await expect(page.locator("#webhook-url-error")).toBeVisible();
    await expect(page.locator("#webhook-topics-error")).toBeVisible();
  });

  test("and the dialog stays open, with what was typed", async ({ page }) => {
    // Closing on a refusal, or clearing the fields, would throw away the work
    // and leave nothing to correct.
    await openForm(page);

    await page.locator("#webhook-name").fill("ERP do embarcador");
    await page.locator("#webhook-url").fill("nao-e-um-endereco");

    await save(page).click();

    await expect(page.locator("#webhook-url-error")).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await expect(page.locator("#webhook-name")).toHaveValue(
      "ERP do embarcador",
    );

    await expect(page.locator("#webhook-url")).toHaveValue("nao-e-um-endereco");
  });
});
