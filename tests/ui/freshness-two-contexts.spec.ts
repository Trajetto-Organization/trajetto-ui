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
import { tinyJpeg } from "./support/journey-data";
import {
  clickUntilVisible,
  socketConnected,
  waitForHydration,
} from "./support/ui";

/**
 * Two people, one company, two browsers (REV-23, decision 2.3).
 *
 * The MASTER changes a catalogue of the company — a shipper, an occurrence
 * type, a status reason — or rules on a receipt in the proof audit. The
 * company's manager has the deliveries screen open in another browser. Two
 * ways the change has to reach her:
 *
 * - by itself, through `catalogChanged`, in a picker she has OPEN (the list is
 *   mounted and fresh for five seconds, so nothing but the hint refetches it);
 * - by "Atualizar", the guaranteed manual gesture, on the server-rendered
 *   tabs.
 *
 * The MASTER writes through the API with his own session: what is under test
 * is the other browser.
 */
test.describe.configure({ mode: "serial" });

test.setTimeout(240_000);

const USERS = browserUsers();
const BUSINESS = USERS.companies.full.id;
const RUN = `${Date.now()}`.slice(-7);

let master: { context: BrowserContext; page: Page; token: string };
let manager: { context: BrowserContext; page: Page; token: string };

test.beforeAll(async ({ browser }) => {
  const m = await signedInContext(browser, "master");
  master = { ...m, token: await accessTokenOf(m.context) };

  const a = await signedInContext(browser, "admin");
  manager = { ...a, token: await accessTokenOf(a.context) };
});

test.afterAll(async () => {
  await master?.context.close();
  await manager?.context.close();
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

async function rows(
  token: string,
  path: string,
): Promise<Record<string, unknown>[]> {
  const response = await apiAs(token, path);
  const body = await response.text();

  expect(response.status, `${path}: ${body.slice(0, 300)}`).toBe(200);

  return ndjsonRows(body);
}

/** Opens a tab of the deliveries page and waits for its table. */
async function openTab(page: Page, tab: string): Promise<void> {
  await page.goto(`${BASE}/dashboard/deliveries?tab=${tab}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("main table").first()).toBeVisible({
    timeout: 60_000,
  });
}

async function revalidate(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: "Atualizar" });

  await expect(button).toBeEnabled({ timeout: 30_000 });
  await waitForHydration(button);
  await button.click();
}

/**
 * Atualizar until `expected` is in the table. The button is rate limited by
 * design (3 clicks in 30 s, then 15 s of cooldown, per screen): this file
 * clicks it on four tabs in a row, and in a fast run a click landed in the
 * cooldown and refreshed nothing. A person waits and clicks again; so does
 * this — the refresh still has to bring the change, or it fails.
 */
async function revalidateUntil(page: Page, expected: string): Promise<void> {
  const table = page.locator("main table").first();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await revalidate(page);

    try {
      await expect(table).toContainText(expected, { timeout: 15_000 });
      return;
    } catch {
      await page.waitForTimeout(16_000);
    }
  }

  await expect(
    table,
    "Atualizar não trouxe a mudança feita na outra sessão",
  ).toContainText(expected);
}

test("a shipper created by the MASTER shows up on its own in the open selector (catalogChanged)", async () => {
  const { page } = manager;
  const name = `Embarcador ao vivo ${RUN}`;

  // The hint is fire-and-forget: emitted before this tab's socket joined the
  // company room, it reaches nobody. Under three workers the page connected
  // after the MASTER wrote, and the test failed about timing, not the product.
  const connected = socketConnected(page);

  await page.goto(`${BASE}/dashboard/deliveries`, {
    waitUntil: "domcontentloaded",
  });

  const dialog = page
    .getByRole("dialog")
    .filter({ has: page.locator("#shipper-selector") });
  await clickUntilVisible(
    page.getByRole("button", { name: "Nova Entrega" }),
    dialog,
  );

  const options = page
    .getByRole("listbox")
    .or(page.locator("[cmdk-list]"))
    .first();
  await clickUntilVisible(dialog.locator("#shipper-selector"), options);

  // The open list, loaded, without the new shipper.
  await expect(options).toContainText("Embarcador E2E Web", {
    timeout: 30_000,
  });
  await expect(options).not.toContainText(name);

  // Past the picker's five-second freshness: from here on only the hint can
  // make the open list ask again.
  await page.waitForTimeout(6_000);
  await connected;

  await ok(
    await apiAs(master.token, `/shipper/create-shipper/${BUSINESS}`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
    "embarcador pelo MASTER",
  );

  await expect(
    options,
    "o seletor aberto não recebeu o embarcador novo",
  ).toContainText(name, {
    timeout: 30_000,
  });
});

test("the Embarcadores tab shows the MASTER's edit after Atualizar", async () => {
  const { page } = manager;
  const shipperId = (
    await rows(
      master.token,
      `/shipper/search-shipper-business?businessId=${BUSINESS}&search=${RUN}`,
    )
  )[0].id as string;
  const renamed = `Embarcador renomeado ${RUN}`;

  await openTab(page, "shippers");
  await expect(page.locator("main table").first()).toContainText(
    `Embarcador ao vivo ${RUN}`,
    { timeout: 60_000 },
  );

  await ok(
    await apiAs(
      master.token,
      `/shipper/update-shipper/${shipperId}/business/${BUSINESS}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: renamed }),
      },
    ),
    "renomear embarcador",
  );

  await revalidateUntil(page, renamed);
  await expect(page.locator("main table").first()).not.toContainText(
    `Embarcador ao vivo ${RUN}`,
  );
});

