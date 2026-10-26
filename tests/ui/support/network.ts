import type { Page, Request, Response } from "@playwright/test";

/**
 * A request that stays open for as long as the page lives, by design.
 *
 * Cloudflare Turnstile (the captcha on /login, /forgot and the quote form)
 * keeps a `blob:` request of challenges.cloudflare.com pending while the
 * widget is mounted — measured with the always-pass test key the workflow
 * uses: Playwright's "networkidle" never fires on such a page, so every
 * public-page scan of /login and /forgot timed out in `page.goto` at 90 s
 * without measuring anything.
 */
function isLongLived(request: Request): boolean {
  const url = request.url();

  if (url.startsWith("blob:") || url.startsWith("data:")) return true;

  const fromCaptcha = (address: string) => {
    try {
      return new URL(address).hostname === "challenges.cloudflare.com";
    } catch {
      return false;
    }
  };

  if (fromCaptcha(url)) return true;

  try {
    return fromCaptcha(request.frame().url());
  } catch {
    // A request with no frame (a service worker's): not the widget's.
    return false;
  }
}

/** How long the page must go without a request for the network to count as settled. */
const QUIET_MS = 500;

/**
 * `page.goto` with "networkidle" semantics, minus the captcha's own
 * long-lived requests: the load event, then 500 ms with no other request in
 * flight. Everything of the page itself — its scripts, fonts, images,
 * prefetches, API calls — still has to finish, exactly as before.
 */
async function gotoSettled(
  page: Page,
  url: string,
  { timeout }: { timeout: number },
): Promise<Response | null> {
  const started = Date.now();
  const inFlight = new Set<Request>();

  const onRequest = (request: Request) => {
    if (!isLongLived(request)) inFlight.add(request);
  };
  const onDone = (request: Request) => {
    inFlight.delete(request);
  };

  page.on("request", onRequest);
  page.on("requestfinished", onDone);
  page.on("requestfailed", onDone);

  try {
    const response = await page.goto(url, { waitUntil: "load", timeout });

    let quietSince = inFlight.size === 0 ? Date.now() : 0;

    while (Date.now() - started < timeout) {
      if (inFlight.size > 0) {
        quietSince = 0;
      } else if (quietSince === 0) {
        quietSince = Date.now();
      } else if (Date.now() - quietSince >= QUIET_MS) {
        return response;
      }

      await page.waitForTimeout(50);
    }

    throw new Error(
      `a rede não assentou em ${timeout} ms: ${[...inFlight]
        .map((request) => request.url())
        .slice(0, 5)
        .join(" ; ")}`,
    );
  } finally {
    page.off("request", onRequest);
    page.off("requestfinished", onDone);
    page.off("requestfailed", onDone);
  }
}

export { gotoSettled, isLongLived };
