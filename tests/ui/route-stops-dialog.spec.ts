import { test, expect, type Page } from "@playwright/test";

import {
  CONTEXT,
  api,
  anyVehicle,
  createRoute,
  open,
  ownDelivery,
} from "./support/operation";

/**
 * The panel where a dispatcher decides the driver's day.
 *
 * It was the ugliest surface in the product and the reason is worth writing
 * down: it had been built as a grid of two lists and nothing else. No footer,
 * so the panel just ran out; the save button lived inside a column heading and
 * appeared and disappeared with the dirty state, shoving the list down as it
 * did; and the last element in the right column was a full-width primary
 * button permanently painted grey, which reads as broken rather than as
 * waiting for input.
 *
 * What is asserted here is the frame, not the styling: that the way out
 * exists, that it is named the way the product names it, that unsaved work is
 * not thrown away by a stray click, and that the action appears when it can be
 * used. Those are the parts a redesign is allowed to move and not allowed to
 * lose.
 */
async function openStopsDialog(
  page: Page,
  routeName: string,
): Promise<void> {
  /**
   * The board filtered down to this route, rather than scanned for it.
   *
   * The first version opened the unfiltered board and looked for the row. It
   * passed alone and failed under parallel load, and the reason had nothing to
   * do with the panel: the board shows ten rows, newest first, and the other
   * workers of this same file create routes too. By the time the browser
   * painted, the route this test had just made could be on page two.
   */
  await open(page, `/dashboard/routes?search=${encodeURIComponent(routeName)}`);

  const row = page.locator("tr", { hasText: routeName }).first();

  await expect(row, `a rota ${routeName} não apareceu no quadro`).toBeVisible({
    timeout: 30_000,
  });

  await row.getByRole("button", { name: /^Abrir menu de ações de / }).click();

  await page.getByRole("menuitem", { name: "Paradas e ordem" }).click();

  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
}

/** A route of this run's own, with as many stops as the test needs. */
async function routeWith(stops: number): Promise<string> {
  // The millisecond is not enough on its own: three workers start together
  // and two of them can stamp the same one, which puts two routes on the
  // board under the same name and sends `.first()` to the wrong one.
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const routeName = `Paradas ${stamp}`;

  const deliveries: string[] = [];

  for (let index = 0; index < stops; index += 1) {
    deliveries.push(await ownDelivery(`Parada ${index + 1} de ${stamp}`));
  }

  await createRoute(deliveries, await anyVehicle(), routeName);

  return routeName;
}

test.describe("o painel enquanto a operação se mexe", () => {
  test("sobrevive a um colega liberando outra rota", async ({ page }) => {
    /**
     * The panel used to close by itself, and the cause had nothing to do with
     * the panel.
     *
     * The Rotas board listens to `routeEvent` and refreshes when the
     * operation moves. `router.refresh()` re-runs the server component, the
     * board renders behind a Suspense boundary, and re-suspending it swaps in
     * the loading skeleton and unmounts the table — including the row this
     * dialog is rendered from. So a dispatcher halfway through reordering a
     * route lost the panel, and the new order with it, because somebody on
     * the other side of the office released a DIFFERENT route.
     *
     * Nobody is reading the board underneath a modal. The refresh waits.
     */
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const mine = `Paradas ${stamp}`;

    const vehicleId = await anyVehicle();

    await createRoute(
      [
        await ownDelivery(`Parada 1 de ${stamp}`),
        await ownDelivery(`Parada 2 de ${stamp}`),
      ],
      vehicleId,
      mine,
    );

    // Somebody else's route, which is about to move.
    const theirs = await createRoute(
      [await ownDelivery(`Alheia ${stamp}`)],
      vehicleId,
      `Alheia ${stamp}`,
    );

    await openStopsDialog(page, mine);

    const dialog = page.getByRole("dialog");

    await dialog
      .getByRole("button", { name: /^Mover .* para baixo$/ })
      .first()
      .click();

    await expect(
      dialog.getByText("A nova ordem ainda não foi salva."),
    ).toBeVisible();

    // The colleague's action, made through the API exactly as their browser
    // would make it. This is what puts `routeEvent` on the wire.
    const released = await api(
      `/route/release-route/${theirs.id}/business/${CONTEXT.businessId}`,
      { method: "PATCH", body: JSON.stringify({ released: true }) },
    );

    expect(
      released.status,
      `não foi possível liberar a rota do colega: ${await released.text()}`,
    ).toBe(200);

    /**
     * Long enough for the whole chain: the socket hop, the 1.2s settle window
     * and the refetch. Proving the ABSENCE of a refresh needs a wait; there
     * is nothing to await.
     */
    await page.waitForTimeout(8_000);

    await expect(
      dialog,
      "o painel fechou porque outra rota foi liberada",
    ).toBeVisible();

    await expect(
      dialog.getByText("A nova ordem ainda não foi salva."),
      "o painel continuou aberto mas a ordem não salva se perdeu",
    ).toBeVisible();

    // And the stops are still the two this route has, in the order the user
    // left them — not a list rebuilt from the server mid-edit.
    await expect(dialog.locator("ol > li")).toHaveCount(2);
  });
});

