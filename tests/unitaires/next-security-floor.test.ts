// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The web server's own attack surface, pinned.
 *
 * Next 14.2.3 skipped the whole middleware for any request carrying
 * `x-middleware-subrequest` with the middleware's name five times
 * (CVE-2025-29927) — and with it the role routing and the `x-pathname` the
 * page gate reads. 14.2.35 is the last release of the 14 line and also closes
 * the RSC and Server Action denials of service that apply to this app.
 *
 * The image optimizer is the other anonymous path in: whatever
 * `remotePatterns` allows, anyone can make this server fetch and decode.
 */
function installedNextVersion(): string {
  const manifest = resolve(
    process.cwd(),
    "node_modules",
    "next",
    "package.json",
  );

  return JSON.parse(readFileSync(manifest, "utf8")).version;
}

function atLeast(version: string, floor: string): boolean {
  const a = version.split(".").map(Number);
  const b = floor.split(".").map(Number);

  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index];
  }

  return true;
}

describe("the Next.js the server runs", () => {
  it("is at least 14.2.35", () => {
    const version = installedNextVersion();

    expect(atLeast(version, "14.2.35"), `next@${version}`).toBe(true);
  });

  it("is what package.json pins", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    );

    expect(manifest.dependencies.next).toBe(installedNextVersion());
  });
});

describe("what the image optimizer will fetch", () => {
  it("no external host in production", async () => {
    const { default: config } = await import("../../next.config.mjs");

    const resolved = config;

    const patterns: Array<{ hostname?: string }> =
      resolved.images?.remotePatterns ?? [];

    // Anything listed is fetched and decoded by sharp on this server for
    // any anonymous request. The site's own images are local files.
    expect(
      patterns.filter((pattern) => pattern.hostname !== "localhost"),
    ).toEqual([]);
  });
});

describe("the headers every page carries", () => {
  it("includes the CSP directives nothing on the pages depends on", async () => {
    const { default: config } = await import("../../next.config.mjs");

    const resolved = config;

    const rules: Array<{ headers: Array<{ key: string; value: string }> }> =
      await resolved.headers!();

    const csp = rules
      .flatMap((rule) => rule.headers)
      .find((header) => header.key === "Content-Security-Policy");

    expect(csp?.value).toContain("object-src 'none'");
    expect(csp?.value).toContain("base-uri 'self'");
    expect(csp?.value).toContain("frame-ancestors 'none'");

    // A static script-src would break Next 14's inline bootstrap; it has to
    // come from the middleware with a nonce, or not at all.
    expect(csp?.value).not.toContain("script-src");
  });
});
