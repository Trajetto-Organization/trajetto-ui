import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  BASE,
  accessTokenOf,
  apiAs,
  apiLogin,
  ndjsonRows,
  setKnownPassword,
  signedInContext,
} from "./support/login";
import { businessToday, randomCnpj } from "./support/operation";
import {
  nfeXml,
  randomCpf,
  randomPlate,
  randomRenavam,
  tinyJpeg,
} from "./support/journey-data";
import { clickUntilVisible } from "./support/ui";

/**
 * The deliveries operation end to end, as the people who run it (decision
 * 13.3): the MASTER opens a company and its manager, the manager registers a
 * driver and a truck, imports NF-e XMLs, plans a route and releases it, the
 * driver works it from the phone (the API, as the app calls it), and the
 * office sees it land — on the tower, in monitoring, in the proof audit, and
 * in notifications and activity.
 *
 * Screens where the step IS the product (the company form, the module
 * switch, the user form, the XML import, the release, the audit verdict) are
 * driven through the browser; the rest goes through the API with the same
 * person's session, so each step reaches the screen the next one checks.
 *
 * Serial on purpose: each step needs the one before it.
 */
test.describe.configure({ mode: "serial" });

test.setTimeout(240_000);

const RUN = `${Date.now()}`.slice(-7);

const company = {
  name: `Transportadora Jornada ${RUN}`,
  cnpj: randomCnpj(),
  id: "",
};

const admin = {
  email: `gestora.jornada.${RUN}@trajetto.test`,
  name: `Gestora Jornada ${RUN}`,
  token: "",
};
const driver = {
  email: `motorista.jornada.${RUN}@trajetto.test`,
  name: `Motorista Jornada ${RUN}`,
  id: "",
  token: "",
};

const operation = {
  vehicleId: "",
  plate: "",
  shipperId: "",
  deliveryIds: [] as string[],
  recipients: [`Mercado Jornada ${RUN}A`, `Mercado Jornada ${RUN}B`],
  routeId: "",
  routeCode: 0,
  routeName: `Rota Jornada ${RUN}`,
};

let master: { context: BrowserContext; page: Page };
let office: { context: BrowserContext; page: Page };

test.afterAll(async () => {
  await master?.context.close();
  await office?.context.close();
});

async function rowsOf(
  token: string,
  path: string,
): Promise<Record<string, unknown>[]> {
  const response = await apiAs(token, path);
  const body = await response.text();

  expect(response.status, `${path}: ${body.slice(0, 300)}`).toBe(200);

  return ndjsonRows(body);
}

async function created(
  response: Response,
  what: string,
): Promise<Record<string, any>> {
  const body = await response.text();

  expect([200, 201], `${what}: ${body.slice(0, 400)}`).toContain(
    response.status,
  );

  return body ? JSON.parse(body) : {};
}

