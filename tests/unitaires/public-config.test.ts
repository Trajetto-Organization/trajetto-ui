import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  appEnvFrom,
  parsePublicConfig,
  serializePublicConfig,
  type PublicConfig,
} from "@/env/public-config";
import { assertWebEnv, checkWebEnv } from "@/env/server";
import { PublicConfigScript } from "@/env/public-config-script";
import { OSM_TILES } from "@/features/control-tower/lib/map-tiles";
import { appEnv } from "@/lib/site";

/**
 * The web's public configuration, read at run time (decision 12.2): one
 * image is built and promoted from staging to production, so the API URL,
 * the captcha key and the map tiles cannot be inlined at build. Before, a
 * missing NEXT_PUBLIC_HTTP_REQUEST only showed as fetch("undefined/…") on
 * the first screen that needed it (ENV-4).
 */
beforeAll(() => {
  // The config compiles JSX with the classic runtime.
  vi.stubGlobal("React", React);
});

const DEV_ENV = {
  NODE_ENV: "development",
  HTTP_REQUEST: "http://api:3333",
  PUBLIC_API_URL: "http://localhost:3333/",
};

const PRODUCTION_ENV = {
  NODE_ENV: "production",
  APP_ENV: "production",
  HTTP_REQUEST: "http://api:3333",
  PUBLIC_API_URL: "https://api.intrajetto.test",
  METADATA_BASE: "https://www.intrajetto.test/",
  TURNSTILE_SITE_KEY: "0x4AAAAAAA-site",
  TURNSTILE_SECRET_KEY: "0x4AAAAAAA-secret-value",
  MAP_TILE_URL:
    "https://{s}.tiles.example.test/{z}/{x}/{y}.png?key=tile-secret",
  MAP_TILE_ATTRIBUTION: "© Exemplo",
};

function config(env: Record<string, string | undefined>): PublicConfig {
  const result = parsePublicConfig(env);

  if (!result.ok) throw new Error(result.issues.join("; "));

  return result.config;
}

describe("parsePublicConfig", () => {
  it("reads a development environment, with OSM as the only fallback map", () => {
    expect(config(DEV_ENV)).toEqual({
      apiUrl: "http://localhost:3333",
      socketUrl: "http://localhost:3333",
      siteUrl: null,
      turnstileSiteKey: null,
      appEnv: "development",
      mapTiles: OSM_TILES,
    });
  });

  it("reads a production environment", () => {
    expect(config(PRODUCTION_ENV)).toEqual({
      apiUrl: "https://api.intrajetto.test",
      socketUrl: "https://api.intrajetto.test",
      siteUrl: "https://www.intrajetto.test",
      turnstileSiteKey: "0x4AAAAAAA-site",
      appEnv: "production",
      mapTiles: {
        url: PRODUCTION_ENV.MAP_TILE_URL,
        attribution: "© Exemplo",
      },
    });
  });

  it("uses a socket host of its own when one is set", () => {
    expect(
      config({ ...DEV_ENV, PUBLIC_SOCKET_URL: "https://ws.intrajetto.test/" })
        .socketUrl,
    ).toBe("https://ws.intrajetto.test");
  });

  it("names a missing API URL and the variable it replaced", () => {
    const result = parsePublicConfig({ NODE_ENV: "development" });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues).toEqual([
      "PUBLIC_API_URL: obrigatória (substitui NEXT_PUBLIC_HTTP_REQUEST)",
    ]);
  });

  it("requires the captcha key and the canonical origin in production", () => {
    const { TURNSTILE_SITE_KEY, METADATA_BASE, ...rest } = PRODUCTION_ENV;
    const result = parsePublicConfig(rest);

    expect(TURNSTILE_SITE_KEY && METADATA_BASE).toBeTruthy();
    expect(!result.ok && result.issues).toEqual([
      "METADATA_BASE: obrigatória",
      "TURNSTILE_SITE_KEY: obrigatória em produção (substitui NEXT_PUBLIC_TURNSTILE_SITE_KEY)",
    ]);
  });

  it("refuses a URL that is not http(s), without echoing it", () => {
    const result = parsePublicConfig({
      ...DEV_ENV,
      PUBLIC_API_URL: "javascript:alert(1)//secret",
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.join(" ")).toContain(
      "PUBLIC_API_URL: URL inválida",
    );
    expect(!result.ok && result.issues.join(" ")).not.toContain("secret");
  });

  it("refuses a tile template the maps would refuse, without echoing its key", () => {
    const result = parsePublicConfig({
      ...PRODUCTION_ENV,
      MAP_TILE_URL: "http://tiles.example.test/{z}/{x}/{y}.png?key=tile-secret",
    });

    expect(!result.ok && result.issues).toEqual([
      "MAP_TILE_URL: modelo inválido (https com {z}, {x} e {y}; {s} opcional)",
    ]);
    expect(JSON.stringify(result)).not.toContain("tile-secret");
  });

  it("warns, without failing, when a deployed stack has no tile provider", () => {
    const { MAP_TILE_URL, ...rest } = PRODUCTION_ENV;
    const result = parsePublicConfig(rest);

    expect(MAP_TILE_URL).toBeTruthy();
    expect(result.ok).toBe(true);
    expect(result.ok && result.config.mapTiles).toBeNull();
    expect(result.warnings).toEqual([
      "MAP_TILE_URL: não definida; torre, página da rota e seletor de local ficam sem mapa de fundo",
    ]);
  });

  it("never falls back to public OSM outside development", () => {
    const { MAP_TILE_URL, ...rest } = PRODUCTION_ENV;

    expect(MAP_TILE_URL).toBeTruthy();
    expect(config({ ...rest, APP_ENV: "staging" }).mapTiles).toBeNull();
    expect(config({ ...rest, APP_ENV: "homolog" }).mapTiles).toBeNull();
  });

  it("reads APP_ENV exactly like the rest of the site does", () => {
    const cases: Array<[string | undefined, string]> = [
      [undefined, "production"],
      [undefined, "development"],
      ["staging", "production"],
      ["PRODUCTION", "production"],
      ["homolog", "production"],
      ["development", "production"],
    ];

    for (const [value, nodeEnv] of cases) {
      vi.stubEnv("APP_ENV", value ?? "");
      vi.stubEnv("NODE_ENV", nodeEnv);

      expect(
        appEnvFrom({ APP_ENV: value, NODE_ENV: nodeEnv }),
        `${value}/${nodeEnv}`,
      ).toBe(appEnv());
    }

    vi.unstubAllEnvs();
  });
});

