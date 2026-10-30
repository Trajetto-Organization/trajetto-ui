// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as legalPage from "@/app/legal/[policy]/page";
import * as blogPostPage from "@/app/blog/[slug]/page";
import * as blogOgImage from "@/app/blog/[slug]/opengraph-image";

import sitemap from "@/app/sitemap";
import { GET as feed } from "@/app/feed.xml/route";

import { serializeJsonLd } from "@/components/seo/json-ld";

import { loadAllPosts } from "@/lib/content/blog";
import { loadLegalDocuments } from "@/lib/content/legal";
import { PUBLIC_PAGES } from "@/lib/public-pages";

import { renderHtml } from "./helpers/render-html";

// The navbar is a client component with a static image import; it is not
// what these tests are about, and it renders nothing request-dependent.
vi.mock("@/components/site/site-header", () => ({ SiteHeader: () => null }));

/**
 * The public routes, called the way Next calls them.
 *
 * The legal page used to draw a "404" on an HTTP 200 whenever the document
 * was missing — and with the old CMS unconfigured it always was. Now the
 * documents are files: the registered ones exist (200), anything else is a
 * real not-found, and a draft is a not-found in every build.
 */
const ORIGIN = "https://www.intrajetto.com";

beforeEach(() => {
  vi.stubEnv("METADATA_BASE", ORIGIN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function asDevelopment() {
  vi.stubEnv("NODE_ENV", "development");
}

function asProductionBuild() {
  vi.stubEnv("NODE_ENV", "production");
}

const NOT_FOUND = { digest: "NEXT_NOT_FOUND" };

describe("/legal/[policy]", () => {
  const documents = loadLegalDocuments();

  it("prerenders only what exists and 404s everything else", () => {
    expect(legalPage.dynamicParams).toBe(false);
  });

  it.each(documents.map((doc) => [doc.slug, doc] as const))(
    "renders /legal/%s with its title, dates, navigation and body",
    async (slug, doc) => {
      asDevelopment();

      const html = renderHtml(
        await legalPage.default({ params: { policy: slug } }),
      );

      expect(html).toMatch(new RegExp(`<h1[^>]*>${doc.title}</h1>`));
      expect(html).toContain(`<time dateTime="${doc.effectiveAt}">`);
      // The document switcher marks this page's own link, whatever the
      // attribute order (its tab shows a short name, the label is its aria-label).
      expect(html).toMatch(
        new RegExp(
          `<a(?=[^>]*href="/legal/${slug}")(?=[^>]*aria-current="page")(?=[^>]*aria-label="${doc.label}")[^>]*>`,
        ),
      );
      expect(html).toContain("Identificação do responsável");
    },
  );

  it("is a real not-found for a slug nobody registered", async () => {
    asDevelopment();

    await expect(
      legalPage.default({ params: { policy: "inventada" } }),
    ).rejects.toMatchObject(NOT_FOUND);
    expect(
      legalPage.generateMetadata({ params: { policy: "inventada" } }),
    ).toMatchObject({
      robots: { index: false },
    });
  });

  it("keeps drafts out of a build: not prerendered and not found", async () => {
    asProductionBuild();

    const published = legalPage
      .generateStaticParams()
      .map((item) => item.policy);

    for (const doc of documents) {
      if (doc.draft) {
        expect(published).not.toContain(doc.slug);
        await expect(
          legalPage.default({ params: { policy: doc.slug } }),
        ).rejects.toMatchObject(NOT_FOUND);
      } else {
        expect(published).toContain(doc.slug);
      }
    }
  });

  it("gives each document its own canonical", () => {
    asDevelopment();

    for (const doc of documents) {
      const metadata = legalPage.generateMetadata({
        params: { policy: doc.slug },
      });

      expect(metadata.alternates?.canonical).toBe(`/legal/${doc.slug}`);
      expect(metadata.title).toBe(doc.title);
      // What a search result shows, template included.
      expect(`${metadata.title} | Trajetto`.length).toBeLessThanOrEqual(60);
    }
  });
});

describe("/blog/[slug]", () => {
  const posts = loadAllPosts();

  it("prerenders only the known posts", () => {
    expect(blogPostPage.dynamicParams).toBe(false);
  });

  it.each(posts.map((item) => [item.slug, item] as const))(
    "renders /blog/%s with one h1, JSON-LD and the body",
    async (slug, item) => {
      asDevelopment();

      const html = renderHtml(await blogPostPage.default({ params: { slug } }));

      expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
      expect(html).toContain(item.title);
      expect(html).toContain('"@type":"BlogPosting"');
      expect(html).toContain('"@type":"BreadcrumbList"');
      expect(html).toContain(`${ORIGIN}/blog/${slug}`);
    },
  );

  it("is a real not-found for an unknown slug", async () => {
    asDevelopment();

    await expect(
      blogPostPage.default({ params: { slug: "nao-existe" } }),
    ).rejects.toMatchObject(NOT_FOUND);
  });

  it("keeps draft posts out of a build", async () => {
    asProductionBuild();

    const published = blogPostPage
      .generateStaticParams()
      .map((item) => item.slug);

    for (const item of posts.filter((meta) => meta.draft)) {
      expect(published).not.toContain(item.slug);
      await expect(
        blogPostPage.default({ params: { slug: item.slug } }),
      ).rejects.toMatchObject(NOT_FOUND);
      // No social card for it either.
      expect(() =>
        blogOgImage.default({ params: { slug: item.slug } }),
      ).toThrow(expect.objectContaining(NOT_FOUND));
    }
  });

  it("keeps every post's search title within 60 characters, template included", () => {
    asDevelopment();

    for (const item of posts) {
      const { title } = blogPostPage.generateMetadata({
        params: { slug: item.slug },
      });

      expect(typeof title).toBe("string");
      expect(`${title} | Trajetto`.length, item.file).toBeLessThanOrEqual(60);
    }
  });

  it("leaves og:image to the generated card instead of shadowing it", () => {
    asDevelopment();

    for (const item of posts) {
      const metadata = blogPostPage.generateMetadata({
        params: { slug: item.slug },
      });

      // Next only merges ./opengraph-image when the page's openGraph and
      // twitter have no `images` key at all.
      expect(metadata.openGraph).not.toHaveProperty("images");
      expect(metadata.twitter).not.toHaveProperty("images");
      expect(metadata.openGraph).toMatchObject({
        type: "article",
        siteName: "Trajetto",
        locale: "pt_BR",
        url: `/blog/${item.slug}`,
      });
    }
  });
});

describe("sitemap.xml", () => {
  it("lists the public pages on the canonical origin, and never a page with a token", () => {
    asProductionBuild();

    const urls = sitemap().map((entry) => entry.url);

    for (const page of PUBLIC_PAGES) {
      expect(urls).toContain(
        page.path === "/" ? `${ORIGIN}/` : `${ORIGIN}${page.path}`,
      );
    }

    expect(urls.every((url) => url.startsWith(`${ORIGIN}/`))).toBe(true);
    expect(urls).toContain(`${ORIGIN}/login`);
    expect(urls).toContain(`${ORIGIN}/forgot`);
    expect(
      urls.some((url) => /\/(forgot\/|new-verification|verificar)/.test(url)),
    ).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("leaves drafts out of a build", () => {
    asProductionBuild();

    const urls = sitemap().map((entry) => entry.url);

    for (const item of loadAllPosts().filter((meta) => meta.draft)) {
      expect(urls).not.toContain(`${ORIGIN}/blog/${item.slug}`);
    }
    for (const doc of loadLegalDocuments().filter((meta) => meta.draft)) {
      expect(urls).not.toContain(`${ORIGIN}/legal/${doc.slug}`);
    }
  });

  it("dates posts and legal pages by their content, not by the request", () => {
    asDevelopment();

    const entries = new Map(sitemap().map((entry) => [entry.url, entry]));

    for (const item of loadAllPosts()) {
      expect(entries.get(`${ORIGIN}/blog/${item.slug}`)?.lastModified).toEqual(
        new Date(`${item.updated ?? item.date}T00:00:00Z`),
      );
    }
    for (const doc of loadLegalDocuments()) {
      expect(entries.get(`${ORIGIN}/legal/${doc.slug}`)?.lastModified).toEqual(
        new Date(`${doc.updatedAt}T00:00:00Z`),
      );
    }

    // No content date, no lastmod: "today" on every crawl teaches Google to
    // ignore the field.
    expect(entries.get(`${ORIGIN}/sobre`)).not.toHaveProperty("lastModified");
  });
});

describe("feed.xml", () => {
  it("is RSS with one escaped item per visible post", async () => {
    asDevelopment();

    const response = feed();
    const xml = await response.text();

    expect(response.headers.get("content-type")).toContain(
      "application/rss+xml",
    );
    expect(xml).toContain(`<atom:link href="${ORIGIN}/feed.xml"`);

    for (const item of loadAllPosts()) {
      expect(xml).toContain(`<link>${ORIGIN}/blog/${item.slug}</link>`);
    }
    expect(xml).not.toMatch(/<title>[^<]*&(?!amp;|lt;|gt;|quot;|apos;)/);
  });
});

describe("JSON-LD", () => {
  it("cannot close its script tag, whatever a title holds", () => {
    const serialized = serializeJsonLd({
      headline: "</script><script>alert(1)</script>",
    });

    expect(serialized).not.toContain("</script>");
    expect(JSON.parse(serialized).headline).toBe(
      "</script><script>alert(1)</script>",
    );
  });
});
