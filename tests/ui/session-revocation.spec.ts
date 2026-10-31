import { expect, test, type BrowserContext, type Page } from "./support/test";

import {
  BASE,
  PASSWORD,
  accessTokenOf,
  apiAs,
  ndjsonRows,
  setKnownPassword,
  signedInContext,
  submitLogin,
} from "./support/login";
import { randomCnpj } from "./support/operation";
import { socketConnected, waitForHydration } from "./support/ui";

/**
 * A session ended from somewhere else, while its tab is open (CRIT-29).
 *
 * The socket's `securityAction` with business_inactive, role_changed or
 * user_revoked now logs the person out directly, with the reason on screen
 * and on the login page — no longer by a /user/me re-check that could miss
 * it. Driven here for real: a MASTER switches a company off, revokes a
 * person, changes another's role, and each person's open tab has to leave.
 *
 * A throwaway company of this file's own: switching the fixture's off would
 * log out every other spec running beside this one.
 */
test.describe.configure({ mode: "serial" });

test.setTimeout(300_000);

const RUN = `${Date.now()}`.slice(-7);

let master: { context: BrowserContext; page: Page; token: string };
let businessId = "";
const people: Record<
  "inactive" | "revoked" | "role",
  { email: string; id: string }
> = {
  inactive: { email: `fica-sem-empresa.${RUN}@trajetto.test`, id: "" },
  revoked: { email: `perde-acesso.${RUN}@trajetto.test`, id: "" },
  role: { email: `muda-papel.${RUN}@trajetto.test`, id: "" },
};

async function ok(response: Response, what: string): Promise<void> {
  const body = await response.text();

  expect([200, 201], `${what}: ${body.slice(0, 300)}`).toContain(
    response.status,
  );
}

test.beforeAll(async ({ browser }) => {
  const signed = await signedInContext(browser, "master");
  master = { ...signed, token: await accessTokenOf(signed.context) };

  const cnpj = randomCnpj();

  await ok(
    await apiAs(master.token, `/business/create-business`, {
      method: "POST",
      body: JSON.stringify({
        corporate_reason: `Transportadora Sessões ${RUN}`,
        cnpj,
        cnae: "4930202",
        cep: "01001000",
        city: "São Paulo",
        uf: "SP",
        street: "Praça da Sé",
        address_number: "1",
        email: `sessoes.${RUN}@exemplo.com.br`,
        responsible_name: "Responsável Sessões",
        telephone: "11999999999",
      }),
    }),
    "empresa",
  );

  businessId = ndjsonRows(
    await (
      await apiAs(
        master.token,
        `/business/list-business?page=1&pageSize=5&search=${cnpj}`,
      )
    ).text(),
  )[0].id as string;

  for (const person of Object.values(people)) {
    await ok(
      await apiAs(master.token, `/user/create-user`, {
        method: "POST",
        body: JSON.stringify({
          email: person.email,
          name: `Pessoa ${person.email.split(".")[0]}`,
          role: "BUSINESS_ADMIN",
          businessId,
        }),
      }),
      `usuário ${person.email}`,
    );

    setKnownPassword(person.email);

    person.id = ndjsonRows(
      await (
        await apiAs(
          master.token,
          `/user/search-user-business?businessId=${businessId}&search=${encodeURIComponent(person.email)}`,
        )
      ).text(),
    )[0]?.id as string;

    expect(person.id, `id de ${person.email}`).toBeTruthy();
  }
});

test.afterAll(async () => {
  await master?.context.close();
});

/** Signs the person in through the form and waits until the tab is live. */
async function openTab(
  browser: import("./support/test").Browser,
  email: string,
) {
  const signed = await signedInContext(browser, { email });
  const connected = socketConnected(signed.page);

  await signed.page.goto(`${BASE}/dashboard`, {
    waitUntil: "domcontentloaded",
  });
  // The account button lives in every protected layout.
  await waitForHydration(
    signed.page.locator('[data-tutorial="account"]').first(),
  );
  await connected;

  return signed;
}

async function expectLoggedOut(
  page: Page,
  reason: string,
  title: string,
): Promise<void> {
  // The overlay says why, then the tab leaves for the login with the reason.
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(new RegExp(`/login.*(error|reason)=${reason}`), {
    timeout: 60_000,
  });

  expect(
    (await page.context().cookies()).some((cookie) => cookie.name === "tkey"),
    "o cookie de sessão sobreviveu ao logout forçado",
  ).toBe(false);
}

test("access revoked: the open tab signs out on its own", async ({
  browser,
}) => {
  const tab = await openTab(browser, people.revoked.email);

  await ok(
    await apiAs(master.token, `/user/revoke-access/${people.revoked.id}`, {
      method: "PATCH",
    }),
    "revogar",
  );

  await expectLoggedOut(tab.page, "user_revoked", "Seu acesso foi revogado");

  await tab.context.close();
});

test("role changed: the open tab signs out on its own", async ({ browser }) => {
  const tab = await openTab(browser, people.role.email);

  await ok(
    await apiAs(master.token, `/profile-access/create-profile-access`, {
      method: "POST",
      body: JSON.stringify({ name: `Operação ${RUN}`, businessId }),
    }),
    "perfil",
  );

  const profileId = ndjsonRows(
    await (
      await apiAs(
        master.token,
        `/profile-access/search-profile-business?businessId=${businessId}&search=${RUN}`,
      )
    ).text(),
  )[0]?.id as string;

  // No businessId in the body: the company of a record never changes through
  // an edit, and the API refuses the field with any value (decision 16.100,
  // tenant-locked-field.ts). The web form does not send it either.
  await ok(
    await apiAs(master.token, `/user/update-user/${people.role.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        role: "BUSINESS_USER",
        userType: "employee",
        profileAccessId: profileId,
      }),
    }),
    "mudar papel",
  );

  await expectLoggedOut(tab.page, "role_changed", "Seu acesso foi alterado");

  await tab.context.close();
});

test("company deactivated: the open tab signs out on its own and the login explains", async ({
  browser,
}) => {
  const tab = await openTab(browser, people.inactive.email);

  await ok(
    await apiAs(
      master.token,
      `/business/toggle-business-active/${businessId}`,
      { method: "PATCH" },
    ),
    "desativar empresa",
  );

  await expectLoggedOut(tab.page, "business_inactive", "Empresa desativada");

  // And signing in again is refused with the company's reason, not a
  // generic one (AUTH_BUSINESS_INACTIVE).
  await submitLogin(tab.page, people.inactive.email, PASSWORD);

  await expect(
    tab.page.getByText("Esta empresa está desativada", { exact: false }),
  ).toBeVisible({
    timeout: 60_000,
  });

  await tab.context.close();
});
