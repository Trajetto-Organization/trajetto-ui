import { test, expect, type Page } from "@playwright/test";

import {
  CONTEXT,
  anyVehicle,
  api,
  createRoute,
  open,
  ownDelivery,
} from "./support/operation";
import { waitForHydration } from "./support/ui";

/**
 * The route's own page (decision 14.7, route design §5 and §11), whose
 * Playwright coverage went with the stops dialog it replaced
 * (route-stops-dialog.spec.ts, waveM notes): changing the order by the
 * buttons and by the keyboard drag, saving it, the 409 banner when someone
 * else changed the plan meanwhile, and "Adicionar entregas".
 *
 * Each test builds its own route out of deliveries of its own.
 */

test.setTimeout(180_000);

// One route at a time: concurrent creates in one company answer 500 today
// (the code race, reported to the API owner — see the package notes), and
// these tests are about the page, not that race.
test.describe.configure({ mode: "serial" });

interface RouteStopRow {
  id: string;
  sequence: number;
  delivery: { id: string; recipient_name: string };
}

async function stopsOf(routeId: string): Promise<RouteStopRow[]> {
  const response = await api(
    `/route/get-route/${routeId}/business/${CONTEXT.businessId}`,
  );
  const body = await response.json();

  expect(response.status, JSON.stringify(body).slice(0, 300)).toBe(200);

  const route = body.data ?? body;

  return [...(route.stops as RouteStopRow[])].sort(
    (a, b) => a.sequence - b.sequence,
  );
}

async function routeWith(recipients: string[]): Promise<string> {
  const deliveryIds: string[] = [];

  for (const recipient of recipients)
    deliveryIds.push(await ownDelivery(recipient));

  const route = await createRoute(
    deliveryIds,
    await anyVehicle(),
    `Rota da página ${Date.now()}`,
  );

  return route.id;
}

async function openRoute(page: Page, routeId: string): Promise<void> {
  await open(page, `/dashboard/routes/${routeId}`);
  await expect(
    page
      .getByRole("region", { name: "Entregas da rota" })
      .or(page.locator('[data-tutorial="route-stops"]'))
      .first(),
  ).toBeVisible({
    timeout: 60_000,
  });
}

const RUN = () => `${Date.now()}`.slice(-6);

test("Descer changes the order only on screen until Salvar ordem", async ({
  page,
}) => {
  const run = RUN();
  const names = [`Parada A ${run}`, `Parada B ${run}`, `Parada C ${run}`];
  const routeId = await routeWith(names);

  await openRoute(page, routeId);

  const down = page.getByRole("button", { name: `Descer ${names[0]}` });
  await waitForHydration(down);
  await down.click();

  await expect(
    page.getByText("A nova ordem ainda não foi salva."),
  ).toBeVisible();

  // Nothing written yet.
  expect(
    (await stopsOf(routeId)).map((stop) => stop.delivery.recipient_name),
  ).toEqual(names);

  await page.getByRole("button", { name: "Salvar ordem" }).click();
  await expect(page.getByText("A nova ordem ainda não foi salva.")).toHaveCount(
    0,
    { timeout: 30_000 },
  );

  await expect
    .poll(
      async () =>
        (await stopsOf(routeId)).map((stop) => stop.delivery.recipient_name),
      { timeout: 30_000 },
    )
    .toEqual([names[1], names[0], names[2]]);
});

