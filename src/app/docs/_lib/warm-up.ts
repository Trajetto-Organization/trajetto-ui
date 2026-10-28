import { READING_ORDER } from "./navigation";

/**
 * Warms the developer portal right after the server starts, so the first
 * visitor after a deploy is not the one who waits.
 *
 * The /docs pages render per request (they print numbers from the API's live
 * document), compile their MDX guide once per process on first use
 * (guides.ts) and fetch the OpenAPI document through Next's data cache
 * (public-spec.ts). All three happened on the first click after every
 * deploy. Visiting each page once, from the server itself, does all three
 * the same way a reader would — including the layer each one lives in, which
 * a direct call from here would not share (instrumentation is bundled apart
 * from the routes, so a module-level cache warmed here is not theirs).
 *
 * Never blocks the boot and never throws: it waits for the server to answer
 * its health check, walks the pages one at a time, and logs (console.error,
 * the one level the production build keeps) only when something failed.
 */

/** Every portal page a reader can land on (the console only redirects). */
function docsWarmUpPaths(): string[] {
  return [...new Set(READING_ORDER.map((page) => page.href))];
}

interface WarmUpOptions {
  /** This server, e.g. http://127.0.0.1:3000. */
  baseUrl: string;
  paths?: readonly string[];
  fetchImpl?: typeof fetch;
  /** Answers 200 once the server takes requests. */
  readyPath?: string;
  readyAttempts?: number;
  readyDelayMs?: number;
  /** Per page: a guide compiles and the spec arrives well inside this. */
  pageTimeoutMs?: number;
  log?: (message: string) => void;
}

interface WarmUpResult {
  warmed: string[];
  failed: string[];
  /** The server never answered its health check. */
  notReady?: boolean;
}

const WARM_UP_HEADER = "x-trajetto-warm-up";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    // Unref'd: a pending warm-up never keeps a stopping process alive.
    const timer = setTimeout(resolve, ms);
    (timer as { unref?: () => void }).unref?.();
  });
}

async function answers(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<boolean> {
  try {
    const response = await fetchImpl(url, {
      headers: { [WARM_UP_HEADER]: "1", accept: "text/html" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

    // Read to the end: the render (and what it caches) finishes with it.
    await response.arrayBuffer();

    return response.ok;
  } catch {
    return false;
  }
}

async function warmUpDocs({
  baseUrl,
  paths = docsWarmUpPaths(),
  fetchImpl = fetch,
  readyPath = "/api/health",
  readyAttempts = 30,
  readyDelayMs = 2_000,
  pageTimeoutMs = 20_000,
  log = (message) => console.error(message),
}: WarmUpOptions): Promise<WarmUpResult> {
  const base = baseUrl.replace(/\/+$/, "");

  try {
    let ready = false;

    for (let attempt = 0; attempt < readyAttempts && !ready; attempt += 1) {
      if (attempt > 0) await wait(readyDelayMs);

      ready = await answers(fetchImpl, `${base}${readyPath}`, 5_000);
    }

    if (!ready) {
      log(
        "[docs-warm-up] the server never answered its health check; nothing warmed.",
      );

      return { warmed: [], failed: [...paths], notReady: true };
    }

    const warmed: string[] = [];
    const failed: string[] = [];

    for (const path of paths) {
      if (await answers(fetchImpl, `${base}${path}`, pageTimeoutMs)) {
        warmed.push(path);
      } else {
        failed.push(path);
      }
    }

    if (failed.length > 0) {
      log(
        `[docs-warm-up] ${failed.length} of ${paths.length} pages failed: ${failed.join(", ")}`,
      );
    }

    return { warmed, failed };
  } catch (error) {
    log(
      `[docs-warm-up] stopped: ${error instanceof Error ? error.message : String(error)}`,
    );

    return { warmed: [], failed: [...paths] };
  }
}

/** The server's own address, as `next start` / server.js listen on it. */
function selfBaseUrl(
  env: { PORT?: string } = process.env as { PORT?: string },
): string {
  return `http://127.0.0.1:${env.PORT?.trim() || "3000"}`;
}

export { WARM_UP_HEADER, docsWarmUpPaths, selfBaseUrl, warmUpDocs };
export type { WarmUpOptions, WarmUpResult };