test("the MASTER registers the company through the form", async ({
  browser,
}) => {
  master = await signedInContext(browser, "master");
  const { page } = master;

  await page.goto(`${BASE}/admin/business`, { waitUntil: "domcontentloaded" });
  const dialog = page.getByRole("dialog", { name: "Criar Nova Empresa" });
  await clickUntilVisible(
    page.getByRole("button", { name: "Criar Empresa" }).first(),
    dialog,
  );

  const field = (name: string) => dialog.locator(`input[name="${name}"]`);

  await field("corporate_reason").fill(company.name);
  await field("cnpj").pressSequentially(company.cnpj);
  await field("cnae").pressSequentially("4930202");
  await field("email").fill(`contato.jornada.${RUN}@exemplo.com.br`);
  await field("telephone").pressSequentially("11999999999");
  await field("responsible_name").fill("Responsável Jornada");
  await field("cep").pressSequentially("01001000");

  // The CEP fills the address (ViaCEP); a field it could not fill stays
  // editable and is filled here, as a person would.
  await page.waitForTimeout(2_500);

  for (const [name, value] of [
    ["city", "São Paulo"],
    ["uf", "SP"],
    ["street", "Praça da Sé"],
  ] as const) {
    const input = field(name);

    if (
      (await input.count()) &&
      (await input.isEditable()) &&
      !(await input.inputValue())
    ) {
      await input.fill(value);
    }
  }

  await field("address_number").fill("100");

  await dialog.getByRole("button", { name: "Criar Empresa" }).click();
  await expect(dialog).toBeHidden({ timeout: 60_000 });

  const token = await accessTokenOf(master.context);
  const listed = await rowsOf(
    token,
    `/business/list-business?page=1&pageSize=5&search=${company.cnpj}`,
  );

  expect(listed.map((row) => row.corporate_reason)).toContain(company.name);
  company.id = listed.find((row) => row.corporate_reason === company.name)!
    .id as string;

  // And the new company is on the MASTER's screen.
  await page.goto(`${BASE}/admin/business?search=${company.cnpj}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText(company.name).first()).toBeVisible({
    timeout: 60_000,
  });
});

test("the MASTER turns on the company's Entregas module", async () => {
  const { page } = master;

  await page.goto(`${BASE}/admin/business?search=${company.cnpj}`, {
    waitUntil: "domcontentloaded",
  });

  const row = page.locator("tr", { hasText: company.name }).first();
  await expect(row).toBeVisible({ timeout: 60_000 });

  await clickUntilVisible(
    row.getByRole("button", { name: /^Abrir menu/i }),
    page.getByRole("menuitem", { name: "Módulos Contratados" }),
  );

  await page.getByRole("menuitem", { name: "Módulos Contratados" }).click();

  const deliveries = page.getByRole("switch", {
    name: "Alternar módulo Entregas",
  });

  await expect(deliveries).toBeVisible({ timeout: 30_000 });

  if ((await deliveries.getAttribute("aria-checked")) !== "true") {
    await deliveries.click();
  }

  await expect(deliveries).toHaveAttribute("aria-checked", "true", {
    timeout: 30_000,
  });

  const token = await accessTokenOf(master.context);
  const plan = await (
    await apiAs(token, `/business/entitlements/${company.id}`)
  ).json();

  expect(
    JSON.stringify(plan),
    "o módulo Entregas não ficou ligado na API",
  ).toMatch(/"module":"DELIVERIES","enabled":true/);
});

test("the MASTER registers the company's manager", async () => {
  const { page } = master;

  await page.goto(`${BASE}/admin/user-registration?businessId=${company.id}`, {
    waitUntil: "domcontentloaded",
  });

  const dialog = page.getByRole("dialog", { name: "Criar Novo Usuário" });
  await clickUntilVisible(
    page.getByRole("button", { name: "Criar Usuário" }).first(),
    dialog,
  );

  await dialog.getByLabel("E-mail *").fill(admin.email);
  await dialog.getByLabel("Nome *").fill(admin.name);

  await clickUntilVisible(
    dialog.getByRole("combobox").first(),
    page.getByRole("option", { name: "Administrador" }),
  );
  await page.getByRole("option", { name: "Administrador" }).click();

  await dialog.getByRole("button", { name: "Criar Usuário" }).click();

  // The dialog closes after the action AND the screen's refresh: on a loaded
  // dev server that refresh was measured at 6-11 s per round, several rounds.
  await expect(dialog).toBeHidden({ timeout: 120_000 });

  await expect(page.getByText(admin.email).first()).toBeVisible({
    timeout: 60_000,
  });

  // The API e-mailed a generated password; the person reads it there.
  setKnownPassword(admin.email);
});

test("the manager signs in through the form and registers a driver, a vehicle and a shipper", async ({
  browser,
}) => {
  office = await signedInContext(browser, { email: admin.email });

  await expect(office.page).toHaveURL(/\/dashboard/);
  await expect(
    office.page.getByRole("link", { name: "Entregas", exact: true }).first(),
  ).toBeVisible({
    timeout: 60_000,
  });

  admin.token = await accessTokenOf(office.context);
  const token = admin.token;

  await created(
    await apiAs(token, `/shipper/create-shipper/${company.id}`, {
      method: "POST",
      body: JSON.stringify({ name: `Indústria Jornada ${RUN}` }),
    }),
    "embarcador",
  );

  operation.shipperId = (
    await rowsOf(
      token,
      `/shipper/search-shipper-business?businessId=${company.id}&search=Jornada`,
    )
  )[0].id as string;

  await created(
    await apiAs(token, `/driver/create-driver/${company.id}`, {
      method: "POST",
      body: JSON.stringify({
        name: driver.name,
        birth_date: "1990-05-10",
        cnh: `${Date.now()}`.slice(-11),
        cpf: randomCpf(),
        rg: `${Date.now()}`.slice(-9),
        cep: "01001000",
        city: "São Paulo",
        uf: "SP",
        street: "Praça da Sé",
        address_number: "1",
        status: "ACTIVE",
        contract_type: "OWNED",
      }),
    }),
    "motorista",
  );

  driver.id = (
    await rowsOf(
      token,
      `/driver/search-driver-business?businessId=${company.id}&search=${encodeURIComponent(driver.name)}`,
    )
  )[0].id as string;

  await created(
    await apiAs(token, `/fuel-type/create-fuel-type/${company.id}`, {
      method: "POST",
      body: JSON.stringify({ description: "Diesel" }),
    }),
    "combustível",
  );

  const fuelTypeId = (
    await rowsOf(
      token,
      `/fuel-type/search-fuel-type-business?businessId=${company.id}&search=Diesel`,
    )
  )[0].id as string;

  const plate = randomPlate();
  operation.plate = plate;

  await created(
    await apiAs(token, `/vehicle/create-vehicle/${company.id}`, {
      method: "POST",
      body: JSON.stringify({
        description: "Caminhão da jornada",
        license_plate: plate,
        brand: "Volvo",
        model: "VM 270",
        acquisition_date: "2022-01-10",
        fleet_type: "OWNED",
        current_mileage: 1000,
        maintenance_interval_km: 10000,
        maintenance_interval_months: 6,
        renavam: randomRenavam(),
        manufacturing_year: "2021-01-01",
        model_year: "2022-01-01",
        km_per_liter: 3,
        number_of_axles: 2,
        status: "ACTIVE",
        fuelTypeId,
        driverId: driver.id,
      }),
    }),
    "veículo",
  );

  operation.vehicleId = (
    await rowsOf(
      token,
      `/vehicle/search-vehicle-business?businessId=${company.id}&search=${plate}`,
    )
  )[0].id as string;

  // The driver's login: the manager registers it, the API e-mails it.
  await created(
    await apiAs(token, `/user/create-user`, {
      method: "POST",
      body: JSON.stringify({
        email: driver.email,
        name: driver.name,
        role: "BUSINESS_USER",
        businessId: company.id,
        driverId: driver.id,
        userType: "driver",
      }),
    }),
    "usuário do motorista",
  );

  setKnownPassword(driver.email);

  // What was registered is on the manager's screens.
  await office.page.goto(`${BASE}/dashboard/driver`, {
    waitUntil: "domcontentloaded",
  });
  await expect(office.page.getByText(driver.name).first()).toBeVisible({
    timeout: 60_000,
  });
});

test("the manager imports the NF-e through the XML dialog", async () => {
  const { page } = office;

  await page.goto(`${BASE}/dashboard/deliveries`, {
    waitUntil: "domcontentloaded",
  });

  await clickUntilVisible(
    page.getByRole("button", { name: "Importar" }),
    page.getByRole("menuitem", { name: "XML da NF-e" }),
  );

  await page.getByRole("menuitem", { name: "XML da NF-e" }).click();

  const dialog = page.getByRole("dialog", { name: "Importar XML de NF-e" });
  await expect(dialog).toBeVisible({ timeout: 30_000 });

  await dialog.locator('input[type="file"]').setInputFiles(
    operation.recipients.map((recipient, index) => ({
      name: `nota-${RUN}-${index + 1}.xml`,
      mimeType: "text/xml",
      buffer: Buffer.from(nfeXml({ run: RUN, index: index + 1, recipient })),
    })),
  );

  await expect(dialog.getByText("2 de", { exact: false })).toBeVisible({
    timeout: 30_000,
  });
  await dialog.getByRole("button", { name: /^Importar 2 arquivo/ }).click();

  // One line per file, naming the delivery each note became.
  for (const recipient of operation.recipients) {
    await expect(dialog.getByText(`Importada — ${recipient}`)).toBeVisible({
      timeout: 90_000,
    });
  }

  await expect(dialog.getByText("Com erro")).toBeVisible();

  await dialog
    .getByRole("button", { name: "Fechar", exact: true })
    .first()
    .click();

  const listed = await rowsOf(
    admin.token,
    `/delivery/list-delivery?businessId=${company.id}&page=1&pageSize=20&search=${encodeURIComponent(`Jornada ${RUN}`)}`,
  );

  operation.deliveryIds = operation.recipients.map(
    (recipient) =>
      listed.find((row) => row.recipient_name === recipient)?.id as string,
  );

  expect(
    operation.deliveryIds.every(Boolean),
    `entregas importadas: ${JSON.stringify(listed.map((r) => r.recipient_name))}`,
  ).toBe(true);

  await page.goto(
    `${BASE}/dashboard/deliveries?search=${encodeURIComponent(`Jornada ${RUN}`)}`,
    {
      waitUntil: "domcontentloaded",
    },
  );

  for (const recipient of operation.recipients) {
    await expect(page.getByText(recipient).first()).toBeVisible({
      timeout: 60_000,
    });
  }
});

test("the manager builds the route and releases it on the route page", async () => {
  const response = await apiAs(
    admin.token,
    `/route/create-route/${company.id}`,
    {
      method: "POST",
      body: JSON.stringify({
        driverId: driver.id,
        vehicleId: operation.vehicleId,
        name: operation.routeName,
        scheduled_date: businessToday(),
        deliveryIds: operation.deliveryIds,
      }),
    },
  );

  const route = (await created(response, "rota")).data;

  operation.routeId = route.id;
  operation.routeCode = route.code;

  const { page } = office;

  await page.goto(`${BASE}/dashboard/routes/${operation.routeId}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText(operation.routeName).first()).toBeVisible({
    timeout: 60_000,
  });

  const release = page.getByRole("button", {
    name: "Liberar para o motorista",
  });

  await expect(release).toBeEnabled({ timeout: 60_000 });
  await release.click();

  await expect(
    page.getByRole("button", { name: "Voltar ao planejamento" }),
  ).toBeVisible({ timeout: 60_000 });

  const released = await (
    await apiAs(
      admin.token,
      `/route/get-route/${operation.routeId}/business/${company.id}`,
    )
  ).json();

  expect(released.data?.status ?? released.status).toBe("RELEASED");
});

