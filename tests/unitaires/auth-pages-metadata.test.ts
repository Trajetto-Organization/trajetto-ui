// @vitest-environment node
import type { Metadata } from "next";
import { accumulateMetadata } from "next/dist/lib/metadata/resolve-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";

import { React, renderHtml } from "./helpers/render-html";

vi.mock("@/components/site/site-header", () => ({ SiteHeader: () => null }));

/**
 * The sign-in pages in search results (PUB-8).
 *
 * /login and /forgot said `index, follow` with the canonical and og:url set
 * to METADATA_BASE, the home page: each told Google it was the home page,
 * while the sitemap listed them at priority 1.0. They are doors, not
 * content: noindex (links still followed), each with its own canonical.
 * The token pages (/forgot/password, /new-verification) inherited whatever
 * the layout said; robots.txt keeps crawlers out, and the meta says so too
 * for a link shared elsewhere.
 */
const ORIGIN = "https://www.intrajetto.com";

// The first import of the root layout compiles most of the app; on a busy
// machine that alone passed the default 5 s.
vi.setConfig({ testTimeout: 30_000 });

afterEach(() => {
  vi.unstubAllEnvs();
});

async function resolved(page: Metadata, pathname: string) {
  vi.stubEnv("METADATA_BASE", ORIGIN);
  const layout = await import("@/app/layout");

  return accumulateMetadata(
    [
      [await layout.generateMetadata(), null, null],
      [page, null, null],
    ],
    { pathname, trailingSlash: false, isStandaloneMode: false },
  );
}

async function pageMetadata(module: string): Promise<Metadata> {
  const page = await import(/* @vite-ignore */ module);

  return page.metadata ?? (await page.generateMetadata());
}

const AUTH_PAGES = [
  ["/login", "@/app/(auth)/login/page"],
  ["/forgot", "@/app/(auth)/forgot/page"],
  ["/forgot/password", "@/app/(auth)/forgot/password/page"],
  ["/new-verification", "@/app/(auth)/new-verification/page"],
] as const;

describe("the sign-in pages", () => {
  it.each(AUTH_PAGES)(
    "%s is noindex and still follows links",
    async (path, module) => {
      const { robots } = await resolved(await pageMetadata(module), path);

      expect(robots).toEqual({ basic: "noindex, follow", googleBot: null });
    },
  );

  it.each(AUTH_PAGES)(
    "%s does not present itself as the home page: its own canonical and og:url",
    async (path, module) => {
      const metadata = await resolved(await pageMetadata(module), path);

      expect(metadata.alternates?.canonical?.url.toString()).toBe(
        `${ORIGIN}${path}`,
      );
      expect(metadata.openGraph?.url?.toString()).toBe(`${ORIGIN}${path}`);
    },
  );

  it("/login and /forgot stay out of the sitemap", async () => {
    vi.stubEnv("METADATA_BASE", ORIGIN);
    const sitemap = (await import("@/app/sitemap")).default;
    const urls = (await sitemap()).map((entry) => new URL(entry.url).pathname);

    expect(urls).not.toContain("/login");
    expect(urls).not.toContain("/forgot");
  });
});

describe("the 404 page", () => {
  it("is noindex", async () => {
    const { robots } = await resolved(
      await pageMetadata("@/app/not-found"),
      "/qualquer",
    );

    expect(robots?.basic).toBe("noindex, follow");
  });

  it("the back link is named by its visible text (WCAG 2.5.3), inside a main", async () => {
    vi.stubEnv("METADATA_BASE", ORIGIN);
    const NotFound = (await import("@/app/not-found")).default;
    const html = renderHtml(React.createElement(NotFound));

    const link = /<a\b[^>]*href="\/"[^>]*>([\s\S]*?)<\/a>/.exec(html);

    expect(link, "link para a página inicial").not.toBeNull();
    expect(link![0]).not.toMatch(/aria-label=/);
    expect(link![1].replace(/<[^>]+>/g, "")).toContain(
      "Voltar para a página inicial",
    );

    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html).toMatch(/<main\b[\s\S]*<h1\b[\s\S]*<\/main>/);
  });
});
