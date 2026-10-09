import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  BASE,
  accessTokenOf,
  apiAs,
  apiLogin,
  browserUsers,
  ndjsonRows,
  ownDriver,
  signedInContext,
} from "./support/login";
import { businessToday } from "./support/operation";
import {
  clickUntilVisible,
  socketConnected,
  waitForHydration,
} from "./support/ui";

/**
 * Support tickets and the operations alert balloon (decision 14.6, design
 * "tickets de atendimento" §6.6 and its Playwright plan).
 *
 * The driver acts from the phone — the API, as the app calls it — and the
 * office, with a deliveries screen open, has to be told without touching the
 * page: a card in the balloon at the bottom right. The card leads to the
 * ticket; the ticket is taken, decided and closed from there. A person who may
 * only read the deliveries sees the ticket and none of the buttons.
 */
test.describe.configure({ mode: "serial" });

test.setTimeout(240_000);

const USERS = browserUsers();
const BUSINESS = USERS.companies.full.id;
const RUN = `${Date.now()}`.slice(-7);

let office: { context: BrowserContext; page: Page; token: string };
let driverToken = "";
let driver: {
  driverId: string;
  vehicleId: string;
  email: string;
  name: string;
};
const opened = { ticketId: "" };

test.beforeAll(async ({ browser }) => {
  const signed = await signedInContext(browser, "admin");
  office = { ...signed, token: await accessTokenOf(signed.context) };

  // A driver of this file's own: routes are started below, and a driver holds
  // one in progress at a time.
  driver = await ownDriver(office.token, "Atendimento");
  driverToken = await apiLogin(driver.email);
});

test.afterAll(async () => {
  await office?.context.close();
});

async function ok(
  response: Response,
  what: string,
): Promise<Record<string, any>> {
  const body = await response.text();

  expect([200, 201], `${what}: ${body.slice(0, 400)}`).toContain(
    response.status,
  );

  return body ? JSON.parse(body) : {};
}

const balloon = (page: Page) =>
  page.getByRole("region", { name: "Alertas da operação" });

test("the driver opens a ticket and the bubble alerts the back office without reloading", async () => {
  const { page } = office;
  const subject = `Pneu furado na rota ${RUN}`;

  // Any screen of the office: the balloon lives in the layout.
  const connected = socketConnected(page);

  await page.goto(`${BASE}/dashboard/routes`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("main table").first()).toBeVisible({
    timeout: 60_000,
  });
  await waitForHydration(page.getByRole("button", { name: "Atualizar" }));
  await connected;

  const created = await ok(
    await apiAs(driverToken, `/chat/tickets`, {
      method: "POST",
      headers: { "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({
        subject,
        message: {
          kind: "TEXT",
          body: "Preciso de ajuda, estou parado no acostamento.",
          clientSubmissionId: crypto.randomUUID(),
        },
      }),
    }),
    "abrir atendimento",
  );

  opened.ticketId = (created.data?.id ?? created.id) as string;
  expect(
    opened.ticketId,
    `resposta: ${JSON.stringify(created).slice(0, 300)}`,
  ).toBeTruthy();

  // This ticket's card, by its subject: the fixture's driver also works in
  // other specs, and the balloon stacks one card per ticket.
  const card = balloon(page).getByRole("button", {
    name: new RegExp(`Novo atendimento de ${driver.name}.*${subject}`),
  });

  await expect(card, "o balão não avisou o atendimento novo").toBeVisible({
    timeout: 20_000,
  });

  await card.click();

  await expect(page).toHaveURL(
    new RegExp(
      `tab=chat.*ticket=${opened.ticketId}|ticket=${opened.ticketId}.*tab=chat`,
    ),
    {
      timeout: 60_000,
    },
  );
  await expect(page.getByText(subject).first()).toBeVisible({
    timeout: 60_000,
  });
});

test("the back office takes over and closes the ticket", async () => {
  const { page } = office;

  const attendant = page.getByRole("button", {
    name: "Atendente",
    exact: true,
  });
  await clickUntilVisible(
    attendant,
    page.getByRole("menuitem", { name: "Assumir" }),
  );
  await page.getByRole("menuitem", { name: "Assumir" }).click();

  await expect
    .poll(
      async () => {
        const detail = await ok(
          await apiAs(office.token, `/chat/tickets/${opened.ticketId}`),
          "detalhe",
        );

        return (detail.data ?? detail).assignee?.id ?? null;
      },
      { timeout: 30_000, message: "o atendimento não ficou com a gestora" },
    )
    .toBe(USERS.users.admin.id);

  const dialog = page.getByRole("dialog", { name: "Encerrar atendimento" });
  await clickUntilVisible(
    page.getByRole("button", { name: "Encerrar", exact: true }).first(),
    dialog,
  );

  const note = dialog.locator("textarea");
  if (await note.count()) await note.fill("Socorro mecânico enviado.");

  await dialog.getByRole("button", { name: "Encerrar", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });

  await expect
    .poll(
      async () => {
        const detail = await ok(
          await apiAs(office.token, `/chat/tickets/${opened.ticketId}`),
          "detalhe",
        );

        return (detail.data ?? detail).status;
      },
      { timeout: 30_000 },
    )
    .toBe("CLOSED");

  await expect(page.getByRole("button", { name: "Reabrir" })).toBeVisible({
    timeout: 30_000,
  });
});