test("occurrence types: the new one and the renamed one arrive with Atualizar", async () => {
  const { page } = manager;
  const name = `Tipo do MASTER ${RUN}`;

  await openTab(page, "occurrence-types");

  await ok(
    await apiAs(
      master.token,
      `/occurrence-type/create-occurrence-type/${BUSINESS}`,
      {
        method: "POST",
        body: JSON.stringify({ name, category: "NOT_DELIVERED" }),
      },
    ),
    "tipo de ocorrência",
  );

  await revalidateUntil(page, name);

  const typeId = (
    await rows(
      master.token,
      `/occurrence-type/list-occurrence-type?businessId=${BUSINESS}&page=1&pageSize=20&search=${RUN}`,
    )
  ).find((row) => row.name === name)!.id as string;

  await ok(
    await apiAs(
      master.token,
      `/occurrence-type/update-occurrence-type/${typeId}/business/${BUSINESS}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: `${name} (renomeado)` }),
      },
    ),
    "renomear tipo",
  );

  await revalidateUntil(page, `${name} (renomeado)`);
});

test("status reasons: the one created by the MASTER arrives with Atualizar", async () => {
  const { page } = manager;
  const name = `Motivo do MASTER ${RUN}`;

  await openTab(page, "status-change-reasons");

  await ok(
    await apiAs(
      master.token,
      `/status-change-reason/create-status-change-reason/${BUSINESS}`,
      {
        method: "POST",
        body: JSON.stringify({ name, description: "Criado em outra sessão." }),
      },
    ),
    "motivo de status",
  );

  await revalidateUntil(page, name);
});

test("audit: the proof approved by the MASTER leaves the manager's queue with Atualizar", async () => {
  // A receipt to audit: a delivery on a route of the company's driver, proved
  // from the phone.
  const recipient = `Cliente auditado ${RUN}`;
  const shipperId = (
    await rows(
      manager.token,
      `/shipper/search-shipper-business?businessId=${BUSINESS}&search=E2E%20Web`,
    )
  )[0].id as string;

  const delivery = await ok(
    await apiAs(manager.token, `/delivery/create-delivery/${BUSINESS}`, {
      method: "POST",
      body: JSON.stringify({
        shipperId,
        recipient_name: recipient,
        cep: "01001000",
        city: "São Paulo",
        uf: "SP",
        street: "Rua da Auditoria",
        address_number: "1",
      }),
    }),
    "entrega",
  );

  const deliveryId = delivery.data.id as string;

  // A driver of this test's own: a driver holds one route in progress at a
  // time, and other specs start routes too.
  const driver = await ownDriver(manager.token, "Auditoria");

  const route = await ok(
    await apiAs(manager.token, `/route/create-route/${BUSINESS}`, {
      method: "POST",
      body: JSON.stringify({
        driverId: driver.driverId,
        vehicleId: driver.vehicleId,
        name: `Rota auditada ${RUN}`,
        scheduled_date: businessToday(),
        deliveryIds: [deliveryId],
      }),
    }),
    "rota",
  );

  await ok(
    await apiAs(
      manager.token,
      `/route/release-route/${route.data.id}/business/${BUSINESS}`,
      {
        method: "PATCH",
        body: JSON.stringify({ released: true }),
      },
    ),
    "liberar rota",
  );

  const driverToken = await apiLogin(driver.email);

  await ok(
    await apiAs(
      driverToken,
      `/route/start-route/${route.data.id}/business/${BUSINESS}`,
      {
        method: "POST",
        body: JSON.stringify({ vehicleId: driver.vehicleId }),
      },
    ),
    "iniciar rota",
  );

  await ok(
    await apiAs(
      driverToken,
      `/delivery/arrival/${deliveryId}/business/${BUSINESS}`,
      {
        method: "POST",
        body: JSON.stringify({
          client_submission_id: crypto.randomUUID(),
          latitude: -23.55,
          longitude: -46.63,
        }),
      },
    ),
    "chegada",
  );

  const jpeg = tinyJpeg();
  const presign = await ok(
    await apiAs(driverToken, `/uploads/presign/${BUSINESS}`, {
      method: "POST",
      body: JSON.stringify({
        uploadType: "deliveryPhotos",
        files: [
          {
            originalFilename: "canhoto.jpg",
            contentType: "image/jpeg",
            size: jpeg.byteLength,
          },
        ],
      }),
    }),
    "presign",
  );

  const upload = presign.uploads[0] as { key: string; uploadUrl: string };
  const put = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": "image/jpeg",
      "content-length": String(jpeg.byteLength),
      authorization: `Bearer ${driverToken}`,
    },
    body: jpeg,
  });

  expect(put.status).toBeLessThan(300);

  const delivered = (
    await rows(
      manager.token,
      `/occurrence-type/list-occurrence-type?businessId=${BUSINESS}&page=1&pageSize=50&category=DELIVERED`,
    )
  )[0];

  await ok(
    await apiAs(
      driverToken,
      `/delivery/report-occurrence/${deliveryId}/business/${BUSINESS}`,
      {
        method: "POST",
        body: JSON.stringify({
          occurrenceTypeId: delivered.id,
          client_submission_id: crypto.randomUUID(),
          latitude: -23.55,
          longitude: -46.63,
          receipt_photo: upload.key,
          received_by: "Recebedor auditado",
        }),
      },
    ),
    "comprovante",
  );

  // The manager has the queue open with the card in it: the Torre's
  // Auditoria view since the product meeting of 14/10/2026.
  const { page } = manager;

  await page.goto(`${BASE}/dashboard/control-tower?view=audit`, {
    waitUntil: "domcontentloaded",
  });

  const card = page
    .locator("li, article, [data-proof-audit-card]", { hasText: recipient })
    .first();
  await expect(card).toBeVisible({ timeout: 60_000 });

  // The MASTER rules on it from his own session.
  const pending = await rows(
    master.token,
    `/delivery/proof-audits?businessId=${BUSINESS}&status=PENDING&page=1&pageSize=50`,
  );
  const audit = pending.find((row) => JSON.stringify(row).includes(deliveryId));

  expect(audit, "a auditoria do comprovante não está pendente").toBeTruthy();

  await ok(
    await apiAs(
      master.token,
      `/delivery/proof-audit/${audit!.id}/business/${BUSINESS}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "APPROVED" }),
      },
    ),
    "aprovar pelo MASTER",
  );

  const stillPending = page.locator("li, article, [data-proof-audit-card]", {
    hasText: recipient,
  });

  // Same cooldown as revalidateUntil: click again after it, never give up early.
  for (
    let attempt = 0;
    attempt < 4 && (await stillPending.count()) > 0;
    attempt += 1
  ) {
    await revalidate(page);
    await expect(stillPending)
      .toHaveCount(0, { timeout: 15_000 })
      .catch(() => page.waitForTimeout(16_000));
  }

  await expect(
    stillPending,
    "o comprovante aprovado em outra sessão continua na fila de pendentes",
  ).toHaveCount(0);
});
