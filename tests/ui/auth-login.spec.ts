import { expect, test, type Page } from "@playwright/test";

import {
  BASE,
  PASSWORD,
  browserUsers,
  loginThroughForm,
  setTwoFactorCode,
  submitLogin,
} from "./support/login";
import { waitForHydration } from "./support/ui";

/**
 * Getting in and getting out, through the form (decision 13.3).
 *
 * Every other browser spec starts with a minted cookie, so the login page,
 * the server action behind it, the cookies it sets and where each role lands
 * had never been driven by a browser. These accounts have real passwords
 * (`mint-browser-users.ts`); nothing here touches a cookie by hand.
 */

// Every login here goes through the form, and the API allows eight a minute
// per address: a test may wait out the window once or twice (support/login).
test.setTimeout(300_000);

const USERS = browserUsers();

// The tours would cover the account menu this file opens. On the CONTEXT, so
// the second tab of the multi-tab tests is covered too.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    const real = Storage.prototype.getItem;

    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith("tutorial_")) return "true";

      return real.call(this, key);
    };
  });

  await page.setViewportSize({ width: 1440, height: 900 });
});

/**
 * Types a code into the one-time-code field the way a person does.
 *
 * `fill` on input-otp's controlled input merged the new value with the old
 * one ("135791" then "246810" left "135792"), so the second attempt sent a
 * code nobody typed. Emptied with Backspace, then typed key by key.
 */
async function typeCode(page: Page, code: string): Promise<void> {
  const input = page.locator('input[name="code"]');

  // A click, as a person does: input-otp keeps its own caret, and a
  // programmatic focus() left the keystrokes going nowhere.
  await input.click();

  for (let index = 0; index < 6; index += 1)
    await page.keyboard.press("Backspace");

  await page.keyboard.type(code, { delay: 40 });
  await expect(input).toHaveValue(code);
}

/** The account button at the foot of the sidebar names who is signed in. */
async function expectSignedInAs(page: Page, email: string): Promise<void> {
  await expect(
    page.getByText(email, { exact: true }).first(),
    `a sessão não é de ${email}`,
  ).toBeVisible({ timeout: 60_000 });
}

async function logOut(page: Page): Promise<void> {
  // The account button carries the person's e-mail; it opens the menu with "Sair".
  await page.locator('[data-tutorial="account"]').first().click();
  await page
    .getByRole("menuitem", { name: "Sair" })
    .or(page.getByRole("button", { name: "Sair" }))
    .first()
    .click();

  await page.waitForURL(/\/login/, { timeout: 60_000 });
}

test.describe("the login form", () => {
  test("refuses the wrong password and stays on /login", async ({ page }) => {
    await submitLogin(page, USERS.users.readOnlyUser.email, "senha-errada-123");

    await expect(page.getByText("Credenciais inválidas!")).toBeVisible({
      timeout: 30_000,
    });
    expect(new URL(page.url()).pathname).toBe("/login");

    const cookies = await page.context().cookies();

    expect(
      cookies.some((cookie) => cookie.name === "tkey"),
      "uma senha errada deixou cookie de sessão",
    ).toBe(false);
  });

  test("validates the e-mail before calling the API", async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });

    const email = page.getByLabel("Email");

    await waitForHydration(email);

    // Staying on /login proves nothing: a wrong-credential round trip stays
    // there too. What proves the check ran first is that nothing was POSTed —
    // neither the server action nor the API's login. The captcha's own
    // requests to Cloudflare, which start with the click below, are not ours.
    const posts: string[] = [];

    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).hostname !== "challenges.cloudflare.com"
      )
        posts.push(request.url());
    });

    // A person's first input loads the captcha (person-input.ts); fill() makes none.
    await email.click();
    await email.fill("nao-e-um-email");
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect
      .poll(() =>
        email.evaluate(
          (input: HTMLInputElement) => input.validity.typeMismatch,
        ),
      )
      .toBe(true);

    await page.waitForTimeout(1_500);

    expect(posts, "o formulário enviou um e-mail inválido").toEqual([]);
    expect(new URL(page.url()).pathname).toBe("/login");
  });
});

