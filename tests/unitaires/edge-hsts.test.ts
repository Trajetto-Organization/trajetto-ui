// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * HSTS on the canonical host and on the bare domain.
 *
 * www.intrajetto.com is served by the Next server, which sends HSTS from
 * next.config.mjs on every path. intrajetto.com never reaches it: it only
 * redirects to www at the edge. hstspreload.org refuses a domain whose apex
 * does not send HSTS, so without a header on that redirect the `preload` on
 * www is inert and a first visit to http://intrajetto.com on a hostile network
 * stays open to SSL stripping. The web now runs as a Dokploy Application with
 * no Traefik labels of its own, so the apex redirect is configured at the edge
 * (Cloudflare, or a Traefik dynamic file) by docs/deploy.md; these tests keep
 * both halves from rotting.
 */
const deploy = readFileSync(
  resolve(process.cwd(), "docs", "deploy.md"),
  "utf8",
).replace(/\r\n/g, "\n");

type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

describe("HSTS on the canonical host", () => {
  it("is preload-grade and sent on every path by next.config.mjs", async () => {
    const { default: config } = await import("../../next.config.mjs");
    const rules: HeaderRule[] = await config.headers!();
    const value = rules
      .find((rule) => rule.source === "/(.*)")
      ?.headers.find((item) => item.key === "Strict-Transport-Security")?.value;

    expect(value, "Strict-Transport-Security").toBeTruthy();

    const maxAge = Number(value!.match(/max-age=(\d+)/)?.[1]);

    expect(maxAge).toBeGreaterThanOrEqual(31_536_000);
    expect(value).toContain("includeSubDomains");
    expect(value).toContain("preload");
  });
});

describe("the apex redirect, as docs/deploy.md configures it in Traefik", () => {
  const block =
    deploy.match(/```yaml\n(http:\n[\s\S]*?redirectRegex:[\s\S]*?)```/)?.[1] ??
    "";

  it("is documented as a Traefik dynamic file", () => {
    expect(block, "bloco yaml do redirect do apex").not.toBe("");
  });

  it("runs the HSTS middleware before the redirect, so the 301 carries it", () => {
    const chain = block.match(/middlewares:\n((?:\s+- .+\n)+)/)?.[1] ?? "";
    const names = [...chain.matchAll(/- (\S+)/g)].map((match) => match[1]);

    expect(names).toHaveLength(2);
    expect(names[0]).toMatch(/-apex-hsts$/);
    expect(names[1]).toMatch(/-to-canonical$/);
  });

  it("sends a preload-grade HSTS", () => {
    expect(
      Number(block.match(/stsSeconds: (\d+)/)?.[1]),
    ).toBeGreaterThanOrEqual(31_536_000);
    expect(block).toMatch(/stsIncludeSubdomains: true/);
    expect(block).toMatch(/stsPreload: true/);
    expect(block).toMatch(/forceSTSHeader: true/);
  });

  it("redirects permanently to the canonical host, path kept", () => {
    expect(block).toContain('replacement: "https://www.intrajetto.com/${1}"');
    expect(block).toMatch(/permanent: true/);
  });
});
