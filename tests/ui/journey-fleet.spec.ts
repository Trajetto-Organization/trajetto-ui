import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from "./support/test";

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
import { randomCnpj } from "./support/operation";
import { clickUntilVisible } from "./support/ui";

/**
 * The fleet side of the day, by an employee with a full profile (decision
 * 13.3): a fuelling with its odometer photo, a vehicle checklist, a service
 * order, and the bill that pays it — assigned to the driver, who finds it in
 * his own area.
 *
 * Each of those four is created THROUGH ITS FORM, the way the office does
 * it: the wizard steps (branch, vehicle, driver, fuel type, supplier,
 * responsible), the date picker, the formatted number inputs, the photo
 * picked from disk and uploaded by the browser (presign + PUT), and the
 * submit. The API is only read afterwards, to prove what the form wrote.
 * Branch and supplier are setup, not what this journey is about, and are
 * written through the API.
 *
 * A BUSINESS_USER on purpose, not the administrator: every write here goes
 * through the profile's permissions, which is the path most people take.
 */
test.describe.configure({ mode: "serial" });

test.setTimeout(240_000);

const USERS = browserUsers();
const BUSINESS = USERS.companies.full.id;
const RUN = `${Date.now()}`.slice(-7);

const fleet = {
  token: "",
  branchId: "",
  supplierId: "",
  serviceOrderId: "",
  plate: "WEB1E23",
  vehicleId: USERS.full.vehicleId,
  driverId: USERS.full.driverId,
  fuelTypeId: USERS.full.fuelTypeId,
  // Read from the vehicle before writing: readings must only go up, and the
  // fixture vehicle keeps every previous run's.
  mileage: 0,
};

let office: { context: BrowserContext; page: Page };

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

async function rows(path: string): Promise<Record<string, unknown>[]> {
  const response = await apiAs(fleet.token, path);
  const body = await response.text();

  expect(response.status, `${path}: ${body.slice(0, 300)}`).toBe(200);

  return ndjsonRows(body);
}

/**
 * A real, decodable JPEG drawn by the browser itself. The forms shrink every
 * picked photo through a canvas before uploading it, so bytes that are only
 * a JPEG header are refused: the file has to be a picture.
 */
async function photoFile(
  page: Page,
  name: string,
): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");

    canvas.width = 64;
    canvas.height = 48;

    const context = canvas.getContext("2d")!;

    context.fillStyle = "#2b6cb0";
    context.fillRect(0, 0, 64, 48);
    context.fillStyle = "#ffffff";
    context.fillRect(8, 8, 24, 16);

    return canvas.toDataURL("image/jpeg", 0.8);
  });

  return {
    name,
    mimeType: "image/jpeg",
    buffer: Buffer.from(dataUrl.split(",")[1], "base64"),
  };
}

/**
 * Picks a row of an inline cmdk list (the wizard steps) by its id. The search
 * box is found by its placeholder: cmdk names the input after the list's
 * label ("Selecione a filial"), which two lists on one step can share words
 * with.
 */
async function pickInList(
  scope: Locator,
  placeholder: string,
  term: string,
  id: string,
): Promise<void> {
  await scope.getByPlaceholder(placeholder, { exact: true }).fill(term);

  const item = scope.locator(`[cmdk-item][data-value="${id}"]`);

  await expect(
    item,
    `${placeholder} "${term}" não trouxe o registro`,
  ).toBeVisible({ timeout: 30_000 });
  await item.click();
}

/** Picks a row of a popover combobox (the bill's pickers) by its id. */
async function pickInCombobox(
  page: Page,
  trigger: Locator,
  term: string,
  id: string,
): Promise<void> {
  const popover = page
    .locator("[data-radix-popper-content-wrapper]")
    .filter({ has: page.locator("[cmdk-root]") });

  await clickUntilVisible(trigger, popover);
  await popover.locator("[cmdk-input]").fill(term);

  const item = popover.locator(`[cmdk-item][data-value="${id}"]`);

  await expect(item, `"${term}" não trouxe o registro`).toBeVisible({
    timeout: 30_000,
  });
  await item.click();
  await expect(popover).toHaveCount(0);
}

