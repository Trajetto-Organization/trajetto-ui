// @vitest-environment node
import type { Metadata } from "next";
import { accumulateMetadata } from "next/dist/lib/metadata/resolve-metadata";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { buildPageMetadata } from "@/lib/page-metadata";
import { absoluteUrl, appEnv, isIndexable, siteUrl } from "@/lib/site";

/**
 * The public pages' metadata.
 *
 * The root layout declared a canonical (and hreflang) pointing at the home
 * page, and every page without its own inherited it: /login, for one, told
 * Google it was the home page. It also pointed apple-touch-icon at a path
 * without its extension and at a browserconfig.xml that does not exist.
 */
afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * The first import of a page compiles its whole module graph: the About page
 * alone pulls in its sections, icons and CSS modules. On its own that takes
 * about 0.3 s; in the full unit run, with every worker compiling at once, it
 * has run past the 5 s a test gets, and /about failed on the import rather
 * than on anything it asserts. So the modules are compiled here, once, with a
 * budget for compiling, and the tests below import them from the cache and
 * time only what they check. Nothing here reads the environment at import
 * time (the layout reads METADATA_BASE inside generateMetadata), so loading
 * them before any stub changes no result.
 */
const MODULE_COMPILE_TIMEOUT_MS = 60_000;

beforeAll(async () => {
  await import("@/app/layout");
  await import("@/app/page");
  await import("@/app/sobre/page");
  await import("@/app/orcamento/page");
  await import("@/app/blog/page");
}, MODULE_COMPILE_TIMEOUT_MS);

describe("the root layout", () => {
  async function rootMetadata() {
    vi.stubEnv("METADATA_BASE", "https://www.intrajetto.com");
    const layout = await import("@/app/layout");

    return layout.generateMetadata();
  }

  it("hands no canonical down to the pages", async () => {
    const metadata = await rootMetadata();

    expect(metadata.alternates).toBeUndefined();
  });

  // Share cards treat og:url as the canonical: /login or a tracking link
  // shared on WhatsApp would otherwise present itself as the home page.
  it("hands no og:url down either", async () => {
    const metadata = await rootMetadata();

    expect(metadata.openGraph).not.toHaveProperty("url");
  });

  it("titles pages as '<page> | Trajetto'", async () => {
    const metadata = await rootMetadata();

    expect(metadata.title).toMatchObject({ template: "%s | Trajetto" });
  });

  it("points only at icon files that exist", async () => {
    const metadata = await rootMetadata();

    expect(metadata.icons).toMatchObject({
      apple: [{ url: "/apple-touch-icon.png" }],
    });
    expect(metadata.other).not.toHaveProperty("msapplication-config");
    expect(metadata.other?.["theme-color"]).toBe("#d81b60");
  });

  it("resolves relative URLs against METADATA_BASE", async () => {
    const metadata = await rootMetadata();

    expect(metadata.metadataBase?.toString()).toBe(
      "https://www.intrajetto.com/",
    );
  });
});

describe("the public pages", () => {
  it.each([
    ["/sobre", "@/app/sobre/page"],
    ["/orcamento", "@/app/orcamento/page"],
    ["/app-do-motorista", "@/app/app-do-motorista/page"],
  ])(
    "%s declares its own canonical and a title that fits a result",
    async (path, module) => {
      const { metadata } = await import(/* @vite-ignore */ module);

      expect(metadata.alternates.canonical).toBe(path);
      expect(`${metadata.title} | Trajetto`.length).toBeLessThanOrEqual(60);
      expect(metadata.openGraph.url).toBe(path);
    },
  );

  it("/ declares itself as the canonical home, in the card too", async () => {
    const { metadata } = await import("@/app/page");

    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.openGraph).toMatchObject({
      url: "/",
      siteName: "Trajetto",
      locale: "pt_BR",
      images: [{ url: "/og-default.jpg" }],
    });
    // The brand is already in the home title: no template on top of it.
    expect(metadata.title).toEqual({
      absolute: "Trajetto | Gestão de frotas e de entregas",
    });
  });
});

