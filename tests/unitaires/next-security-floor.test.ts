// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The web server's own attack surface, pinned.
 *
 * Next 14.2.3 skipped the whole middleware for any request carrying
 * `x-middleware-subrequest` with the middleware's name five times
 * (CVE-2025-29927) — and with it the role routing and the `x-pathname` the
 * page gate reads. 14.2.35 is the last release of the 14 line: it closes that
 * and the December 2025 RSC denial of service (CVE-2025-55184, completed by
 * CVE-2025-67779), and nothing published after it. The 14 line is
 * unsupported, so the 2026 advisories stay open on it — decision, residual
 * risk and upgrade date in docs/arquitetura.md, "Next.js 14: versão e avisos
 * de segurança":
 *
 * - The three critical RCEs (GHSA-p293-qw3h-jr36 on Windows hosts,
 *   GHSA-2xp9-vwfh-vxw4 with AVIF and GHSA-2464-fhr4-w9xw with SVG in the
 *   image optimizer) are not reachable in this deployment only because of
 *   the configuration the checks below pin: no remote image host, SVG
 *   refused before sharp, sharp >= 0.35.5, a Linux Alpine (musl) image.
 *   They are allowlisted in audit-ci.jsonc on those grounds.
 * - The Server Actions and RSC denials of service (GHSA-m99w-x7hq-7vfj,
 *   GHSA-p3m5-59mp-jv5r, GHSA-q4gf-8mx6-v5v3, GHSA-8h8q-6873-q5fj,
 *   GHSA-h25m-26qc-wcjf) are NOT closed: no 14.x fix and no workaround.
 *   They stay open until the upgrade.
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

  // GHSA-2464-fhr4-w9xw: the optimizer refuses an SVG before sharp sees it
  // unless this flag is on.
  it("refuses SVG before sharp decodes it", async () => {
    const { default: config } = await import("../../next.config.mjs");

    expect(config.images?.dangerouslyAllowSVG).not.toBe(true);
  });

  // The advisory's own workaround: Next 14 requires whatever "sharp"
  // resolves to from its directory, so the hoisted copy is the one used.
  it("decodes with sharp 0.35.5 or later, the copy Next resolves", () => {
    const installed = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "node_modules", "sharp", "package.json"),
        "utf8",
      ),
    ).version as string;

    expect(atLeast(installed, "0.35.5"), `sharp@${installed}`).toBe(true);
    expect(
      existsSync(
        resolve(process.cwd(), "node_modules", "next", "node_modules", "sharp"),
      ),
    ).toBe(false);
  });

  // GHSA-2464 needs glibc and GHSA-p293-qw3h-jr36 a Windows host: the
  // server runs only on the Alpine (musl) stage.
  it("runs on Linux Alpine (musl)", () => {
    const dockerfile = readFileSync(
      resolve(process.cwd(), "Dockerfile"),
      "utf8",
    );
    const stages = [
      ...dockerfile.matchAll(/^FROM\s+(\S+)(?:\s+AS\s+(\S+))?/gim),
    ];
    const images = new Map<string, string>();

    for (const [, from, alias] of stages) {
      const image = images.get(from) ?? from;
      if (alias) images.set(alias, image);
    }

    const runner = stages.at(-1)!;
    const runnerImage = images.get(runner[1]) ?? runner[1];

    // node:<v>-alpine or a bare alpine:<v> carrying the node binary.
    expect(runnerImage).toMatch(
      /^(?:node:[\w.-]*alpine[\w.-]*|alpine:[\w.-]+)@sha256:/,
    );
  });
});

describe("what the router will proxy", () => {
  // GHSA-p9j2-gv94-2wf4 (SSRF) and GHSA-ggv3-7p47-pfv8 (request smuggling)
  // need a rewrite; this app has none.
  it("has no rewrites", async () => {
    const { default: config } = await import("../../next.config.mjs");

    expect(config.rewrites).toBeUndefined();
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
