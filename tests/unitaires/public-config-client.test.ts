import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { clearPublicConfig, seedPublicConfig } from "./helpers/public-config";

/**
 * How browser code reads the public configuration (src/env/client.ts).
 *
 * A page rendered per request carries it in its HTML. A page prerendered at
 * build (the landing page, /login, the quote form) cannot — its HTML would
 * hold the build's values, and the image is promoted from staging to
 * production — so the first read there fetches /public-config.json.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const SERVED = {
  apiUrl: "https://api.served.test",
  siteUrl: "https://www.served.test",
  turnstileSiteKey: "served-site-key",
  appEnv: "production",
  mapTiles: null,
};

beforeAll(() => {
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  clearPublicConfig();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.stubGlobal("React", React);
  vi.resetModules();
});

async function freshClient() {
  return import("@/env/client");
}

function served(body: unknown = SERVED, status = 200) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    expect(String(input)).toBe("/public-config.json");

    return new Response(JSON.stringify(body), { status });
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("on a page rendered per request", () => {
  it("reads the configuration from the page, without a request", async () => {
    seedPublicConfig({ apiUrl: "https://api.page.test" });
    const fetchMock = served();

    const { getPublicConfig, publicApiUrl } = await freshClient();

    expect(getPublicConfig()?.apiUrl).toBe("https://api.page.test");
    expect(await publicApiUrl()).toBe("https://api.page.test");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores a page copy that is not a configuration", async () => {
    const element = document.createElement("script");
    element.id = "public-config";
    element.type = "application/json";
    element.textContent = JSON.stringify({ apiUrl: "javascript:alert(1)" });
    document.head.appendChild(element);
    served();

    const { getPublicConfig, publicApiUrl } = await freshClient();

    expect(getPublicConfig()).toBeNull();
    expect(await publicApiUrl()).toBe("https://api.served.test");
  });
});

describe("on a prerendered page", () => {
  it("fetches the running server's configuration once, however many ask", async () => {
    const fetchMock = served();
    const { getPublicConfig, loadPublicConfig, publicApiUrl } =
      await freshClient();

    expect(getPublicConfig()).toBeNull();

    const [first, second, url] = await Promise.all([
      loadPublicConfig(),
      loadPublicConfig(),
      publicApiUrl(),
    ]);

    expect(first).toEqual(SERVED);
    expect(second).toBe(first);
    expect(url).toBe("https://api.served.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Later reads are synchronous.
    expect(getPublicConfig()).toEqual(SERVED);
  });

  it("fails loudly on an unconfigured server, and tries again next time", async () => {
    const failing = served({ error: "Configuração pública indisponível" }, 503);
    const { loadPublicConfig } = await freshClient();

    await expect(loadPublicConfig()).rejects.toThrow(
      "Configuração pública indisponível (HTTP 503)",
    );
    expect(failing).toHaveBeenCalledTimes(1);

    served();

    await expect(loadPublicConfig()).resolves.toEqual(SERVED);
  });

  it("never builds a request to 'undefined/…'", async () => {
    served({ apiUrl: undefined });
    const { publicApiUrl } = await freshClient();

    await expect(publicApiUrl()).rejects.toThrow(
      "Configuração pública inválida",
    );
  });
});

describe("the captcha", () => {
  it("renders with the running environment's site key once it is known", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    served();

    const turnstile = vi.fn((_props: { sitekey: string }) => null);

    vi.doMock("react-turnstile", () => ({ default: turnstile }));

    const { CaptchaTurnstile } =
      await import("@/components/shared/custom/captcha-turnstile");

    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(
        createElement(CaptchaTurnstile, {
          onSuccess: () => undefined,
          delayMs: 0,
        }),
      );
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(turnstile).toHaveBeenCalled();
    expect(turnstile.mock.calls.at(-1)?.[0].sitekey).toBe("served-site-key");

    vi.doUnmock("react-turnstile");
    vi.useRealTimers();
  });
});

describe("usePublicConfig", () => {
  it("tries again after a failed fetch instead of leaving the page without it", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const errorLog = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const failing = served({ error: "indisponível" }, 503);

    const { usePublicConfig } = await import("@/env/use-public-config");
    const seen: Array<string | null> = [];

    function Probe(): null {
      seen.push(usePublicConfig()?.turnstileSiteKey ?? null);

      return null;
    }

    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(createElement(Probe));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(failing).toHaveBeenCalledTimes(1);
    expect(seen.at(-1)).toBeNull();

    const recovered = served();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_100);
    });

    expect(recovered).toHaveBeenCalledTimes(1);
    expect(seen.at(-1)).toBe("served-site-key");

    errorLog.mockRestore();
    vi.useRealTimers();
  });
});
