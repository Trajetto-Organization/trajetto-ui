import { test, expect, type Page } from "@playwright/test";

import { open } from "./support/operation";

/**
 * What happens AFTER something worked.
 *
 * The refusal half of this form has its own file. This is the other half, and
 * it is the one that is usually assumed: a save that returns 200 is taken as a
 * save that finished. It is not. Between the response and the person believing
 * it there are five separate things, and each fails on its own:
 *
 * - the list has to show it, without a reload;
 * - the dialog has to close — or, in exactly one case here, NOT close;
 * - the toast has to say which of the two happened;
 * - editing has to show what is stored rather than an empty form;
 * - and removing has to take the row off the screen, not just out of the
 *   database.
 *
 * The one case that must not close is the whole reason this file exists. A
 * created endpoint comes back with a signing secret shown ONCE — the screen
 * says so in as many words — and there is no way to ask for it again. A dialog
 * that closed on success would be a dialog that throws away, on the happy
 * path, the only copy of a credential the customer's system needs. Nothing
 * about that failure is visible: the endpoint is created, the toast is green,
 * the list updates, and the secret is simply gone.
 */
const PANEL = "/dashboard/integrations?tab=webhooks";

/**
 * Unique per run, so a leftover row from a failed run cannot fake a pass.
 *
 * Letters rather than a number, and that is not decoration: a numeric suffix
 * makes one name a PREFIX of another (`...-30` inside `...-304`), and the
 * first version of this file matched two rows and failed for that reason
 * alone. A fixed-width base-36 tail cannot nest.
 */
const stamp = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const dialogOf = (page: Page) => page.locator('[role="dialog"]').first();

async function openPanel(page: Page): Promise<void> {
  await open(page, PANEL);

  await expect(page.locator("main .animate-pulse")).toHaveCount(0, {
    timeout: 30_000,
  });
}

async function fillEndpoint(
  page: Page,
  values: { name: string; url: string },
): Promise<void> {
  const dialog = dialogOf(page);

  await expect(
    dialog.locator('[role="checkbox"]:not([disabled])').first(),
  ).toBeVisible({ timeout: 20_000 });

  await page.locator("#webhook-name").fill(values.name);
  await page.locator("#webhook-url").fill(values.url);
}

const saveButton = (page: Page) =>
  dialogOf(page).getByRole("button", { name: /^Salvar|Criar/ });

const rowOf = (page: Page, name: string) =>
  page.locator("div.rounded-lg.border").filter({ hasText: name }).first();

/**
 * Takes the endpoint back out.
 *
 * These tests write to the same database the rest of the suite reads, so a
 * run that leaves rows behind makes the panel grow by three every time
 * somebody runs it — and an empty-state assertion somewhere else eventually
 * fails for a reason that has nothing to do with the code it is testing.
 */
async function removeEndpoint(page: Page, name: string): Promise<void> {
  await rowOf(page, name)
    .getByRole("button", { name: "Remover o endpoint" })
    .click();

  await page
    .locator('[role="alertdialog"], [role="dialog"]')
    .last()
    .getByRole("button", { name: /^Remover/ })
    .click();

  await expect(page.getByText(name, { exact: true })).toHaveCount(0, {
    timeout: 20_000,
  });
}

