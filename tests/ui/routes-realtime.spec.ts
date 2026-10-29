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
    /**
     * The socket, waited for instead of assumed.
     *
     * The first version slept 2.5 seconds and hoped. Under three parallel
     * workers that was sometimes not enough, and the failure said "a rota
     * liberada não apareceu sozinha no quadro" — which reads as a broken
     * product and was a browser that had not finished connecting. Worse, it
     * also covers a real refusal: the handshake is rate limited per user, and
     * a refused connection looks exactly the same from the assertion's side.
     *
     * The listener is attached BEFORE the navigation, or the connection the
     * page opens on load happens before anything is watching.
     */
    const socketOpened = page.waitForEvent("websocket", {
      // `next dev` opens its own hot-reload socket on the same page, and it
      // wins the race every time.
      predicate: (candidate) => candidate.url().includes("socket.io"),
      timeout: 45_000,
    });

    await open(page, "/dashboard/routes");

    const socket = await socketOpened;

    // Connected is not the same as in the room: the server reads the user, the
    // driver eligibility and the refresh family before joining anything.
    await page.waitForTimeout(2_500);

    expect(
      socket.isClosed(),
      "o socket foi fechado logo depois de abrir — handshake recusado?",
    ).toBe(false);

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
      /*
        The whole chain, end to end: the API write, the outbox/socket emit, the
        permissioned room, the browser's listener, the 1.2s settle window, the
        cache tag and the refetch. Twenty-five seconds was enough alone and
        not with three workers and a loaded API on the same machine — and a
        timeout that only holds on an idle laptop is a timeout that fails in
        CI for no reason anybody can act on.
      */
    ).toBeVisible({ timeout: 45_000 });
  });
});
