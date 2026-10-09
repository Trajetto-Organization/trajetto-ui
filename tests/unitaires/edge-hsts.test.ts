// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * HSTS on the bare domain, which the preload list requires.
 *
 * www.intrajetto.com sends `max-age=63072000; includeSubDomains; preload` from
 * next.config.mjs. But intrajetto.com is answered by Traefik alone — a
 * redirect to www with no headers middleware — so the apex never sent HSTS,
 * and hstspreload.org refuses a domain whose apex does not. The `preload` on
 * www was inert, and a first visit to http://intrajetto.com on a hostile
 * network stayed open to SSL stripping.
 */
const compose = readFileSync(
  resolve(process.cwd(), "compose.production.yaml"),
  "utf8",
);

function label(name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return compose.match(new RegExp(`- ${escaped}=(.+)`))?.[1]?.trim();
}

// Router and middleware names carry the stack's ROUTER_PREFIX, so production
// and staging can share one Traefik (docs/deploy.md, Stack mode).
describe("the apex redirect", () => {
  const chain = (
    label("traefik.http.routers.${ROUTER_PREFIX}-web-apex.middlewares") ?? ""
  )
    .split(",")
    .map((name) => name.trim());

  it("runs a headers middleware before redirecting", () => {
    expect(chain.at(-1)).toBe("${ROUTER_PREFIX}-to-canonical");
    expect(chain.length).toBeGreaterThan(1);
  });

  it("redirects to the canonical host of the same stack, permanently", () => {
    const prefix =
      "traefik.http.middlewares.${ROUTER_PREFIX}-to-canonical.redirectregex";

    expect(label(`${prefix}.replacement`)).toBe("https://${WEB_HOST}/$${1}");
    expect(label(`${prefix}.permanent`)).toBe("true");
  });

  it("sends a preload-grade HSTS on the redirect itself", () => {
    const hsts =
      chain.find((name) => name !== "${ROUTER_PREFIX}-to-canonical") ?? "";
    const prefix = `traefik.http.middlewares.${hsts}.headers`;

    expect(Number(label(`${prefix}.stsSeconds`))).toBeGreaterThanOrEqual(
      31_536_000,
    );
    expect(label(`${prefix}.stsIncludeSubdomains`)).toBe("true");
    expect(label(`${prefix}.stsPreload`)).toBe("true");
  });
});