test("the driver works the route through the app (the API)", async () => {
  driver.token = await apiLogin(driver.email);

  const token = driver.token;
  const [first, second] = operation.deliveryIds;

  await created(
    await apiAs(
      token,
      `/route/start-route/${operation.routeId}/business/${company.id}`,
      {
        method: "POST",
        body: JSON.stringify({ vehicleId: operation.vehicleId }),
      },
    ),
    "iniciar a rota",
  );

  // A position, so the tower has somewhere to draw the truck.
  await created(
    await apiAs(token, `/route/positions`, {
      method: "POST",
      body: JSON.stringify({
        pings: [
          {
            latitude: -23.5505,
            longitude: -46.6333,
            recorded_at: new Date().toISOString(),
          },
        ],
      }),
    }),
    "posição",
  );

  await created(
    await apiAs(token, `/delivery/arrival/${first}/business/${company.id}`, {
      method: "POST",
      body: JSON.stringify({
        client_submission_id: crypto.randomUUID(),
        latitude: -23.5505,
        longitude: -46.6333,
      }),
    }),
    "chegada",
  );

  // The receipt photo: presigned, then PUT straight to storage, then its key.
  const jpeg = tinyJpeg();
  const presign = await created(
    await apiAs(token, `/uploads/presign/${company.id}`, {
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
    "presign do canhoto",
  );

  const upload = presign.uploads[0] as { key: string; uploadUrl: string };
  const put = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": "image/jpeg",
      "content-length": String(jpeg.byteLength),
      authorization: `Bearer ${token}`,
    },
    body: jpeg,
  });

  expect(put.status, `upload do canhoto: ${await put.text()}`).toBeLessThan(
    300,
  );

  // The type ids, read from the office catalog (the app gets them with its
  // own work list; which path it uses is not this journey's question).
  const types = await rowsOf(
    admin.token,
    `/occurrence-type/list-occurrence-type?businessId=${company.id}&page=1&pageSize=50`,
  );

  const delivered = types.find((type) => type.category === "DELIVERED");
  expect(delivered, "a empresa não tem tipo de entrega realizada").toBeTruthy();

  await created(
    await apiAs(
      token,
      `/delivery/report-occurrence/${first}/business/${company.id}`,
      {
        method: "POST",
        body: JSON.stringify({
          occurrenceTypeId: delivered!.id,
          client_submission_id: crypto.randomUUID(),
          latitude: -23.5505,
          longitude: -46.6333,
          receipt_photo: upload.key,
          received_by: "Recebedor da Jornada",
        }),
      },
    ),
    "comprovante de entrega",
  );

  // The second stop fails: the company's own "not delivered" type.
  await created(
    await apiAs(
      admin.token,
      `/occurrence-type/create-occurrence-type/${company.id}`,
      {
        method: "POST",
        // Blocking: it settles the delivery as Insucesso, which is what rings
        // the office (an informational occurrence stays in the trail only).
        body: JSON.stringify({
          name: "Cliente ausente",
          category: "NOT_DELIVERED",
          blocks_delivery: true,
        }),
      },
    ),
    "tipo de ocorrência",
  );

  const absent = (
    await rowsOf(
      admin.token,
      `/occurrence-type/list-occurrence-type?businessId=${company.id}&page=1&pageSize=50&category=NOT_DELIVERED`,
    )
  ).find((type) => type.name === "Cliente ausente");

  await created(
    await apiAs(
      token,
      `/delivery/report-occurrence/${second}/business/${company.id}`,
      {
        method: "POST",
        body: JSON.stringify({
          occurrenceTypeId: absent!.id,
          client_submission_id: crypto.randomUUID(),
          description: "Portão fechado, ninguém atendeu.",
          latitude: -23.5505,
          longitude: -46.6333,
        }),
      },
    ),
    "ocorrência de não entrega",
  );
});

