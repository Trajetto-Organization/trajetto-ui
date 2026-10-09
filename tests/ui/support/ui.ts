import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Clicks `trigger` until `target` shows.
 *
 * On the dev server a page is painted seconds before React hydrates it, and a
 * click in that gap does nothing: the dialog or menu never opens and the spec
 * fails about the product. A person in that gap clicks again; so does this,
 * for as long as `timeout` allows. A trigger that never opens its target
 * still fails, with the target named.
 */
async function clickUntilVisible(
  trigger: Locator,
  target: Locator,
  timeout = 60_000,
): Promise<void> {
  await expect(async () => {
    if (!(await target.isVisible())) await trigger.click({ timeout: 5_000 });

    await expect(target).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout });
}

/**
 * Waits until React has hydrated `element` (its props are attached to the DOM
 * node), so a click reaches its handler instead of the server-rendered HTML.
 *
 * For buttons whose effect is not visible on its own — "Atualizar"
 * re-renders the same table with new rows, so "click until something shows"
 * cannot tell a dead click from a refresh that brought nothing new.
 */
async function waitForHydration(
  element: Locator,
  timeout = 60_000,
): Promise<void> {
  const hydrated = () =>
    element.evaluate(
      (node) => Object.keys(node).some((key) => key.startsWith("__reactProps")),
      null,
      {
        timeout: 5_000,
      },
    );

  /*
    A chunk served while next dev was still compiling it can arrive cut short
    ("SyntaxError: Invalid or unexpected token"): React never boots on that
    page load, and waiting longer cannot help. A person reloads; so does
    this, once, after half the budget. A page that does not hydrate after
    the reload still fails, with the same message.
  */
  const page = element.page();
  let chunkError = false;
  const onError = (error: Error) => {
    if (
      error.name === "SyntaxError" ||
      /ChunkLoadError|Loading chunk/i.test(error.message)
    )
      chunkError = true;
  };

  page.on("pageerror", onError);

  try {
    const half = Math.floor(timeout / 2);
    const firstTry = await expect
      .poll(() => hydrated().catch(() => false), { timeout: half })
      .toBe(true)
      .then(() => true)
      .catch(() => false);

    if (firstTry) return;

    console.warn(
      `[hydration] não hidratou em ${half} ms${chunkError ? " (chunk quebrado)" : ""}; recarregando uma vez`,
    );

    await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });

    await expect
      .poll(() => hydrated().catch(() => false), {
        timeout: timeout - half,
        message: "o elemento não foi hidratado pelo React",
      })
      .toBe(true);
  } finally {
    page.off("pageerror", onError);
  }
}

/**
 * Resolves once the page's realtime socket has joined (socket.io's "40"
 * connect frame on the API's /socket.io). Call it BEFORE navigating, then
 * await it before making another session act: an event emitted while the
 * page is still connecting reaches nobody, and the spec would fail about the
 * realtime path for a reason that is only about timing.
 */
function socketConnected(page: Page, timeout = 60_000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("o socket da página não conectou")),
      timeout,
    );

    page.on("websocket", (socket) => {
      if (!socket.url().includes("/socket.io/")) return;

      socket.on("framereceived", (frame) => {
        if (String(frame.payload).startsWith("40")) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
  });
}

export { clickUntilVisible, socketConnected, waitForHydration };