describe("buildPageMetadata", () => {
  it("gives the page its canonical, its card and the site's locale", () => {
    const metadata = buildPageMetadata({
      path: "/sobre",
      title: "Sobre nós",
      description: "Quem faz o Trajetto.",
    });

    // An indexable page leaves robots to the layout (see "merged by Next").
    expect(metadata).not.toHaveProperty("robots");
    expect(metadata).toMatchObject({
      title: "Sobre nós",
      alternates: { canonical: "/sobre" },
      openGraph: {
        url: "/sobre",
        siteName: "Trajetto",
        locale: "pt_BR",
        type: "website",
        images: [{ url: "/og-default.jpg", width: 1200, height: 630 }],
      },
      twitter: { card: "summary_large_image", images: ["/og-default.jpg"] },
    });
  });

  it("omits the image keys when a file-based card takes over", () => {
    const metadata = buildPageMetadata({
      path: "/blog/x",
      title: "Artigo",
      description: "Texto.",
      defaultImage: false,
    });

    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(metadata.twitter).not.toHaveProperty("images");
  });

  it("keeps links followed on a noindex page", () => {
    const metadata = buildPageMetadata({
      path: "/legal/termos",
      title: "Termos",
      description: "Texto.",
      noindex: true,
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});

/**
 * Layout and page merged by Next's own resolver, the one that writes the
 * <meta> tags. A page's `robots` replaces the layout's whole block, so a
 * helper that always emitted one silently dropped the googleBot directives.
 */
describe("the robots tags a page ends up with, merged by Next", () => {
  const GOOGLE_BOT =
    "index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1";

  async function resolved(page: Metadata, pathname: string) {
    vi.stubEnv("METADATA_BASE", "https://www.intrajetto.com");
    const layout = await import("@/app/layout");

    return accumulateMetadata(
      [
        [await layout.generateMetadata(), null, null],
        [page, null, null],
      ],
      { pathname, trailingSlash: false, isStandaloneMode: false },
    );
  }

  it.each([
    ["/", "@/app/page"],
    ["/sobre", "@/app/sobre/page"],
    ["/orcamento", "@/app/orcamento/page"],
    ["/app-do-motorista", "@/app/app-do-motorista/page"],
  ])("%s keeps the layout's googleBot directives", async (path, module) => {
    const { metadata } = await import(/* @vite-ignore */ module);
    const { robots } = await resolved(metadata, path);

    expect(robots).toEqual({ basic: "index, follow", googleBot: GOOGLE_BOT });
  });

  it("/blog keeps them too", async () => {
    const blog = await import("@/app/blog/page");
    const { robots } = await resolved(blog.generateMetadata(), "/blog");

    expect(robots?.googleBot).toBe(GOOGLE_BOT);
  });

  it("a noindex page drops them all, so no tag says index", async () => {
    const page = buildPageMetadata({
      path: "/legal/termos",
      title: "Termos",
      description: "Texto.",
      noindex: true,
    });
    const { robots } = await resolved(page, "/legal/termos");

    expect(robots).toEqual({ basic: "noindex, follow", googleBot: null });
  });
});

describe("site", () => {
  it("normalizes the origin", () => {
    vi.stubEnv("METADATA_BASE", "https://www.intrajetto.com/qualquer/caminho/");
    expect(siteUrl()).toBe("https://www.intrajetto.com");
    expect(absoluteUrl("blog")).toBe("https://www.intrajetto.com/blog");
  });

  it.each([["não é uma URL"], [""], ["mailto:contato@intrajetto.com"]])(
    "falls back to localhost while developing when METADATA_BASE is %j",
    (value) => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("METADATA_BASE", value);

      expect(siteUrl()).toBe("http://localhost:3000");
    },
  );

  // A production build without it would prerender canonicals, the sitemap,
  // the feed and the JSON-LD on localhost, and nothing would say so.
  it.each([["não é uma URL"], [""], ["mailto:contato@intrajetto.com"]])(
    "fails a production build when METADATA_BASE is %j, naming the variable",
    (value) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("METADATA_BASE", value);

      expect(() => siteUrl()).toThrow(/METADATA_BASE/);
      expect(() => absoluteUrl("/blog")).toThrow(/METADATA_BASE/);
    },
  );

  it.each([
    ["staging", "production", "staging", false],
    ["production", "production", "production", true],
    ["Production", "production", "production", true],
    [undefined, "production", "production", true],
    [undefined, "development", "development", false],
    // A typo must not make a staging stack indexable.
    ["homolog", "production", "staging", false],
    ["prod", "production", "staging", false],
  ])(
    "APP_ENV=%s with NODE_ENV=%s is %s (indexable: %s)",
    (app, node, expected, indexable) => {
      vi.stubEnv("NODE_ENV", node);
      vi.stubEnv("APP_ENV", app ?? "");

      expect(appEnv()).toBe(expected);
      expect(isIndexable()).toBe(indexable);
    },
  );
});