test("the back office sees the route in the tower and in monitoring", async () => {
  const { page } = office;

  // Both stops are settled (one delivered, one Insucesso), so the route
  // ended by itself: the tower shows it among the routes concluded in the
  // last two hours, and the truck where the phone last reported it.
  await page.goto(`${BASE}/dashboard/control-tower`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("1 rota concluída nas últimas 2 h")).toBeVisible({
    timeout: 60_000,
  });
  // The truck is a map marker named "<plate> — Rota concluída" (its title and
  // accessible name, vehicle-marker.ts): the plate span inside it only shows
  // on hover, focus or street zoom, so it is found by that name, not by text.
  await expect(
    page.getByTitle(`${operation.plate} — Rota concluída`, { exact: true }),
  ).toBeVisible({
    timeout: 60_000,
  });

  await page.goto(`${BASE}/dashboard/deliveries?tab=monitoring`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page
      .getByText(operation.routeName)
      .or(page.getByText(`Rota ${operation.routeCode}`, { exact: false }))
      .first(),
  ).toBeVisible({ timeout: 60_000 });

  await page.goto(`${BASE}/dashboard/deliveries?tab=occurrences`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("Cliente ausente").first()).toBeVisible({
    timeout: 60_000,
  });
});

test("the back office approves the proof in the audit", async () => {
  const { page } = office;

  await page.goto(`${BASE}/dashboard/deliveries?tab=proof-audits`, {
    waitUntil: "domcontentloaded",
  });

  const card = page
    .locator("li, article, [data-proof-audit-card]", {
      hasText: operation.recipients[0],
    })
    .first();
  await expect(card).toBeVisible({ timeout: 60_000 });

  await card.getByRole("button", { name: "Aprovar" }).click();

  const audits = await rowsOf(
    admin.token,
    `/delivery/proof-audits?businessId=${company.id}&status=APPROVED&page=1&pageSize=20`,
  );

  await expect
    .poll(
      async () =>
        (
          await rowsOf(
            admin.token,
            `/delivery/proof-audits?businessId=${company.id}&status=APPROVED&page=1&pageSize=20`,
          )
        ).some((row) => JSON.stringify(row).includes(operation.deliveryIds[0])),
      {
        timeout: 30_000,
        message: `a auditoria não ficou aprovada: ${JSON.stringify(audits).slice(0, 300)}`,
      },
    )
    .toBe(true);
});

test("and what happened reaches the notifications and the activities", async () => {
  const { page } = office;

  // The insucesso rang the manager: a notification naming the delivery.
  await page.goto(`${BASE}/notifications`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toContainText(operation.recipients[1], {
    timeout: 60_000,
  });

  // And the company's activity feed carries the day's acts.
  await page.goto(`${BASE}/dashboard/activity`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("main")).toContainText(
    new RegExp(`Jornada ${RUN}|Rota ${operation.routeCode}`),
    {
      timeout: 60_000,
    },
  );
});