describe("the boot check", () => {
  it("passes a complete production environment", () => {
    expect(checkWebEnv(PRODUCTION_ENV)).toEqual({ issues: [], warnings: [] });
  });

  it("lists every missing variable at once, by name, with no value", () => {
    const warn = vi.fn();

    let message = "";

    try {
      assertWebEnv(
        {
          NODE_ENV: "production",
          APP_ENV: "production",
          RATE_LIMIT_FORWARDER_SECRET: "short-secret-value",
          MAP_TILE_URL: "https://{s}.tiles.example.test/{z}/{x}/{y}.png",
        },
        warn,
      );
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain(
      "Variáveis de ambiente da web ausentes ou inválidas",
    );

    for (const name of [
      "HTTP_REQUEST",
      "TURNSTILE_SECRET_KEY",
      "RATE_LIMIT_FORWARDER_SECRET",
      "PUBLIC_API_URL",
      "METADATA_BASE",
      "TURNSTILE_SITE_KEY",
    ]) {
      expect(message, name).toContain(`  - ${name}:`);
    }

    expect(message).not.toContain("short-secret-value");
  });

  it("logs the warnings and still starts", () => {
    const warn = vi.fn();
    const { MAP_TILE_URL, ...rest } = PRODUCTION_ENV;

    expect(MAP_TILE_URL).toBeTruthy();
    expect(() => assertWebEnv(rest, warn)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("[env] MAP_TILE_URL"),
    );
  });

  it("warns when a tile provider is set without its credit", () => {
    const warn = vi.fn();
    const { MAP_TILE_ATTRIBUTION, ...rest } = PRODUCTION_ENV;

    expect(rest.MAP_TILE_URL).toBeTruthy();
    expect(() => assertWebEnv(rest, warn)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("[env] MAP_TILE_ATTRIBUTION"),
    );

    warn.mockClear();
    assertWebEnv({ ...rest, MAP_TILE_ATTRIBUTION }, warn);
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining("MAP_TILE_ATTRIBUTION"),
    );
  });

  it("runs when the Node server starts, and refuses to start without the API URL", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("HTTP_REQUEST", "http://api:3333");
    vi.stubEnv("PUBLIC_API_URL", "");

    const { register } = await import("@/instrumentation");

    await expect(register()).rejects.toThrow(/PUBLIC_API_URL: obrigatória/);

    vi.stubEnv("PUBLIC_API_URL", "http://localhost:3333");

    await expect(register()).resolves.toBeUndefined();

    vi.unstubAllEnvs();
  });

  it("exits the production server instead of serving without its configuration", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HTTP_REQUEST", "http://api:3333");
    vi.stubEnv("PUBLIC_API_URL", "");

    const errorLog = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit");
    }) as never);

    const { register } = await import("@/instrumentation");

    await expect(register()).rejects.toThrow("process.exit");
    expect(exit).toHaveBeenCalledWith(1);
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringMatching(/PUBLIC_API_URL: obrigatória/),
    );

    exit.mockRestore();
    errorLog.mockRestore();
    vi.unstubAllEnvs();
  });

  it("is wired into the build", () => {
    const nextConfig = readFileSync(
      resolve(process.cwd(), "next.config.mjs"),
      "utf8",
    );

    expect(nextConfig).toMatch(/instrumentationHook:\s*true/);
  });
});