/** A Radix select: open it by its label, choose the option by its text. */
async function choose(
  page: Page,
  scope: Locator,
  label: RegExp,
  option: string,
): Promise<void> {
  const listbox = page.getByRole("listbox");

  await clickUntilVisible(
    scope.getByRole("combobox", { name: label }),
    listbox,
  );
  await listbox.getByRole("option", { name: option, exact: true }).click();
  await expect(listbox).toHaveCount(0);
}

/**
 * The date picker: open it and click today (it opens on today's month). The
 * picker stays open after a day is chosen — the year and month selects live
 * in it — so it is closed the way a person does, with Escape.
 */
async function pickToday(
  page: Page,
  scope: Locator,
  label: RegExp,
): Promise<void> {
  const trigger = scope.getByRole("combobox", { name: label });
  const calendar = page
    .locator("[data-radix-popper-content-wrapper]")
    .filter({ has: page.getByRole("grid") });

  await clickUntilVisible(trigger, calendar);

  const now = new Date();

  await calendar
    .locator('button[name="day"]:not(.day-outside)')
    .filter({ hasText: new RegExp(`^${now.getDate()}$`) })
    .first()
    .click();

  await expect(trigger).toContainText(now.toLocaleDateString("pt-BR"));
  await page.keyboard.press("Escape");
  await expect(calendar).toHaveCount(0);
}

/** "Prosseguir" of a wizard step, once the step has what it needs. */
async function proceed(dialog: Locator): Promise<void> {
  const button = dialog.getByRole("button", { name: "Prosseguir" });

  await expect(button).toBeEnabled({ timeout: 30_000 });
  await button.click();
}

/** Opens a list page and its create dialog. */
async function openCreate(
  page: Page,
  path: string,
  buttonName: string,
): Promise<Locator> {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog");

  await clickUntilVisible(
    page.getByRole("button", { name: buttonName, exact: true }),
    dialog,
  );

  return dialog;
}

/** The success toast; the form's own error spelled out when it refuses. */
async function expectSaved(page: Page, dialog: Locator): Promise<void> {
  const success = page.locator('[data-sonner-toast][data-type="success"]');
  const failure = page.locator('[data-sonner-toast][data-type="error"]');

  await expect(success.or(failure).first()).toBeVisible({ timeout: 60_000 });

  if (await failure.first().isVisible()) {
    throw new Error(
      `o formulário recusou: ${await failure.first().innerText()}`,
    );
  }

  await expect(dialog).toHaveCount(0, { timeout: 30_000 });
}

test("the operator signs in and sets up a branch and a supplier", async ({
  browser,
}) => {
  office = await signedInContext(browser, "fullUser");
  fleet.token = await accessTokenOf(office.context);

  await ok(
    await apiAs(fleet.token, `/branch/create-branch/${BUSINESS}`, {
      method: "POST",
      body: JSON.stringify({
        corporate_reason: `Filial Frota ${RUN}`,
        cnpj: randomCnpj(),
        cnae: "4930202",
        cep: "01001000",
        city: "São Paulo",
        uf: "SP",
        street: "Rua da Filial",
        address_number: "10",
        email: `filial.frota.${RUN}@exemplo.com.br`,
        responsible_name: "Responsável Frota",
        telephone: "11999999999",
      }),
    }),
    "filial",
  );

  fleet.branchId = (
    await rows(
      `/branch/search-branch-business?businessId=${BUSINESS}&search=${RUN}`,
    )
  )[0].id as string;

  await ok(
    await apiAs(fleet.token, `/supplier/create-supplier/${BUSINESS}`, {
      method: "POST",
      body: JSON.stringify({
        name: `Oficina Frota ${RUN}`,
        cnpj: randomCnpj(),
      }),
    }),
    "fornecedor",
  );

  fleet.supplierId = (
    await rows(
      `/supplier/search-supplier-business?businessId=${BUSINESS}&search=${RUN}`,
    )
  )[0].id as string;

  expect(fleet.branchId && fleet.supplierId).toBeTruthy();

  const vehicle = await ok(
    await apiAs(
      fleet.token,
      `/vehicle/get-vehicle/${fleet.vehicleId}/business/${BUSINESS}`,
    ),
    "veículo",
  );

  fleet.mileage =
    Math.ceil(
      Number(vehicle.data?.current_mileage ?? vehicle.current_mileage),
    ) + 100;
  expect(fleet.mileage).toBeGreaterThan(100);
});