test("a read-only person sees the ticket and no write button", async ({
  browser,
}) => {
  const reader = await signedInContext(browser, "readOnlyUser");

  await reader.page.goto(
    `${BASE}/dashboard/deliveries?tab=chat&ticket=${opened.ticketId}`,
    {
      waitUntil: "domcontentloaded",
    },
  );

  await expect(
    reader.page.getByText(`Pneu furado na rota ${RUN}`).first(),
  ).toBeVisible({ timeout: 60_000 });

  for (const name of [
    "Atendente",
    "Encerrar",
    "Reabrir",
    "Autorizar",
    "Negar",
  ]) {
    await expect(
      reader.page.getByRole("button", { name, exact: true }),
      `quem só lê recebeu o botão ${name}`,
    ).toHaveCount(0);
  }

  // The trail is still theirs to read.
  await expect(
    reader.page.getByRole("button", { name: "Histórico" }),
  ).toBeVisible();

  await reader.context.close();
});

test("an authorization request arrives red and is authorized from the bubble", async () => {
  // A type that asks the tower before the driver may leave the address.
  const typeName = `Avaria com autorização ${RUN}`;

  await ok(
    await apiAs(
      office.token,
      `/occurrence-type/create-occurrence-type/${BUSINESS}`,
      {
        method: "POST",
        body: JSON.stringify({
          name: typeName,
          category: "NOT_DELIVERED",
          requires_authorization: true,
        }),
      },
    ),
    "tipo com autorização",
  );

  const listed = await apiAs(
    office.token,
    `/occurrence-type/list-occurrence-type?businessId=${BUSINESS}&page=1&pageSize=20&search=${RUN}`,
  );
  const typeId = ndjsonRows(await listed.text()).find(
    (row) => row.name === typeName,
  )!.id as string;

  // A delivery on a route of the driver's, under way.
  const shipper = ndjsonRows(
    await (
      await apiAs(
        office.token,
        `/shipper/search-shipper-business?businessId=${BUSINESS}&search=E2E%20Web`,
      )
    ).text(),
  )[0];

  const recipient = `Cliente com avaria ${RUN}`;
  const delivery = await ok(
    await apiAs(office.token, `/delivery/create-delivery/${BUSINESS}`, {
      method: "POST",
      body: JSON.stringify({
        shipperId: shipper.id,
        recipient_name: recipient,
        cep: "01001000",
        city: "São Paulo",
        uf: "SP",
        street: "Rua da Avaria",
        address_number: "7",
      }),
    }),
    "entrega",
  );

  const route = await ok(
    await apiAs(office.token, `/route/create-route/${BUSINESS}`, {
      method: "POST",
      body: JSON.stringify({
        driverId: driver.driverId,
        vehicleId: driver.vehicleId,
        name: `Rota com avaria ${RUN}`,
        scheduled_date: businessToday(),
        deliveryIds: [delivery.data.id],
      }),
    }),
    "rota",
  );

  await ok(
    await apiAs(
      office.token,
      `/route/release-route/${route.data.id}/business/${BUSINESS}`,
      {
        method: "PATCH",
        body: JSON.stringify({ released: true }),
      },
    ),
    "liberar",
  );

  await ok(
    await apiAs(
      driverToken,
      `/route/start-route/${route.data.id}/business/${BUSINESS}`,
      {
        method: "POST",
        body: JSON.stringify({ vehicleId: driver.vehicleId }),
      },
    ),
    "iniciar",
  );

  const { page } = office;

  const connected = socketConnected(page);

  await page.goto(`${BASE}/dashboard/routes`, {
    waitUntil: "domcontentloaded",
  });
  await waitForHydration(page.getByRole("button", { name: "Atualizar" }));
  await connected;

  await ok(
    await apiAs(
      driverToken,
      `/delivery/report-occurrence/${delivery.data.id}/business/${BUSINESS}`,
      {
        method: "POST",
        body: JSON.stringify({
          occurrenceTypeId: typeId,
          client_submission_id: crypto.randomUUID(),
          description: "Caixas molhadas, o cliente quer recusar.",
          latitude: -23.55,
          longitude: -46.63,
        }),
      },
    ),
    "ocorrência com autorização",
  );

  const card = balloon(page).getByRole("button", {
    name: new RegExp(`Pedido de autorização.*${recipient}`),
  });

  await expect(card, "o pedido de autorização não chegou ao balão").toBeVisible(
    { timeout: 20_000 },
  );

  await card.click();
  await expect(page).toHaveURL(/tab=chat/, { timeout: 60_000 });

  const dialog = page.getByRole("dialog", { name: "Autorizar e encerrar" });
  await clickUntilVisible(
    page.getByRole("button", { name: "Autorizar", exact: true }).first(),
    dialog,
  );

  const note = dialog.locator("textarea");
  if (await note.count()) await note.fill("Pode deixar com o cliente.");

  await dialog.getByRole("button", { name: "Autorizar", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });

  // The red card is gone: the request was decided.
  await expect(card).toHaveCount(0, { timeout: 30_000 });

  const pending = await apiAs(
    office.token,
    `/delivery/occurrence-authorizations?businessId=${BUSINESS}`,
  );
  expect(await pending.text()).not.toContain(delivery.data.id);
});
