// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import * as robotsModule from "@/app/robots";

/**
 * robots.txt, per environment.
 *
 * Production: permissive. Google renders pages like a browser, so it has to
 * fetch /_next/ (the CSS, JS and optimized images); the old file blocked it
 * for every crawler, Googlebot included, and `*.xml$` would have hidden the
 * RSS feed. Only the private areas, the API and the tokenised pages are off.
 *
 * Staging: nothing is crawlable (decision 12.2). The file reads APP_ENV per
 * request, because the same image is promoted from staging to production.
 */
const robots = robotsModule.default;

type Rule = ReturnType<typeof robots>["rules"] extends infer R
  ? R extends Array<infer Item>
    ? Item
    : R
  : never;

function rules(): Rule[] {
  const value = robots().rules;
  return Array.isArray(value) ? value : [value];
}

function list(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function generalRule(): Rule {
  const rule = rules().find((item) => item.userAgent === "*");

  expect(rule, "a rule for every crawler").toBeDefined();
  return rule!;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("robots.txt in production", () => {
  function inProduction() {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("METADATA_BASE", "https://www.intrajetto.com/");
  }

  it("lets every crawler fetch the assets a page needs to render", () => {
    inProduction();

    for (const rule of rules()) {
      for (const path of list(rule.disallow)) {
        expect(path, JSON.stringify(rule.userAgent)).not.toMatch(/_next/);
        expect(path, JSON.stringify(rule.userAgent)).not.toMatch(
          /\*\.(?:xml|json|txt)\$?$/,
        );
      }
    }
  });

  it("keeps the site open and the private areas closed", () => {
    inProduction();

    const general = generalRule();

    expect(list(general.allow)).toContain("/");
    expect(list(general.disallow)).toEqual(
      expect.arrayContaining([
        "/dashboard",
        "/admin",
        "/profile",
        "/notifications",
        "/driver",
        "/api/",
        "/new-verification",
        "/verificar/",
        "/acompanhar/",
        "/*?*token=",
      ]),
    );
  });

  it("points at the sitemap on the canonical origin, without noise directives", () => {
    inProduction();

    const result = robots();

    expect(result.sitemap).toBe("https://www.intrajetto.com/sitemap.xml");

    // `host` is Yandex-only and `crawl-delay` is ignored by Google.
    expect(result.host).toBeUndefined();
    for (const rule of rules()) expect(rule.crawlDelay).toBeUndefined();
  });
});

describe("robots.txt outside production", () => {
  it.each(["staging", "development"])(
    "closes everything on %s and advertises no sitemap",
    (environment) => {
      vi.stubEnv("APP_ENV", environment);
      vi.stubEnv("METADATA_BASE", "https://staging.intrajetto.com");

      const result = robots();

      expect(result.sitemap).toBeUndefined();
      expect(rules()).toEqual([{ userAgent: "*", disallow: "/" }]);
    },
  );

  it("is answered per request, so a promoted image follows APP_ENV", () => {
    expect((robotsModule as { dynamic?: string }).dynamic).toBe(
      "force-dynamic",
    );
  });
});
