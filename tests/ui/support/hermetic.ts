import { test, type BrowserContext, type Route } from "@playwright/test";

import {
  answerFor,
  classifyExternal,
  isLocalRequest,
} from "./external-doubles";
import { cachedScalarBundle } from "./scalar-bundle";

/**
 * Every browser context of the suites, made to behave like one person on a
 * machine with no internet.
 *
 * 1. No third party. Requests that would leave the runner are answered by
 *    the doubles of support/external-doubles.ts; anything without a double
 *    is blocked (never fetched), logged and noted on the test, where the run
 *    summary lists it (support/run-summary-reporter.ts). The suites gate the
 *    staging image: a slow OpenStreetMap or Cloudflare must not be able to
 *    fail them.
 *
 * 2. One address per context. The API limits anonymous calls per address —
 *    eight logins a minute — and every browser of the suites reached it from
 *    the same loopback, so the suite was ONE person to the limiter: the
 *    ninth login of any minute waited 61 s for the window, and how long a
 *    test took depended on what the other worker had just done. Production
 *    tells people apart by the address the proxy saw (X-Forwarded-For, which
 *    the web relays to the API next to RATE_LIMIT_FORWARDER_SECRET:
 *    src/lib/api-forwarding.ts); here each context sends an address of its
 *    own, so each is a person with a bucket of its own, and the limit stays
 *    real. Needs the same RATE_LIMIT_FORWARDER_SECRET on the API and the web
 *    (tests/ui/README.md); without it the web relays nothing and the old
 *    shared bucket is back — which the login helpers then report by name.
 *
 * Applied to every context by the suites' own `test` (support/test.ts) and
 * by the warm-up, which launches its own browser.
 */
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

/** Hosts that are this machine under another name (the stack's own URLs). */
function localHosts(): string[] {
  return [
    BASE,
    process.env.LOAD_BASE_URL,
    process.env.PUBLIC_API_URL,
    process.env.API_HTTP_REQUEST,
  ].flatMap((value) => {
    try {
      return value ? [new URL(value).hostname] : [];
    } catch {
      return [];
    }
  });
}

const prepared = new WeakSet<BrowserContext>();

let issued = 0;

/**
 * An address of its own for each context (and each API login). Private
 * range, made of this worker's index and a counter: two contexts of a run
 * never share one. The runner's own process (the warm-up of globalSetup)
 * has no worker index and takes 10.0.x.y, a range no worker uses.
 */
function nextClientAddress(): string {
  issued += 1;

  const index = process.env.TEST_WORKER_INDEX;
  const range = index === undefined ? 0 : (Number(index) % 250) + 1;

  return `10.${range}.${(issued >> 8) & 255}.${issued & 255}`;
}

/** What has already been reported for the running test (one line per URL). */
const reported = new Set<string>();

function reportBlocked(url: URL): void {
  const where = `${url.origin}${url.pathname}`;
  let testId = "fora de um teste";

  try {
    testId = test.info().testId;
  } catch {
    // The warm-up, or a request after the test ended.
  }

  const key = `${testId} ${where}`;

  if (reported.has(key)) return;

  reported.add(key);

  console.warn(`[rede externa] bloqueada, sem dublê: ${where}`);

  try {
    test.info().annotations.push({
      type: "external-request-blocked",
      description: where,
    });
  } catch {
    // Outside a test: the log line above is the report.
  }
}

async function answerExternal(route: Route): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const kind = classifyExternal(url, request.method());
  const answer = kind
    ? answerFor(kind, url, {
        scalarBundle: kind === "scalar-bundle" ? cachedScalarBundle() : null,
      })
    : null;

  // No double, or the console's renderer not fetched yet
  // (ensureScalarBundle, called by the spec that opens the console).
  if (!answer) {
    reportBlocked(url);
    await route.abort("blockedbyclient");

    return;
  }

  await route.fulfill({
    status: answer.status,
    contentType: answer.contentType,
    body: answer.body,
    headers: answer.headers,
  });
}

async function prepareContext(context: BrowserContext): Promise<void> {
  if (prepared.has(context)) return;

  prepared.add(context);

  const hosts = localHosts();

  await context.route(
    (url) => !isLocalRequest(url, hosts),
    (route) => answerExternal(route),
  );

  // Only the web's own requests carry it: the page's server relays it to
  // the API (Server Actions, the middleware). Cross-origin requests are left
  // alone, so no CORS preflight changes.
  const web = new URL(BASE).origin;
  const address = nextClientAddress();

  await context.route(
    (url) => url.origin === web,
    (route) =>
      route.fallback({
        headers: { ...route.request().headers(), "x-forwarded-for": address },
      }),
  );
}

export { nextClientAddress, prepareContext };
