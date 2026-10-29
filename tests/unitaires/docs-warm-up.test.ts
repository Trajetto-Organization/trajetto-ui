// @vitest-environment node
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  WARM_UP_HEADER,
  docsWarmUpPaths,
  selfBaseUrl,
  warmUpDocs,
} from "@/app/docs/_lib/warm-up";
import {
  API_DOCS_PATH,
  DOCS_CONSOLE_PATH,
  DOCS_GUIDE_SLUGS,
  DOCS_REFERENCE_PATH,
  docsGuideHref,
} from "@/app/docs/_lib/navigation";

/**
 * The first visit to /docs after every deploy compiled the MDX guide and
 * fetched the API's OpenAPI document while the reader waited. The server now
 * visits each portal page once at startup — after its health check answers,
 * one page at a time, never blocking the boot and never throwing.
 *
 * Run against a real HTTP server on the loopback, like the server.js the
 * image starts.
 */
let server: Server | null = null;

afterEach(async () => {
  await new Promise<void>((resolve) =>
    server ? server.close(() => resolve()) : resolve(),
  );
  server = null;
});

async function serve(
  handler: (path: string, headers: Record<string, unknown>) => number,
): Promise<{ base: string; seen: string[] }> {
  const seen: string[] = [];

  server = createServer((request, response) => {
    const path = request.url ?? "/";

    seen.push(path);
    response.statusCode = handler(path, request.headers);
    response.end("<html></html>");
  });

  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));

  const { port } = server.address() as AddressInfo;

  return { base: `http://127.0.0.1:${port}`, seen };
}

describe("the pages it warms", () => {
  it("are every guide and the reference, never the console redirect", () => {
    const paths = docsWarmUpPaths();

    expect(paths).toContain(API_DOCS_PATH);
    expect(paths).toContain(DOCS_REFERENCE_PATH);
    expect(paths).not.toContain(DOCS_CONSOLE_PATH);

    for (const slug of DOCS_GUIDE_SLUGS) {
      expect(paths).toContain(docsGuideHref(slug));
    }

    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("warmUpDocs", () => {
  it("waits for the health check, then visits each page once, in order", async () => {
    let healthChecks = 0;

    const { base, seen } = await serve((path, headers) => {
      expect(headers[WARM_UP_HEADER]).toBe("1");

      if (path === "/api/health") {
        healthChecks += 1;
        return healthChecks < 3 ? 503 : 200;
      }

      return 200;
    });

    const log = vi.fn();
    const result = await warmUpDocs({
      baseUrl: base,
      paths: ["/docs", "/docs/referencia"],
      readyDelayMs: 1,
      log,
    });

    expect(seen).toEqual([
      "/api/health",
      "/api/health",
      "/api/health",
      "/docs",
      "/docs/referencia",
    ]);
    expect(result).toEqual({
      warmed: ["/docs", "/docs/referencia"],
      failed: [],
    });
    expect(log).not.toHaveBeenCalled();
  });

  it("logs the pages that failed and carries on", async () => {
    const { base, seen } = await serve((path) =>
      path === "/docs/referencia" ? 500 : 200,
    );

    const log = vi.fn();
    const result = await warmUpDocs({
      baseUrl: base,
      paths: ["/docs/referencia", "/docs"],
      log,
    });

    expect(seen).toContain("/docs");
    expect(result.failed).toEqual(["/docs/referencia"]);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("1 of 2 pages failed: /docs/referencia"),
    );
  });

  it("gives up quietly, without throwing, when the server never answers", async () => {
    const log = vi.fn();

    const result = await warmUpDocs({
      // Nothing listens here.
      baseUrl: "http://127.0.0.1:9",
      paths: ["/docs"],
      readyAttempts: 2,
      readyDelayMs: 1,
      log,
    });

    expect(result).toEqual({ warmed: [], failed: ["/docs"], notReady: true });
    expect(log).toHaveBeenCalledOnce();
  });
});

describe("the server's own address", () => {
  it("is the loopback on the port the server listens on", () => {
    expect(selfBaseUrl({ PORT: "3100" })).toBe("http://127.0.0.1:3100");
    expect(selfBaseUrl({})).toBe("http://127.0.0.1:3000");
  });
});

describe("the boot", () => {
  it("starts the warm-up without waiting for it, in production only", async () => {
    vi.resetModules();

    const warmUp = vi.fn(() => new Promise(() => undefined));

    vi.doMock("@/app/docs/_lib/warm-up", () => ({
      selfBaseUrl: () => "http://127.0.0.1:3000",
      warmUpDocs: warmUp,
    }));
    vi.doMock("@/env/server", () => ({ assertWebEnv: () => undefined }));

    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("NODE_ENV", "production");

    const { register } = await import("@/instrumentation");

    // Resolves although the warm-up never does.
    await expect(register()).resolves.toBeUndefined();
    await vi.waitFor(() => expect(warmUp).toHaveBeenCalledOnce());

    vi.stubEnv("NODE_ENV", "development");
    warmUp.mockClear();

    await register();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(warmUp).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
    vi.doUnmock("@/app/docs/_lib/warm-up");
    vi.doUnmock("@/env/server");
  });
});
