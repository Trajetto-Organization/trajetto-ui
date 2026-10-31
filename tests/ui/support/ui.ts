import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Whether the suite runs against `next dev` (E2E_DEV_SERVER=1, the local
 * recipe in tests/ui/README.md) rather than a production build (CI, the
 * standalone server the image runs).
 */
const DEV_SERVER = process.env.E2E_DEV_SERVER === "1";

/**
 * Clicks `trigger` until `target` shows.
 *
 * A page is painted before React hydrates it — seconds on the dev server, a
 * moment on a production build — and a click in that gap does nothing: the
 * dialog or menu never opens and the spec fails about the product. A person
 * in that gap clicks again; so does this, for as long as `timeout` allows.
 * A trigger that never opens its target still fails, with the target named.
 *
 * A second click is noted on the test (`retry-click`), so the run summary
 * shows how often the gap was hit instead of hiding it.
 */
async function clickUntilVisible(
  trigger: Locator,
  target: Locator,
  timeout = 60_000,
): Promise<void> {
  let clicks = 0;

  await expect(async () => {
    if (!(await target.isVisible())) {
      clicks += 1;
      await trigger.click({ timeout: 5_000 });
    }

    await expect(target).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout });

  if (clicks > 1) {
    const what = `${clicks} cliques em ${trigger} até abrir ${target}`;

    console.warn(`[clique repetido] ${what}`);

    try {
      test.info().annotations.push({ type: "retry-click", description: what });
    } catch {
      // Outside a test: the log line is the record.
    }
  }
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

  const page = element.page();
  const pageErrors: string[] = [];
  let chunkError = false;
  const onError = (error: Error) => {
    pageErrors.push(`${error.name}: ${error.message}`.slice(0, 300));

    if (
      error.name === "SyntaxError" ||
      /ChunkLoadError|Loading chunk/i.test(error.message)
    )
      chunkError = true;
  };

  page.on("pageerror", onError);

  try {
    /*
      A production build gets the whole budget and no reload: it has no
      compiler in the loop, so a page of it that does not hydrate is a
      defect, and reloading it until it did made the gate green over it. It
      fails here, with what the page threw.

      On `next dev`, half the budget, then one reload — only for a broken
      chunk: a chunk served while the dev server was still compiling it can
      arrive cut short ("SyntaxError: Invalid or unexpected token"), React
      never boots on that page load, and waiting longer cannot help. A
      person reloads; so does this, once.
    */
    const firstBudget = DEV_SERVER ? Math.floor(timeout / 2) : timeout;
    const firstTry = await expect
      .poll(() => hydrated().catch(() => false), { timeout: firstBudget })
      .toBe(true)
      .then(() => true)
      .catch(() => false);

    if (firstTry) return;

    if (!(DEV_SERVER && chunkError)) {
      throw new Error(
        `o elemento não foi hidratado pelo React em ${firstBudget} ms` +
          (pageErrors.length
            ? `; erros da página: ${pageErrors.slice(0, 3).join(" | ")}`
            : "; a página não lançou erro") +
          (chunkError && !DEV_SERVER
            ? " (chunk quebrado: contra o next dev, rode com E2E_DEV_SERVER=1)"
            : ""),
      );
    }

    console.warn(
      `[hydration] chunk quebrado do next dev; recarregando uma vez (${pageErrors[0] ?? ""})`,
    );

    await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });

    await expect
      .poll(() => hydrated().catch(() => false), {
        timeout: timeout - firstBudget,
        message: "o elemento não foi hidratado pelo React",
      })
      .toBe(true);
  } finally {
    page.off("pageerror", onError);
  }
}

/**
 * Resolves once the page's realtime socket has joined (socket.io's "40"
 * connect frame on the API's /socket.io: the server sends it after its
 * connection checks, and the rooms are joined in the same tick). Call it
 * BEFORE navigating, then await it before making another session act: an
 * event emitted while the page is still connecting reaches nobody, and the
 * spec would fail about the realtime path for a reason that is only about
 * timing.
 *
 * Its rejection is handled until awaited: a test that fails before awaiting
 * it must not leave a timer that rejects in the middle of the next test.
 */
function socketConnected(page: Page, timeout = 60_000): Promise<void> {
  const connected = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("o socket da página não conectou")),
      timeout,
    );

    page.once("close", () => {
      clearTimeout(timer);
      reject(new Error("a página fechou antes de o socket conectar"));
    });

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

  connected.catch(() => undefined);

  return connected;
}

export { clickUntilVisible, socketConnected, waitForHydration };
