// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

import middleware from "@/middleware";
import { buildContentSecurityPolicy } from "@/lib/content-security-policy";
import { POST as cspReport } from "@/app/api/csp-report/route";

/**
 * The script policy of the pages, which the static headers cannot carry.
 *
 * next.config.mjs sends the directives nothing depends on (no plugins, no
 * <base>, no framing). The one that contains an XSS — which scripts may run,
 * and where a script may send what it read — needs a nonce per request,
 * because Next 14 inlines its bootstrap and its RSC payload. So it comes from
 * the middleware, and Next stamps the nonce it finds in the request's CSP
 * header onto its own scripts.
 *
 * Enforced: a Report-Only policy stops nothing. It was calibrated against
 * every page of the browser suites before the switch (docs/seguranca).
 */
const API = "https://api.intrajetto.test";

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

const fresh = () =>
  jwt({ role: "BUSINESS_ADMIN", exp: Math.floor(Date.now() / 1000) + 600 });

function requestFor(path: string, withSession = true) {
  return new NextRequest(`https://app.test${path}`, {
    headers: withSession ? { cookie: `tkey=${fresh()}; rkey=r` } : {},
  });
}

function directive(policy: string, name: string): string {
  return (
    policy
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name} `)) ?? ""
  );
}

function nonceOf(policy: string | null): string | undefined {
  return policy?.match(/'nonce-([^']+)'/)?.[1];
}

beforeEach(() => {
  process.env.PUBLIC_API_URL = API;
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("an authenticated page", () => {
  it("gets a script policy with a fresh nonce and no inline escape hatch", async () => {
    const response = await middleware(requestFor("/dashboard"));
    const policy = response.headers.get("content-security-policy");

    expect(policy).toBeTruthy();

    const scripts = directive(policy!, "script-src");

    expect(scripts).toMatch(/'nonce-[A-Za-z0-9+/=]{16,}'/);
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toContain("'unsafe-inline'");

    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("report-uri /api/csp-report");
  });

  it("hands Next the same nonce on the request, so its scripts carry it", async () => {
    const response = await middleware(requestFor("/dashboard/vehicles"));

    const sent = response.headers.get("content-security-policy");
    const forwarded = response.headers.get(
      "x-middleware-request-content-security-policy",
    );

    expect(nonceOf(forwarded)).toBe(nonceOf(sent));
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(
      nonceOf(sent),
    );
  });

  it("replaces a policy the browser sent itself, so a client never picks the nonce", async () => {
    const response = await middleware(
      new NextRequest("https://app.test/dashboard", {
        headers: {
          cookie: `tkey=${fresh()}; rkey=r`,
          "content-security-policy": "script-src 'nonce-chosen-by-the-client'",
          "content-security-policy-report-only": "script-src 'unsafe-inline'",
          "x-nonce": "chosen-by-the-client",
        },
      }),
    );

    const forwarded =
      response.headers.get("x-middleware-request-content-security-policy") ??
      "";

    expect(forwarded).not.toContain("chosen-by-the-client");
    expect(nonceOf(forwarded)).toBe(
      nonceOf(response.headers.get("content-security-policy")),
    );
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(
      nonceOf(forwarded),
    );
    expect(
      response.headers.get(
        "x-middleware-request-content-security-policy-report-only",
      ),
    ).toBeNull();
  });

  it("is enforced, not only reported", async () => {
    const response = await middleware(requestFor("/dashboard"));

    expect(response.headers.get("content-security-policy")).toBeTruthy();
    expect(
      response.headers.get("content-security-policy-report-only"),
    ).toBeNull();
  });

  it("allows the theme script by its hash, beside the nonce", async () => {
    const { THEME_INIT_SCRIPT_HASH } = await import("@/lib/theme-init-script");
    const response = await middleware(requestFor("/dashboard"));
    const scripts = directive(
      response.headers.get("content-security-policy")!,
      "script-src",
    );

    expect(scripts.split(" ")).toContain(THEME_INIT_SCRIPT_HASH);
  });

  it("forbids being framed, by anyone", async () => {
    const response = await middleware(requestFor("/dashboard"));

    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("never reuses a nonce", async () => {
    const first = await middleware(requestFor("/dashboard"));
    const second = await middleware(requestFor("/dashboard"));

    expect(nonceOf(first.headers.get("content-security-policy"))).not.toBe(
      nonceOf(second.headers.get("content-security-policy")),
    );
  });

  it("lets the page reach the API and its socket, and nowhere unlisted", async () => {
    const response = await middleware(requestFor("/dashboard"));
    const connect = directive(
      response.headers.get("content-security-policy")!,
      "connect-src",
    );

    expect(connect).toContain(API);
    expect(connect).toContain("wss://api.intrajetto.test");
    expect(connect).not.toContain("*;");
    expect(connect.split(" ")).not.toContain("*");
  });
});

describe("a prerendered public page", () => {
  it("gets the policy without a nonce, which its cached HTML could not carry", async () => {
    const response = await middleware(requestFor("/blog", false));
    const policy = response.headers.get("content-security-policy");

    const scripts = directive(policy!, "script-src");

    expect(scripts).toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'nonce-");
    // A hash would make browsers ignore 'unsafe-inline' and block every
    // inline script of the cached page.
    expect(scripts).not.toContain("'sha256-");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(policy).toContain("object-src 'none'");
  });
});

describe("buildContentSecurityPolicy", () => {
  it("only allows eval in development", () => {
    expect(
      directive(
        buildContentSecurityPolicy({ nonce: "abc", dev: true }),
        "script-src",
      ),
    ).toContain("'unsafe-eval'");

    expect(
      directive(buildContentSecurityPolicy({ nonce: "abc" }), "script-src"),
    ).not.toContain("'unsafe-eval'");
  });

  it("allows the storage origins it is given", () => {
    const policy = buildContentSecurityPolicy({
      storageOrigins: ["https://files.example.test"],
    });

    expect(directive(policy, "img-src")).toContain(
      "https://files.example.test",
    );
    expect(directive(policy, "connect-src")).toContain(
      "https://files.example.test",
    );
  });
});

/**
 * The base map's tiles (decision 7.4). Production reads its provider from
 * MAP_TILE_URL at request time; the policy never listed it, so the day it
 * is enforced the tower would draw its fleet on a blank canvas.
 */
describe("the map tile provider", () => {
  const TILES = "MAP_TILE_URL";

  afterEach(() => {
    delete process.env[TILES];
    delete process.env.APP_ENV;
  });

  it("lets the pages load the configured provider's tiles", async () => {
    process.env.APP_ENV = "production";
    process.env[TILES] = "https://{s}.tiles.example.test/{z}/{x}/{y}.png";

    const response = await middleware(requestFor("/dashboard/control-tower"));
    const images = directive(
      response.headers.get("content-security-policy")!,
      "img-src",
    );

    expect(images).toContain("https://*.tiles.example.test");
  });

  it("also lets the pages load the dark style from its own host", async () => {
    process.env.APP_ENV = "production";
    process.env[TILES] = "https://{s}.tiles.example.test/{z}/{x}/{y}.png";
    process.env.MAP_TILE_URL_DARK = "https://dark.example.test/{z}/{x}/{y}.png";

    try {
      const response = await middleware(requestFor("/dashboard/control-tower"));
      const images = directive(
        response.headers.get("content-security-policy")!,
        "img-src",
      );

      expect(images).toContain("https://*.tiles.example.test");
      expect(images).toContain("https://dark.example.test");
    } finally {
      delete process.env.MAP_TILE_URL_DARK;
    }
  });

  it("adds nothing for a setting the tower would refuse", async () => {
    process.env.APP_ENV = "production";
    process.env[TILES] = "http://tiles.example.test/{z}/{x}/{y}.png";

    const response = await middleware(requestFor("/dashboard/control-tower"));
    const images = directive(
      response.headers.get("content-security-policy")!,
      "img-src",
    );

    expect(images).not.toContain("tiles.example.test");
  });

  it("lists only the hosts it is given", () => {
    const policy = buildContentSecurityPolicy({
      mapTileOrigins: ["https://*.tiles.example.test"],
    });

    expect(directive(policy, "img-src")).toContain(
      "https://*.tiles.example.test",
    );
    expect(directive(policy, "connect-src")).not.toContain(
      "tiles.example.test",
    );
  });

  // Public OSM does not take commercial load: only development may draw it,
  // and every map now reads the same setting (the location picker too).
  it("allows public OpenStreetMap tiles in development only", async () => {
    const imagesIn = async (appEnv: string) => {
      process.env.APP_ENV = appEnv;

      const response = await middleware(requestFor("/dashboard/control-tower"));

      return directive(
        response.headers.get("content-security-policy")!,
        "img-src",
      );
    };

    expect(await imagesIn("development")).toContain(
      "https://*.tile.openstreetmap.org",
    );
    expect(await imagesIn("staging")).not.toContain("openstreetmap");
    expect(await imagesIn("production")).not.toContain("openstreetmap");
    expect(directive(buildContentSecurityPolicy(), "img-src")).not.toContain(
      "openstreetmap",
    );
  });
});

describe("the static headers", () => {
  async function staticHeaders() {
    const { default: config } = await import("../../next.config.mjs");

    const resolved = config;

    const rules: Array<{ headers: Array<{ key: string; value: string }> }> =
      await resolved.headers!();

    return rules.flatMap((rule) => rule.headers);
  }

  it("turn the legacy XSS auditor off rather than on", async () => {
    // "1; mode=block" drives a filter browsers removed, and where it still
    // exists it has been used to blank out pages selectively (XS-Leaks).
    const header = (await staticHeaders()).find(
      (entry) => entry.key === "X-XSS-Protection",
    );

    expect(header?.value).toBe("0");
  });

  it("keep forms posting to this origin only", async () => {
    const csp = (await staticHeaders()).find(
      (entry) => entry.key === "Content-Security-Policy",
    );

    expect(csp?.value).toContain("form-action 'self'");
  });
});

describe("the report endpoint", () => {
  function report(body: string, type = "application/csp-report") {
    return new Request("https://app.test/api/csp-report", {
      method: "POST",
      headers: { "content-type": type },
      body,
    });
  }

  it("logs one compact line per violation and answers 204", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await cspReport(
      report(
        JSON.stringify({
          "csp-report": {
            "document-uri": "https://www.intrajetto.com/dashboard?token=secret",
            "effective-directive": "script-src-elem",
            "blocked-uri": "https://evil.example/x.js",
          },
        }),
      ),
    );

    expect(response.status).toBe(204);
    expect(log).toHaveBeenCalledTimes(1);

    const line = JSON.stringify(log.mock.calls[0]);

    expect(line).toContain("script-src-elem");
    expect(line).toContain("https://evil.example/x.js");
    expect(line).toContain("/dashboard");

    // The query string can carry tokens; the path is enough to find the page.
    expect(line).not.toContain("secret");
  });

  it("reads the Reporting API format too", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await cspReport(
      report(
        JSON.stringify([
          {
            type: "csp-violation",
            body: {
              documentURL: "https://www.intrajetto.com/admin",
              effectiveDirective: "connect-src",
              blockedURL: "https://evil.example/collect",
            },
          },
        ]),
        "application/reports+json",
      ),
    );

    expect(JSON.stringify(log.mock.calls[0])).toContain("connect-src");
  });

  it("ignores what is not a report without failing", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await cspReport(report("not json"));

    expect(response.status).toBe(204);
    expect(log).not.toHaveBeenCalled();
  });

  it("does not read an oversized body", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await cspReport(report("x".repeat(64 * 1024)));

    expect(response.status).toBe(413);
    expect(log).not.toHaveBeenCalled();
  });
});

/**
 * Decision 12.2: one image serves staging and production, so the hosts in
 * the policy come from the environment of the server answering, per
 * request — not from NEXT_PUBLIC_* values inlined at build.
 */
describe("the hosts the policy names", () => {
  afterEach(() => {
    delete process.env.PUBLIC_SOCKET_URL;
  });

  it("follows the running server's API URL, request by request", async () => {
    process.env.PUBLIC_API_URL = "https://api.staging.test";
    const staging = await middleware(requestFor("/dashboard"));

    process.env.PUBLIC_API_URL = "https://api.production.test";
    const production = await middleware(requestFor("/dashboard"));

    const connect = (response: Response) =>
      directive(
        response.headers.get("content-security-policy")!,
        "connect-src",
      );

    expect(connect(staging)).toContain("https://api.staging.test");
    expect(connect(production)).toContain("https://api.production.test");
    expect(connect(production)).not.toContain("staging");
  });

  it("opens the socket on the API's host only, ignoring a stale PUBLIC_SOCKET_URL", async () => {
    process.env.PUBLIC_SOCKET_URL = "https://socket.intrajetto.test";

    const response = await middleware(requestFor("/dashboard"));
    const connect = directive(
      response.headers.get("content-security-policy")!,
      "connect-src",
    );

    expect(connect).toContain(API);
    expect(connect).toContain("wss://api.intrajetto.test");
    expect(connect).not.toContain("socket.intrajetto.test");
  });
});