test.describe("a webhook destination, from start to finish", () => {
  test("creating shows the secret ONCE and does not close the dialog", async ({
    page,
  }) => {
    const name = `Destino ${stamp()}`;

    await openPanel(page);

    await page.getByRole("button", { name: "Novo endpoint" }).click();

    await fillEndpoint(page, {
      name,
      url: `https://exemplo.invalid/hook-${stamp()}`,
    });

    await dialogOf(page)
      .locator('[role="checkbox"]:not([disabled])')
      .first()
      .check();

    await saveButton(page).click();

    /**
     * Open, and showing the secret.
     *
     * This is the assertion that a green `onClose()` on success would break,
     * and it would break silently: everything else about that save succeeded.
     */
    await expect(
      dialogOf(page),
      "o diálogo fechou e levou o segredo junto",
    ).toBeVisible({ timeout: 20_000 });

    await expect(
      dialogOf(page).getByText(/única vez que o segredo aparece/i),
    ).toBeVisible();

    const secret = await dialogOf(page).locator("code").first().innerText();

    expect(secret.trim().length, "o segredo veio vazio").toBeGreaterThan(16);

    // And it can be taken away from the screen, which is the only reason it
    // is on it.
    await expect(
      dialogOf(page).getByRole("button", { name: "Copiar o segredo" }),
    ).toBeVisible();

    // Closing from here is the person saying they have it.
    await dialogOf(page).getByRole("button", { name: "Já guardei" }).click();

    await expect(dialogOf(page)).toHaveCount(0);

    // The list, without a reload: this is the panel's own refetch, not F5.
    await expect(
      page.getByText(name, { exact: true }),
      "o endpoint criado não apareceu na lista",
    ).toBeVisible({ timeout: 20_000 });

    await removeEndpoint(page, name);
  });

  test("editing opens with what is saved, closes on save, and the list changes", async ({
    page,
  }) => {
    const name = `Destino ${stamp()}`;
    const url = `https://exemplo.invalid/hook-${stamp()}`;

    await openPanel(page);

    await page.getByRole("button", { name: "Novo endpoint" }).click();
    await fillEndpoint(page, { name, url });
    await dialogOf(page)
      .locator('[role="checkbox"]:not([disabled])')
      .first()
      .check();
    await saveButton(page).click();

    await expect(
      dialogOf(page).getByText(/única vez que o segredo aparece/i),
    ).toBeVisible({ timeout: 20_000 });

    await dialogOf(page).getByRole("button", { name: "Já guardei" }).click();

    const row = rowOf(page, name);

    await expect(row).toBeVisible({ timeout: 20_000 });

    await row.getByRole("button", { name: "Editar" }).click();

    // What is stored, not an empty form. A dialog that opened blank would
    // invite somebody to re-type a URL they cannot see.
    await expect(page.locator("#webhook-name")).toHaveValue(name, {
      timeout: 20_000,
    });

    await expect(page.locator("#webhook-url")).toHaveValue(url);

    /**
     * And no secret on an edit, which is the other half of "shown once".
     *
     * Regenerating it here would silently break the customer's signature
     * check — the screen says as much on creation — so the absence is a
     * promise, not an omission.
     */
    await expect(
      dialogOf(page).getByText(/única vez que o segredo aparece/i),
    ).toHaveCount(0);

    const renamed = `${name} editado`;

    await page.locator("#webhook-name").fill(renamed);

    await saveButton(page).click();

    // An edit HAS to close: there is nothing left on screen to take away.
    await expect(
      dialogOf(page),
      "o diálogo ficou aberto depois de uma edição que deu certo",
    ).toHaveCount(0, { timeout: 20_000 });

    await expect(page.getByText(renamed, { exact: true })).toBeVisible({
      timeout: 20_000,
    });

    await removeEndpoint(page, renamed);
  });

  test("removing asks first, and the row leaves the screen", async ({
    page,
  }) => {
    const name = `Destino ${stamp()}`;

    await openPanel(page);

    await page.getByRole("button", { name: "Novo endpoint" }).click();

    await fillEndpoint(page, {
      name,
      url: `https://exemplo.invalid/hook-${stamp()}`,
    });

    await dialogOf(page)
      .locator('[role="checkbox"]:not([disabled])')
      .first()
      .check();
    await saveButton(page).click();

    await expect(
      dialogOf(page).getByText(/única vez que o segredo aparece/i),
    ).toBeVisible({ timeout: 20_000 });

    await dialogOf(page).getByRole("button", { name: "Já guardei" }).click();

    const row = rowOf(page, name);

    await expect(row).toBeVisible({ timeout: 20_000 });

    await row.getByRole("button", { name: "Remover o endpoint" }).click();

    // Asked, and by name: "remover este destino?" with nothing identifying it
    // is how somebody removes the wrong one.
    const confirmation = page
      .locator('[role="alertdialog"], [role="dialog"]')
      .last();

    await expect(confirmation).toBeVisible({ timeout: 15_000 });
    await expect(confirmation).toContainText(name);

    // Cancelling changes nothing — the half of a confirmation that is never
    // tested, and the half that makes it a confirmation.
    await confirmation.getByRole("button", { name: /Cancelar/ }).click();

    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Remover o endpoint" }).click();

    await page
      .locator('[role="alertdialog"], [role="dialog"]')
      .last()
      .getByRole("button", { name: /^Remover/ })
      .click();

    await expect(
      page.getByText(name, { exact: true }),
      "a linha continuou na tela depois de remover",
    ).toHaveCount(0, { timeout: 20_000 });
  });
});