test("refueling through the form, with the odometer photo", async () => {
  const { page } = office;
  const dialog = await openCreate(
    page,
    "/dashboard/fuel",
    "Criar Abastecimento",
  );

  await pickInList(dialog, "Buscar filial...", RUN, fleet.branchId);
  await proceed(dialog);

  await pickInList(
    dialog,
    "Buscar por placa, descrição, marca ou modelo...",
    fleet.plate,
    fleet.vehicleId,
  );
  await pickInList(
    dialog,
    "Buscar motorista por nome ou CNH...",
    "Motorista Web",
    fleet.driverId,
  );
  await proceed(dialog);

  await pickInList(dialog, "Buscar combustível...", "Diesel", fleet.fuelTypeId);
  await proceed(dialog);

  await pickToday(page, dialog, /^Data do abastecimento/);
  await dialog.getByLabel(/^Quilometragem/).fill(String(fleet.mileage));
  await dialog.getByLabel(/^Quantidade de litros/).fill("120,5");
  await dialog.getByLabel(/^Preço por litro/).fill("5,99");
  await dialog
    .getByLabel(/^Observações/)
    .fill(`Abastecimento da jornada ${RUN}`);

  await dialog
    .locator('input[type="file"][name="odometer_photo"]')
    .setInputFiles(await photoFile(page, "odometro.jpg"));
  // Shrunk and re-encoded in the browser before it goes anywhere (EXIF and
  // its GPS stripped): what the form shows is the WebP it will upload.
  await expect(dialog.getByText("odometro.webp")).toBeVisible({
    timeout: 30_000,
  });

  await dialog.getByRole("button", { name: "Criar Abastecimento" }).click();
  await expectSaved(page, dialog);

  // What the form wrote, read back: the reading, the litres, the photo.
  const fuel = (
    await rows(
      `/fuel/list-fuel?businessId=${BUSINESS}&page=1&pageSize=20&search=${encodeURIComponent(RUN)}`,
    )
  ).find((row) => Number(row.current_mileage) === fleet.mileage);

  expect(fuel, "o abastecimento do formulário não está na API").toBeTruthy();
  expect(Number(fuel!.liters_amount)).toBeCloseTo(120.5, 3);
  expect(
    fuel!.odometer_photo,
    "o abastecimento foi salvo sem a foto do odômetro",
  ).toBeTruthy();

  await page.goto(`${BASE}/dashboard/fuel?search=${fleet.plate}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("table").first()).toContainText(/120[,.]5/, {
    timeout: 60_000,
  });
});

test("checklist through the form, with the three required photos", async () => {
  const { page } = office;
  const dialog = await openCreate(
    page,
    "/dashboard/vehicle-checklist",
    "Novo checklist",
  );

  await pickInList(dialog, "Buscar filial...", RUN, fleet.branchId);
  await proceed(dialog);

  await pickInList(
    dialog,
    "Buscar por placa, descrição, marca ou modelo...",
    fleet.plate,
    fleet.vehicleId,
  );
  await pickInList(
    dialog,
    "Buscar motorista por nome ou CNH...",
    "Motorista Web",
    fleet.driverId,
  );
  await proceed(dialog);

  await expect(
    dialog.getByRole("heading", { name: "Criar Novo Checklist Veicular" }),
  ).toBeVisible();

  const submit = dialog.getByRole("button", { name: "Criar checklist" });

  await pickToday(page, dialog, /^Data do Checklist/);
  await dialog
    .getByLabel(/^Quilometragem Atual/)
    .fill(String(fleet.mileage + 10));

  const GOOD = [
    "Condição dos Pneus",
    "Condição dos Para-choques",
    "Condição do Para-brisa",
    "Condição dos Retrovisores",
    "Condição do Volante",
    "Condição da Bateria",
    "Condição do Estepe",
  ];
  const YES = [
    "Nível de Combustível Adequado",
    "Faróis Funcionando",
    "Lanternas Traseiras Funcionando",
    "Setas Funcionando",
    "Cintos de Segurança Funcionando",
    "Painel Funcionando",
    "Freios Funcionando",
    "Embreagem Funcionando",
    "Nível de Óleo Adequado",
    "Água do Radiador Adequada",
    "Fluido de Freio Adequado",
    "CNH Válida",
    "Documentos do Veículo Válidos",
    "Seguro Válido",
    "Extintor Válido",
    "Triângulo Presente",
    "Macaco Presente",
  ];

  for (const label of GOOD)
    await choose(page, dialog, new RegExp(`^${label}`), "Bom");
  for (const label of YES)
    await choose(page, dialog, new RegExp(`^${label}`), "Sim");
  await choose(page, dialog, /^Condição Geral do Veículo/, "Aprovado");

  // Everything answered, but the three photos the checklist always asks for
  // are missing. The button stays enabled (decision 16.701): pressing it
  // keeps the dialog open and says so under each photo, without a request.
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(dialog.getByText("Adicione ao menos uma foto.")).toHaveCount(3);
  await expect(
    dialog.getByRole("heading", { name: "Criar Novo Checklist Veicular" }),
  ).toBeVisible();

  for (const [field, label] of [
    ["km", "Foto da Quilometragem"],
    ["pneus", "Foto dos Pneus"],
    ["combustivel", "Foto do Nível de Combustível"],
  ] as const) {
    await dialog
      .locator(`input[type="file"][aria-label="${label}"]`)
      .setInputFiles(await photoFile(page, `checklist-${field}.jpg`));
  }

  await expect(dialog.getByText("Adicione ao menos uma foto.")).toHaveCount(0);
  await submit.click();
  await expectSaved(page, dialog);

  const checklist = (
    await rows(
      `/vehicle-checklist/list-vehicle-checklist?businessId=${BUSINESS}&page=1&pageSize=20&search=${fleet.plate}`,
    )
  ).find((row) => Number(row.current_mileage) === fleet.mileage + 10);

  expect(checklist, "o checklist do formulário não está na API").toBeTruthy();

  await page.goto(`${BASE}/dashboard/vehicle-checklist?search=${fleet.plate}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("table").first()).toContainText(fleet.plate, {
    timeout: 60_000,
  });
});

