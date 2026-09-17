import { test, expect } from "@playwright/test";

import {
  CONTEXT,
  api,
  anyVehicle,
  createRoute,
  open,
  ownDelivery,
} from "./support/operation";

/**
 * Whether the Rotas board follows the operation, or only the page load.
 *
 * The API has emitted `routeEvent` — released, started, cancelled, completed,
 * and every stop that settles — since routes existed. A repository-wide
 * search for the event name found the emitter and no consumer at all: not in
 * the web, not in the app. So a route stayed RELEASED on a dispatcher's screen
 * for as long as they left the tab open while the driver had left an hour
 * earlier, and the only way to learn anything was to press Atualizar.
 *
 * The chain this exercises is the whole thing end to end: a write on the API
 * → the outbox/socket emit → the permissioned operations room → the browser's
 * listener → the cache tag → the refetch. Every link has its own test
 * somewhere; none of them proves the chain is connected.
 *
 * Nothing is clicked in the browser. The change is made through the API, by
 * another "user", exactly as a driver's phone would make it.
 */
test.describe("the Rotas board while a route is created elsewhere", () => {
  test("shows the new route without anybody touching the page", async ({
    page,
  }) => {
    await open(page, "/dashboard/routes");

    // The socket connects after the first paint; the room is joined by the
    // server at handshake for a user with a company of their own.
    await page.waitForTimeout(2_500);

    /**
     * A name nothing else on the page can be: the assertion below used to
     * look for the route's CODE, and a code is a small number that also
     * appears in a date, a total and a page control. Every mutation of the
     * realtime chain — no listener, no invalidation, a two-minute debounce,
     * the component not mounted at all — survived against it, because the
     * number was already on screen before anything happened.
     */
    const routeName = `Tempo real ${Date.now()}`;

    const route = await createRoute(
      [await ownDelivery(`Cliente tempo real ${Date.now()}`)],
      await anyVehicle(),
      routeName,
    );

    /*
      Creating a route emits nothing — it is a draft. RELEASING is the moment
      the operation changes, and it is the event the board has to hear.
    */
    // It must NOT be there yet — otherwise the assertion below proves only
    // that the board renders routes, which it always did.
    await expect(page.getByText(routeName, { exact: true })).toHaveCount(0);

    const released = await api(
      `/route/release-route/${route.id}/business/${CONTEXT.businessId}`,
      { method: "PATCH", body: JSON.stringify({ released: true }) },
    );

    expect(
      released.status,
      `não foi possível liberar a rota: ${await released.text()}`,
    ).toBe(200);

    // No reload, no click. The debounce is 1.2s plus a refetch.
    await expect(
      page.getByText(routeName, { exact: true }).first(),
      "a rota liberada não apareceu sozinha no quadro",
    ).toBeVisible({ timeout: 25_000 });
  });
});
