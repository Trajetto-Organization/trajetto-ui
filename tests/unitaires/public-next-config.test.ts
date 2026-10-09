// @vitest-environment node
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { LEGACY_LEGAL_SLUGS } from "@/lib/content/legal-documents";

/**
 * What next.config.mjs promises the public site: fresh server renders on
 * back navigation, old legal links that still land, and tokenised pages that
 * say noindex in a place a crawler reads even when robots.txt keeps it out.
 */
const APP_DIR = join(process.cwd(), "src", "app");

async function resolvedConfig() {
  const { default: config } = await import("../../next.config.mjs");

  return config;
}

describe("next.config.mjs", () => {
  it("never reuses a dynamic server render from the router cache (decision 2.4)", async () => {
    const config = await resolvedConfig();

    expect(config.experimental?.staleTimes?.dynamic).toBe(0);
  });

  it("sends X-Robots-Tag noindex on the tokenised pages", async () => {
    const config = await resolvedConfig();

    const rules: Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }> = await config.headers!();

    for (const source of ["/verificar/:path*", "/acompanhar/:path*"]) {
      const rule = rules.find((item) => item.source === source);
      const header = rule?.headers.find((item) => item.key === "X-Robots-Tag");

      expect(header?.value, source).toBe("noindex, nofollow");
    }

    // And only there: a site-wide noindex at build time would travel with
    // the image when it is promoted to production.
    const siteWide = rules.filter((rule) =>
      rule.headers.some((item) => item.key === "X-Robots-Tag"),
    );
    expect(siteWide.map((rule) => rule.source).sort()).toEqual([
      "/acompanhar/:path*",
      "/verificar/:path*",
    ]);
  });

  it("redirects every old legal slug permanently to its new page", async () => {
    const config = await resolvedConfig();

    const redirects: Array<{
      source: string;
      destination: string;
      permanent: boolean;
    }> = (await config.redirects!()) as Array<{
      source: string;
      destination: string;
      permanent: boolean;
    }>;

    for (const [legacy, slug] of Object.entries(LEGACY_LEGAL_SLUGS)) {
      expect(redirects).toContainEqual({
        source: `/legal/${legacy}`,
        destination: `/legal/${slug}`,
        permanent: true,
      });
    }
  });

  it("redirects the old English institutional paths permanently to the Portuguese ones (decision 16.20)", async () => {
    const config = await resolvedConfig();

    const redirects = (await config.redirects!()) as Array<{
      source: string;
      destination: string;
      permanent: boolean;
    }>;

    const moved = {
      "/about": "/sobre",
      "/contact": "/contato",
      "/quote": "/orcamento",
    };

    for (const [legacy, page] of Object.entries(moved)) {
      // permanent: true is what Next answers with 308.
      expect(redirects).toContainEqual({
        source: legacy,
        destination: page,
        permanent: true,
      });
      // The destination is a real page and the old folder is gone, so the
      // redirect is the only thing answering the old path.
      expect(existsSync(join(APP_DIR, page.slice(1), "page.tsx")), page).toBe(
        true,
      );
      expect(existsSync(join(APP_DIR, legacy.slice(1))), legacy).toBe(false);
    }
  });

  it("ships the MDX content with the standalone server", async () => {
    const config = await resolvedConfig();
    const includes: Record<string, string[]> =
      config.experimental?.outputFileTracingIncludes ?? {};

    expect(includes["/blog"]).toContain("./src/content/blog/**/*.mdx");
    expect(includes["/legal"]).toContain("./src/content/legal/**/*.mdx");
  });

  it("ships the developer portal's guides with every /docs route, on its own key", async () => {
    const config = await resolvedConfig();
    const includes: Record<string, string[]> =
      config.experimental?.outputFileTracingIncludes ?? {};

    // The same matcher and options the build uses to pick a route's
    // includes (next/dist/build/collect-build-traces.js). Next ships it
    // compiled and untyped, hence the require and the explicit shape.
    const picomatch = createRequire(import.meta.url)(
      "next/dist/compiled/picomatch",
    ) as (
      glob: string,
      options: { dot: boolean; contains: boolean },
    ) => (route: string) => boolean;

    const includesOf = (route: string): string[] =>
      Object.entries(includes).flatMap(([glob, files]) =>
        picomatch(glob, { dot: true, contains: true })(route) ? files : [],
      );

    // guides.ts reads src/content/docs at request time. The sitemap's broad
    // glob happens to carry the files today; the portal must not depend on it.
    for (const route of ["/docs", "/docs/[slug]", "/docs/referencia"]) {
      expect(includesOf(route), route).toContain("./src/content/docs/**/*.mdx");
    }

    expect(includes["/sitemap.xml"]).toBeDefined();
    expect(
      Object.entries(includes).some(
        ([glob, files]) =>
          glob !== "/sitemap.xml" &&
          files.includes("./src/content/docs/**/*.mdx"),
      ),
      "só o glob do sitemap leva os guias",
    ).toBe(true);
  });
});