/**
 * The service-order wizard up to "Criar Ordem de Serviço": branch, vehicle
 * and supplier, responsible, then the order itself. The vehicle's readings
 * are a read-only copy of the vehicle for anyone but a MASTER.
 */
async function submitServiceOrder(
  vehicle: { id: string; term: string },
  description: string,
  // Checks on the filled form. They run BEFORE the submit: a save that
  // answers fast closes the dialog, and a field read after the click is gone.
  beforeSubmit?: (dialog: Locator) => Promise<void>,
): Promise<Locator> {
  const { page } = office;
  const dialog = await openCreate(
    page,
    "/dashboard/service-order",
    "Criar Ordem de Serviço",
  );

  await pickInList(dialog, "Buscar filial...", RUN, fleet.branchId);
  await proceed(dialog);

  await pickInList(
    dialog,
    "Buscar por placa, descrição, marca ou modelo...",
    vehicle.term,
    vehicle.id,
  );
  await pickInList(
    dialog,
    "Buscar por nome, CNPJ ou e-mail...",
    `Oficina Frota ${RUN}`,
    fleet.supplierId,
  );
  await proceed(dialog);

  await pickInList(
    dialog,
    "Buscar por nome ou e-mail...",
    "Operador Completo",
    USERS.users.fullUser.id,
  );
  await proceed(dialog);

  await pickToday(page, dialog, /^Data da ordem de serviço/);
  await choose(page, dialog, /^Tipo de manutenção/, "Externa");
  await dialog.getByLabel(/^Valor total/).fill("1850,40");
  await dialog.getByLabel(/^Valor total/).blur();
  await dialog.getByLabel(/^Descrição/).fill(description);

  await expect(
    dialog.getByLabel(/^Quilometragem atual do veículo/),
  ).not.toHaveValue("", { timeout: 30_000 });

  await beforeSubmit?.(dialog);

  await dialog.getByRole("button", { name: "Criar Ordem de Serviço" }).click();

  return dialog;
}