test.describe("o modal de paradas da rota", () => {
  test("se apresenta e oferece uma saída", async ({ page }) => {
    const routeName = await routeWith(1);

    await openStopsDialog(page, routeName);

    const dialog = page.getByRole("dialog");

    // Named after the route being edited, because the dispatcher opened it
    // from a board of many.
    await expect(
      dialog.getByRole("heading", { name: /^Paradas da Rota \d+$/ }),
    ).toBeVisible();

    // The footer is the only place an action lives.
    await expect(dialog.getByRole("button", { name: "Fechar" })).toBeVisible();

    await expect(
      dialog.getByRole("button", { name: "Salvar ordem" }),
      "salvar deve estar desabilitado antes de mexer na ordem",
    ).toBeDisabled();

    /**
     * "Voltar" is not "Cancelar". It promises a previous step, and there is
     * none here — the product had it in four dialogs and it was wrong in all
     * four.
     */
    await expect(dialog.getByRole("button", { name: /^Voltar/ })).toHaveCount(
      0,
    );
  });

  test("mostra o endereço de cada parada, não só a cidade", async ({
    page,
  }) => {
    // The street is what the driver reads at the wheel. The city alone told
    // the dispatcher nothing they did not already know from the route.
    const routeName = await routeWith(1);

    await openStopsDialog(page, routeName);

    await expect(
      page.getByRole("dialog").getByText(/Rua do Tempo Real, 1 — São Paulo\/SP/),
    ).toBeVisible();
  });

  test("não fecha com um clique fora quando há ordem não salva", async ({
    page,
  }) => {
    const routeName = await routeWith(2);

    await openStopsDialog(page, routeName);

    const dialog = page.getByRole("dialog");

    await dialog
      .getByRole("button", { name: /^Mover .* para baixo$/ })
      .first()
      .click();

    await expect(dialog.getByText("A nova ordem ainda não foi salva.")).toBeVisible();

    await expect(dialog.getByRole("button", { name: "Salvar ordem" })).toBeEnabled();

    // Beside the panel, on the overlay. Nobody does this on purpose.
    await page.mouse.click(12, 12);

    await expect(
      dialog,
      "o modal fechou por clique fora e levou a ordem junto",
    ).toBeVisible();
  });

  test("e pergunta antes de descartar a ordem no Cancelar", async ({
    page,
  }) => {
    const routeName = await routeWith(2);

    await openStopsDialog(page, routeName);

    const dialog = page.getByRole("dialog");

    await dialog
      .getByRole("button", { name: /^Mover .* para baixo$/ })
      .first()
      .click();

    await dialog.getByRole("button", { name: "Cancelar" }).click();

    /**
     * Queried by attribute, not by role.
     *
     * While an AlertDialog is open Radix marks everything under it
     * `aria-hidden`, so `getByRole("dialog")` reports zero for a panel that is
     * plainly still on the screen — and a mutation that made "Descartar" do
     * nothing at all passed against it. The DOM does not lie about this.
     */
    const confirm = page.locator('[role="alertdialog"]');

    await expect(confirm).toBeVisible();
    await expect(
      confirm.getByRole("heading", { name: "Descartar a nova ordem?" }),
    ).toBeVisible();

    // Backing out of the confirmation leaves the work where it was.
    await confirm.getByRole("button", { name: "Continuar editando" }).click();

    await expect(confirm).toHaveCount(0);
    await expect(
      page.getByText("A nova ordem ainda não foi salva."),
    ).toBeVisible();

    // And confirming it really does close — both of them.
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await confirm.getByRole("button", { name: "Descartar" }).click();

    await expect(confirm).toHaveCount(0);
    await expect(
      page.locator('[role="dialog"]'),
      "descartar fechou só a confirmação; o painel continuou aberto",
    ).toHaveCount(0);
  });

  test("fecha direto quando não há nada a perder", async ({ page }) => {
    const routeName = await routeWith(1);

    await openStopsDialog(page, routeName);

    await page.keyboard.press("Escape");

    await expect(
      page.locator('[role="dialog"]'),
      "sem alterações pendentes o ESC deve simplesmente fechar",
    ).toHaveCount(0);
  });

  test("só oferece Adicionar depois que algo é escolhido", async ({ page }) => {
    /**
     * The defect in the screenshot: a full-width primary button sitting greyed
     * at the bottom of the column with nothing selected. A disabled control is
     * indistinguishable from a broken one when it is the only thing there.
     */
    const routeName = await routeWith(1);

    await openStopsDialog(page, routeName);

    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByRole("button", { name: /Adicionar à rota/ }),
      "o botão de adicionar aparece antes de haver seleção",
    ).toHaveCount(0);

    const firstCandidate = dialog.getByRole("checkbox").first();

    await expect(
      firstCandidate,
      "não há entregas pendentes para escolher; o teste não mediu nada",
    ).toBeVisible({ timeout: 15_000 });

    await firstCandidate.click();

    await expect(
      dialog.getByRole("button", { name: /Adicionar à rota/ }),
    ).toBeEnabled();

    await expect(dialog.getByText("1 entrega selecionada")).toBeVisible();
  });

  test("e adicionar de verdade põe a parada na rota", async ({ page }) => {
    /**
     * The other half, and the one that matters: the panel is not a picker, it
     * is a write. Choosing, adding, and the stop appearing on the left in
     * position 2 is the whole loop — UI → server action → API → banco →
     * refetch → UI.
     *
     * The delivery is created here and found by searching for it. Picking the
     * first row of the candidate list instead failed on the fixture: most of
     * those deliveries are already promised to another driver's route, and the
     * API refuses them with 409 — a failure about the seed data, not about
     * this panel. The search is also the only way to be sure the stop that
     * turns up on the left is the one that was chosen.
     */
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const routeName = `Paradas ${stamp}`;

    await createRoute(
      [await ownDelivery(`Parada 1 de ${stamp}`)],
      await anyVehicle(),
      routeName,
    );

    const wanted = `Avulsa ${stamp}`;
    await ownDelivery(wanted);

    await openStopsDialog(page, routeName);

    const dialog = page.getByRole("dialog");

    await expect(dialog.getByText("1 parada")).toBeVisible();

    await dialog.getByRole("textbox", { name: "Buscar entregas pendentes" }).fill(wanted);
    await dialog.getByRole("button", { name: "Buscar" }).click();

    const candidate = dialog.locator("ul > li", { hasText: wanted }).first();

    await expect(
      candidate,
      "a entrega criada para este teste não apareceu na busca",
    ).toBeVisible({ timeout: 20_000 });

    await candidate.getByRole("checkbox").click();

    await expect(dialog.getByText("1 entrega selecionada")).toBeVisible();

    await dialog.getByRole("button", { name: /Adicionar à rota/ }).click();

    /**
     * The failure message carries whatever the product said.
     *
     * A bare "2 paradas never appeared" is a mystery: the add may have been
     * refused by the API — a delivery already on somebody's route answers 409
     * — and the reason was on screen the whole time, in a toast the assertion
     * was not looking at.
     */
    await expect(async () => {
      if ((await dialog.getByText("2 paradas").count()) > 0) return;

      const said = await page.locator("[data-sonner-toast]").allInnerTexts();

      throw new Error(
        `a rota continua com uma parada depois de adicionar. Avisos na tela: ${
          said.length > 0 ? said.join(" | ") : "nenhum"
        }`,
      );
    }).toPass({ timeout: 20_000 });

    /**
     * And the panel is still there.
     *
     * It was not. Every write revalidated the page's cache tag, the board is
     * an async server component behind a Suspense boundary, and re-suspending
     * it unmounted the table — row, dialog and all. The dispatcher added a
     * stop and landed back on the board. Proving the ABSENCE of that needs a
     * wait: the remount arrived about a second after the write.
     */
    await page.waitForTimeout(3_000);

    await expect(
      dialog,
      "o painel fechou sozinho depois de adicionar a parada",
    ).toBeVisible();

    // And it is the one that was chosen, in second position.
    const second = dialog.locator("ol > li").nth(1);

    await expect(second).toContainText(wanted);
    await expect(second).toContainText("2");

    // The selection bar goes away with the selection it was describing.
    await expect(
      dialog.getByRole("button", { name: /Adicionar à rota/ }),
    ).toHaveCount(0);

    /**
     * And the board behind catches up on the way out.
     *
     * This is the other half of not revalidating on every write: the page's
     * cache is now stale on purpose, and closing is what settles it. Without
     * that, the dispatcher would come back to a row still claiming one stop
     * and press Atualizar to find out it was wrong.
     */
    await dialog.getByRole("button", { name: "Fechar" }).click();

    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    /**
     * The Paradas cell specifically, and not the row.
     *
     * Asserting `/2` against the whole row passed with the refresh removed
     * entirely: the Data column reads `17/09/2026`, which contains `/2`. The
     * fourth cell is Paradas — identifier, rota, status, paradas — and it
     * carries nothing else that could match.
     */
    const progress = page
      .locator("tr", { hasText: routeName })
      .first()
      .locator("td")
      .nth(3);


    await expect(
      progress,
      "o quadro continuou mostrando uma parada depois de fechar o painel",
    ).toContainText("/2", { timeout: 25_000 });
  });
});