test.describe("each role lands on its own home", () => {
  const CASES = [
    { who: "master", home: "/admin" },
    { who: "admin", home: "/dashboard" },
    { who: "fullUser", home: "/dashboard" },
    { who: "readOnlyUser", home: "/dashboard" },
    { who: "driver", home: "/profile" },
    { who: "fleetOnlyAdmin", home: "/dashboard" },
    { who: "deliveriesOnlyAdmin", home: "/dashboard" },
  ] as const;

  for (const { who, home } of CASES) {
    test(`${who} → ${home}`, async ({ page }) => {
      await loginThroughForm(page, who);

      await expect(page).toHaveURL(new RegExp(`${home}(\\?|$|/)`), {
        timeout: 60_000,
      });
      await expectSignedInAs(page, USERS.users[who].email);

      // Signed in, the login page sends the person back home instead of
      // offering a second login on top of the first.
      await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(`${home}(\\?|$|/)`), {
        timeout: 60_000,
      });
    });
  }

  test("the MASTER does not open /dashboard and the manager does not open /admin", async ({
    browser,
  }) => {
    const master = await browser.newPage();
    await loginThroughForm(master, "master");
    await master.goto(`${BASE}/dashboard/deliveries`, {
      waitUntil: "domcontentloaded",
    });
    await expect(master).toHaveURL(/\/admin/);
    await master.close();

    const admin = await browser.newPage();
    await loginThroughForm(admin, "admin");
    await admin.goto(`${BASE}/admin/business`, {
      waitUntil: "domcontentloaded",
    });
    await expect(admin).toHaveURL(/\/dashboard/);
    await admin.close();
  });
});

test.describe("two-factor", () => {
  test("asks for the code, refuses the wrong one and signs in with the right one", async ({
    page,
  }) => {
    const email = USERS.users.twoFactor.email;

    await submitLogin(page, email, PASSWORD);

    await expect(
      page.getByRole("heading", { name: "Autenticação (2FA)" }),
    ).toBeVisible({
      timeout: 60_000,
    });

    // No session yet: the password alone must not have opened the door.
    expect(
      (await page.context().cookies()).some((cookie) => cookie.name === "tkey"),
    ).toBe(false);

    // The code went by e-mail; swap it for one this test knows.
    setTwoFactorCode(email, "246810");

    const confirm = page.getByRole("button", {
      name: "Autenticação de dois fatores",
    });

    await typeCode(page, "135791");
    await expect(confirm).toBeEnabled();
    await confirm.click();

    await expect(
      page.getByText(/código|inválido|incorreto/i).first(),
    ).toBeVisible({
      timeout: 30_000,
    });
    expect(new URL(page.url()).pathname).toBe("/login");

    await typeCode(page, "246810");
    await confirm.click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
    await expectSignedInAs(page, email);
  });
});

test.describe("signing out", () => {
  test("Sair erases the session and /dashboard asks for login again", async ({
    page,
  }) => {
    await loginThroughForm(page, "fullUser");
    await expectSignedInAs(page, USERS.users.fullUser.email);

    await logOut(page);

    expect(page.url()).toContain("/login");
    expect(
      (await page.context().cookies()).some((cookie) =>
        ["tkey", "rkey"].includes(cookie.name),
      ),
      "Sair deixou cookie de sessão",
    ).toBe(false);

    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("signing out in one tab ends the other tab on its next navigation", async ({
    context,
  }) => {
    const first = await context.newPage();
    await loginThroughForm(first, "admin");

    const second = await context.newPage();
    await second.goto(`${BASE}/dashboard/deliveries`, {
      waitUntil: "domcontentloaded",
    });
    await expectSignedInAs(second, USERS.users.admin.email);

    await logOut(first);

    // The cookie jar is shared: the other tab's next request has no session.
    await second.goto(`${BASE}/dashboard/routes`, {
      waitUntil: "domcontentloaded",
    });
    await expect(second).toHaveURL(/\/login/, { timeout: 60_000 });
  });

  test("switching user in the same tab shows nothing of the previous person", async ({
    page,
  }) => {
    await loginThroughForm(page, "admin");
    await expectSignedInAs(page, USERS.users.admin.email);

    await logOut(page);

    await loginThroughForm(page, "fleetOnlyAdmin");
    await expectSignedInAs(page, USERS.users.fleetOnlyAdmin.email);

    await expect(
      page.getByText(USERS.users.admin.email, { exact: true }),
      "o e-mail da pessoa anterior continua na tela",
    ).toHaveCount(0);

    // The previous person's company had Entregas; this one does not. A menu
    // left over from the previous session would still offer it.
    await expect(
      page.getByRole("link", { name: "Entregas", exact: true }),
    ).toHaveCount(0);
  });

  test("a new session in an open tab switches the person in the other tab", async ({
    context,
  }) => {
    const first = await context.newPage();
    await loginThroughForm(first, "admin");

    const second = await context.newPage();
    await second.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    await expectSignedInAs(second, USERS.users.admin.email);

    // The same browser signs in as somebody else in the first tab.
    await logOut(first);
    await loginThroughForm(first, "deliveriesOnlyAdmin");

    await second.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    await expectSignedInAs(second, USERS.users.deliveriesOnlyAdmin.email);
    await expect(
      second.getByText(USERS.users.admin.email, { exact: true }),
    ).toHaveCount(0);
  });
});