test("service order through the form", async () => {
  const { page } = office;

  // A vehicle with its last review on record, as most are. The one without
  // is the next test.
  const vehicle = await ok(
    await apiAs(
      fleet.token,
      `/vehicle/get-vehicle/${fleet.vehicleId}/business/${BUSINESS}`,
    ),
    "veículo",
  );
  const current = Number(
    vehicle.data?.current_mileage ?? vehicle.current_mileage,
  );

  if (
    (vehicle.data?.last_maintenance_mileage ??
      vehicle.last_maintenance_mileage) == null
  ) {
    await ok(
      await apiAs(
        fleet.token,
        `/vehicle/update-vehicle/${fleet.vehicleId}/business/${BUSINESS}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            last_maintenance_mileage: Math.max(1, Math.floor(current) - 5_000),
          }),
        },
      ),
      "última revisão do veículo",
    );
  }

  const dialog = await submitServiceOrder(
    { id: fleet.vehicleId, term: fleet.plate },
    `Revisão da jornada ${RUN}`,
  );

  await expectSaved(page, dialog);

  const order = (
    await rows(
      `/service-order/search-service-order-business?businessId=${BUSINESS}&search=${RUN}`,
    )
  )[0];

  expect(order, "a ordem do formulário não está na API").toBeTruthy();

  fleet.serviceOrderId = order.id as string;

  await page.goto(`${BASE}/dashboard/service-order?search=${fleet.plate}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("table").first()).toContainText(fleet.plate, {
    timeout: 60_000,
  });
});

test("the first order of a vehicle with no previous maintenance is created too", async () => {
  // The vehicle never had a review: the API accepts the order without
  // `last_maintenance_mileage_at_service` (it used to answer 400).

  const { page } = office;
  const admin = await apiLogin(USERS.users.admin.email);
  const label = `Primeira OS ${RUN}`;
  const { vehicleId } = await ownDriver(admin, label);

  const dialog = await submitServiceOrder(
    { id: vehicleId, term: `Caminhão ${label}` },
    `Primeira revisão ${RUN}`,
    async (form) => {
      // No previous review: the read-only copy is empty and says it is
      // optional.
      await expect(
        form.getByLabel(/^Quilometragem da última revisão \(opcional\)/),
      ).toHaveValue("");
    },
  );

  await expectSaved(page, dialog);
});

test("the account payable, created through the form, reaches the responsible driver", async ({
  browser,
}) => {
  const { page } = office;
  const dialog = await openCreate(
    page,
    "/dashboard/account-payable",
    "Criar Conta a Pagar",
  );

  await choose(page, dialog, /^Categoria/, "Manutenção");
  await dialog.getByLabel(/^Nº do documento/).fill(`NF-${RUN}`);

  await pickInCombobox(
    page,
    dialog.locator("#account-payable-supplier"),
    `Oficina Frota ${RUN}`,
    fleet.supplierId,
  );
  await pickInCombobox(
    page,
    dialog.locator("#account-payable-branch"),
    RUN,
    fleet.branchId,
  );
  await pickInCombobox(
    page,
    dialog.locator("#account-payable-responsible"),
    "Motorista Web",
    USERS.users.driver.id,
  );
  await pickInCombobox(
    page,
    dialog.locator("#account-payable-vehicle"),
    fleet.plate,
    fleet.vehicleId,
  );
  await pickInCombobox(
    page,
    dialog.locator("#account-payable-service-order"),
    RUN,
    fleet.serviceOrderId,
  );

  await pickToday(page, dialog, /^Data de vencimento/);
  await dialog.getByLabel(/^Valor total/).fill("1850,40");
  await dialog.getByLabel(/^Valor total/).blur();
  await dialog.getByLabel(/^Descrição/).fill(`Conta da jornada ${RUN}`);

  await dialog.getByRole("button", { name: "Criar Conta a Pagar" }).click();
  await expectSaved(page, dialog);

  const bill = (
    await rows(
      `/account-payable/list-account-payable?businessId=${BUSINESS}&page=1&pageSize=20&search=NF-${RUN}`,
    )
  )[0];

  expect(bill, "a conta do formulário não está na API").toBeTruthy();
  expect(bill).toMatchObject({ category: "MAINTENANCE" });
  expect(Number(bill.amount)).toBeCloseTo(1850.4, 2);
  expect(JSON.stringify(bill)).toContain(fleet.serviceOrderId);

  await page.goto(`${BASE}/dashboard/account-payable?search=NF-${RUN}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("table").first()).toContainText(/1\.?850,40/, {
    timeout: 60_000,
  });

  // The responsible person — the driver — sees it in his own area.
  const driver = await signedInContext(browser, "driver");

  await driver.page.goto(`${BASE}/driver/account-payable`, {
    waitUntil: "domcontentloaded",
  });
  await expect(driver.page.locator("main")).toContainText(/1\.?850,40/, {
    timeout: 60_000,
  });

  await driver.context.close();
});