describe("the configuration written into the page", () => {
  const HOSTILE = "</script><script>alert(document.cookie)</script><!--";

  function render(env: Record<string, string | undefined>): HTMLElement {
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(
      createElement(PublicConfigScript, { env }),
    );

    return host;
  }

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("is a JSON data block the browser parses back to the same values", () => {
    const host = render(PRODUCTION_ENV);
    const element = host.querySelector("script#public-config");

    expect(element?.getAttribute("type")).toBe("application/json");
    expect(JSON.parse(element!.textContent!)).toEqual(config(PRODUCTION_ENV));
  });

  it("cannot be broken out of by a configured value", () => {
    const env = {
      ...PRODUCTION_ENV,
      MAP_TILE_ATTRIBUTION: HOSTILE,
      PUBLIC_API_URL: `https://api.intrajetto.test/?q=${encodeURI("x")}</script><img src=x onerror=alert(1)>`,
    };

    const markup = renderToStaticMarkup(
      createElement(PublicConfigScript, { env }),
    );
    const host = render(env);

    // One element, nothing after it: no second script, no image.
    expect(markup.match(/<\/script>/gi)).toHaveLength(1);
    expect(host.querySelectorAll("script")).toHaveLength(1);
    expect(host.querySelector("img")).toBeNull();

    // And the value still arrives whole (the credit escaped for Leaflet).
    const parsed = JSON.parse(
      host.querySelector("script")!.textContent!,
    ) as PublicConfig;

    expect(parsed).toEqual(config(env));
    expect(parsed.apiUrl).toContain("</script>");
  });

  it("escapes what JSON.stringify leaves raw", () => {
    const serialized = serializePublicConfig({
      ...config(DEV_ENV),
      turnstileSiteKey: "<&>\u2028\u2029",
    });

    expect(serialized).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(serialized).turnstileSiteKey).toBe("<&>\u2028\u2029");
  });

  it("is not written while the build prerenders, so no page carries the build's values", () => {
    const host = render({
      ...PRODUCTION_ENV,
      NEXT_PHASE: "phase-production-build",
    });

    expect(host.querySelector("script#public-config")).toBeNull();
  });

  it("is not written when the environment is incomplete", () => {
    expect(
      render({ NODE_ENV: "development" }).querySelector("script#public-config"),
    ).toBeNull();
  });

  it("is rendered by the root layout", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8",
    );

    expect(layout).toContain("<PublicConfigScript />");
  });
});

describe("/public-config.json", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("answers the running server's configuration, never cached", async () => {
    for (const [name, value] of Object.entries(PRODUCTION_ENV))
      vi.stubEnv(name, value);

    const { GET } = await import("@/app/public-config.json/route");
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(config(PRODUCTION_ENV));
  });

  it("says only that it is unavailable when the server is misconfigured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_API_URL", "");
    vi.stubEnv(
      "MAP_TILE_URL",
      "http://tiles.example.test/{z}/{x}/{y}.png?key=tile-secret",
    );

    const { GET } = await import("@/app/public-config.json/route");
    const response = GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).not.toMatch(/PUBLIC_API_URL|MAP_TILE_URL|tile-secret/);
  });

  it("stays outside the middleware, like /build-id.json", async () => {
    const { config: middlewareConfig } = await import("@/middleware");
    const [pattern] = middlewareConfig.matcher;
    const matches = (path: string) => new RegExp(`^${pattern}$`).test(path);

    expect(matches("/dashboard")).toBe(true);
    expect(matches("/public-config.json")).toBe(false);
  });
});