test("keyboard dragging reorders and Descartar undoes", async ({ page }) => {
  const run = RUN();
  const names = [`Teclado A ${run}`, `Teclado B ${run}`, `Teclado C ${run}`];
  const routeId = await routeWith(names);

  await openRoute(page, routeId);

  // dnd-kit's keyboard sensor: Space picks up, arrows move, Space drops.
  const handle = page.getByRole("button", {
    name: `Arrastar ${names[0]}, posição 1 de 3`,
  });
  await waitForHydration(handle);
  await handle.focus();

  // One key at a time, as a person types: dnd-kit measures the next slot
  // after each move, and keys sent in the same frame land before it has.
  for (const key of ["Space", "ArrowDown", "ArrowDown", "Space"]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(250);
  }

  await expect(
    page.getByRole("button", { name: `Arrastar ${names[0]}, posição 3 de 3` }),
  ).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByText("A nova ordem ainda não foi salva."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Descartar" }).click();

  await expect(
    page.getByRole("button", { name: `Arrastar ${names[0]}, posição 1 de 3` }),
  ).toBeVisible();
  expect(
    (await stopsOf(routeId)).map((stop) => stop.delivery.recipient_name),
  ).toEqual(names);
});

test("saving over a plan someone else changed shows the notice and reloads", async ({
  page,
}) => {
  const run = RUN();
  const names = [`Conflito A ${run}`, `Conflito B ${run}`, `Conflito C ${run}`];
  const routeId = await routeWith(names);

  await openRoute(page, routeId);

  // This page starts changing the order…
  const down = page.getByRole("button", { name: `Descer ${names[0]}` });
  await waitForHydration(down);
  await down.click();
  await expect(
    page.getByText("A nova ordem ainda não foi salva."),
  ).toBeVisible();

  // …while another session reverses it.
  const stops = await stopsOf(routeId);
  const reordered = await api(
    `/route/reorder-stops/${routeId}/business/${CONTEXT.businessId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        orderedStopIds: [...stops].reverse().map((stop) => stop.id),
      }),
    },
  );

  expect(reordered.status, await reordered.text()).toBeLessThan(300);

  // Two honest outcomes, depending on which arrives first: the page hears the
  // change live and holds its edit behind the notice ("Recarregar"), or it
  // saves first and the API answers 409 ROUTE_PLAN_STALE — a toast, and the
  // current plan reloaded. Either way the other session's order wins.
  const notice = page.getByText(
    "Esta rota foi alterada por outra pessoa enquanto você mudava a ordem.",
  );
  const conflictToast = page.getByText(
    "Recarregamos a rota atual. Confira e refaça a alteração.",
  );

  const save = page.getByRole("button", { name: "Salvar ordem" });
  if (await save.isVisible()) await save.click();

  await expect(notice.or(conflictToast).first()).toBeVisible({
    timeout: 30_000,
  });

  // Nothing of this page's order was written over the other session's.
  expect(
    (await stopsOf(routeId)).map((stop) => stop.delivery.recipient_name),
  ).toEqual([...names].reverse());

  if (await notice.isVisible()) {
    // Recarregar, unless a live update already took the notice down.
    await page
      .getByRole("button", { name: "Recarregar" })
      .click({ timeout: 10_000 })
      .catch(() => undefined);
  }

  await expect(notice).toHaveCount(0, { timeout: 30_000 });
  await expect(
    page.getByRole("button", { name: `Arrastar ${names[2]}, posição 1 de 3` }),
  ).toBeVisible({
    timeout: 30_000,
  });
});

async function openAddSheet(page: Page) {
  const add = page.getByRole("button", { name: "Adicionar entregas" });
  await waitForHydration(add);
  await add.click();

  const sheet = page.getByRole("dialog", { name: /Adicionar entregas à Rota/ });
  await expect(sheet).toBeVisible({ timeout: 30_000 });

  return sheet;
}

test("Adicionar entregas puts an unrouted delivery on the route", async ({
  page,
}) => {
  const run = RUN();
  const routeId = await routeWith([`Base ${run}`]);
  const extra = `Avulsa ${run}`;

  await ownDelivery(extra);
  await openRoute(page, routeId);

  const sheet = await openAddSheet(page);

  // The deliveries of the test have no expected date: "Qualquer data".
  await sheet.getByRole("button", { name: "Qualquer data" }).click();
  await sheet
    .getByRole("searchbox")
    .or(sheet.getByLabel("Buscar entregas sem rota"))
    .first()
    .fill(extra);

  const pick = sheet.getByRole("checkbox", { name: `Selecionar ${extra}` });
  await expect(pick).toBeVisible({ timeout: 30_000 });
  await pick.click();

  await sheet.getByRole("button", { name: /^Adicionar \(1\)/ }).click();
  await expect(sheet).toBeHidden({ timeout: 30_000 });

  await expect(
    page.getByRole("button", { name: `Arrastar ${extra}, posição 2 de 2` }),
  ).toBeVisible({
    timeout: 30_000,
  });

  await expect
    .poll(
      async () =>
        (await stopsOf(routeId)).map((stop) => stop.delivery.recipient_name),
      { timeout: 30_000 },
    )
    .toEqual([`Base ${run}`, extra]);
});

test("the default filter of Adicionar entregas (route day or no date) lists the deliveries", async ({
  page,
}) => {
  // Regression for the API's double parse of the querystring: the default
  // filter sends includeUnscheduled=true, which used to answer 400.

  const run = RUN();
  const routeId = await routeWith([`Base filtro ${run}`]);
  const extra = `Sem data ${run}`;

  await ownDelivery(extra);
  await openRoute(page, routeId);

  const sheet = await openAddSheet(page);

  await expect(sheet.getByText("Validation Error")).toHaveCount(0, {
    timeout: 15_000,
  });
  await sheet
    .getByRole("searchbox")
    .or(sheet.getByLabel("Buscar entregas sem rota"))
    .first()
    .fill(extra);
  await expect(
    sheet.getByRole("checkbox", { name: `Selecionar ${extra}` }),
  ).toBeVisible({ timeout: 30_000 });
});
