// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { React, renderHtml } from "./helpers/render-html";
import { requestDataChains } from "./helpers/request-data-chains";

import * as fleetPage from "@/app/gestao-de-frotas/page";
import * as deliveryPage from "@/app/gestao-de-entregas/page";
import sitemap from "@/app/sitemap";

import { DELIVERY_FAQ, FLEET_FAQ } from "@/components/site/product/content";

import {
  FOOTER_SECTIONS,
  PUBLIC_NAV_LINKS,
  PUBLIC_PAGES,
  PUBLIC_PRODUCT_LINKS,
} from "@/lib/public-pages";

vi.mock("@/components/site/site-header", () => ({ SiteHeader: () => null }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string | { src: string }; alt: string }) =>
    React.createElement("img", {
      src: typeof src === "string" ? src : src.src,
      alt,
    }),
}));

/**
 * /gestao-de-frotas and /gestao-de-entregas: one page per module, so the
 * landing can stay short and each module can rank for its own searches.
 */
const ORIGIN = "https://www.intrajetto.com";

beforeEach(() => {
  vi.stubEnv("METADATA_BASE", ORIGIN);
  vi.stubEnv("NODE_ENV", "development");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const PRODUCTS = [
  {
    path: "/gestao-de-frotas",
    module: fleetPage,
    faq: FLEET_FAQ,
    file: "src/app/gestao-de-frotas/page.tsx",
  },
  {
    path: "/gestao-de-entregas",
    module: deliveryPage,
    faq: DELIVERY_FAQ,
    file: "src/app/gestao-de-entregas/page.tsx",
  },
] as const;

/** Every JSON-LD block of a page, parsed. */
function jsonLd(html: string): Record<string, unknown>[] {
  return [
    ...html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ].map((match) => JSON.parse(match[1]) as Record<string, unknown>);
}

function graphNode(
  html: string,
  type: string,
): Record<string, unknown> | undefined {
  return jsonLd(html)
    .flatMap(
      (block) =>
        (block["@graph"] as Record<string, unknown>[] | undefined) ?? [block],
    )
    .find((node) => node["@type"] === type);
}

describe.each(PRODUCTS)("$path", ({ path, module, faq, file }) => {
  const render = () => renderHtml(React.createElement(module.default));

  it("owns its canonical and a title that fits a search result", () => {
    const { metadata } = module;

    expect(metadata.alternates?.canonical).toBe(path);
    expect(typeof metadata.title).toBe("string");
    expect(`${metadata.title} | Trajetto`.length).toBeLessThanOrEqual(60);

    const description = metadata.description ?? "";
    expect(description.length).toBeGreaterThanOrEqual(70);
    expect(description.length).toBeLessThanOrEqual(160);

    expect(metadata.openGraph).toMatchObject({
      url: path,
      siteName: "Trajetto",
      locale: "pt_BR",
    });
  });

  it("renders one h1 inside one main", () => {
    const html = render();

    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html.match(/<main[\s>]/g)).toHaveLength(1);
  });

  it("describes itself to search engines on the canonical origin", () => {
    const html = render();
    const software = graphNode(html, "SoftwareApplication");
    const breadcrumb = graphNode(html, "BreadcrumbList");
    const page = graphNode(html, "WebPage");

    expect(software).toMatchObject({
      url: `${ORIGIN}${path}`,
      applicationCategory: "BusinessApplication",
    });
    expect((software?.featureList as string[]).length).toBeGreaterThan(3);
    expect(page).toMatchObject({ url: `${ORIGIN}${path}` });
    expect(breadcrumb?.itemListElement).toEqual([
      expect.objectContaining({ position: 1, item: `${ORIGIN}/` }),
      expect.objectContaining({ position: 2, item: `${ORIGIN}${path}` }),
    ]);
    // Structured data may only say what the page shows.
    expect(software).not.toHaveProperty("offers");
    expect(software).not.toHaveProperty("aggregateRating");
  });

  it("marks up exactly the questions it shows", () => {
    const html = render();
    const faqPage = graphNode(html, "FAQPage");
    const questions = (faqPage?.mainEntity as { name: string }[]).map(
      (item) => item.name,
    );

    expect(questions).toEqual(faq.map((item) => item.question));
    for (const item of faq) {
      expect(html).toContain(item.question);
    }
  });

  it("is listed in the sitemap, the Produtos menu and the footer", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(sitemap().map((entry) => entry.url)).toContain(`${ORIGIN}${path}`);
    expect(PUBLIC_PRODUCT_LINKS.map((link) => link.href)).toContain(path);

    const products = FOOTER_SECTIONS.find(
      (section) => section.title === "Produtos",
    );
    expect(products?.links.map((link) => link.href)).toContain(path);
  });

  it("stays a static page", () => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");

    expect(source).not.toMatch(/export const dynamic\s*=/);
    expect(source).not.toMatch(/export const revalidate\s*=\s*0\b/);
    expect(source).not.toMatch(/\bsearchParams\b|next\/headers/);
  });

  it("reads no request data anywhere in its import tree", () => {
    // The page pulls in the demos, the tabs and the phone; a cookie
    // read in any of them would make it dynamic without a sound.
    expect(requestDataChains(file)).toEqual([]);
  });
});

describe("the request-data walk", () => {
  it("does see a cookie read, so an empty result means something", () => {
    expect(
      requestDataChains("src/app/(protected)/layout.tsx").length,
    ).toBeGreaterThan(0);
  });
});

describe("the product page's interactive parts render their final state on the server", () => {
  const fleet = renderHtml(React.createElement(fleetPage.default));
  const delivery = renderHtml(React.createElement(deliveryPage.default));

  it("each page shows its own dark-band demo, with an accessible control", () => {
    expect(fleet).toContain("A IA lê o odômetro e confere o que foi digitado.");
    expect(fleet).toMatch(
      /role="radiogroup" aria-label="Simular abastecimento"/,
    );
    expect(fleet).not.toContain("Um comprovante que qualquer pessoa confere.");

    expect(delivery).toContain("Um comprovante que qualquer pessoa confere.");
    expect(delivery).toMatch(/role="radiogroup" aria-label="Simular arquivo"/);
    expect(delivery).not.toContain("A IA lê o odômetro");
  });

  it("the driver-app tabs are a tablist that controls the phone", () => {
    for (const html of [fleet, delivery]) {
      expect(html).toMatch(
        /role="tablist" aria-label="Telas do app do motorista"/,
      );
      expect(html.match(/role="tab"/g)).toHaveLength(3);
      expect(html).toMatch(/role="tabpanel"/);
    }
  });

  it("the first question starts open and every answer is in the HTML", () => {
    for (const html of [fleet, delivery]) {
      expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
    }
    for (const item of [...FLEET_FAQ]) expect(fleet).toContain(item.answer);
    for (const item of [...DELIVERY_FAQ])
      expect(delivery).toContain(item.answer);
  });

  it("links to the other module and to the driver app page", () => {
    expect(fleet).toContain('href="/gestao-de-entregas"');
    expect(delivery).toContain('href="/gestao-de-frotas"');
    for (const html of [fleet, delivery])
      expect(html).toContain('href="/app-do-motorista"');
  });
});

describe("the public navigation", () => {
  it("offers both product pages and never a page that is not public", () => {
    const paths = new Set(PUBLIC_PAGES.map((page) => page.path));

    for (const link of [...PUBLIC_NAV_LINKS, ...PUBLIC_PRODUCT_LINKS]) {
      const [pathname] = link.href.split("#");
      expect(paths.has(pathname || "/"), link.href).toBe(true);
    }

    expect(PUBLIC_PRODUCT_LINKS.slice(0, 2).map((link) => link.href)).toEqual([
      "/gestao-de-frotas",
      "/gestao-de-entregas",
    ]);
  });
});
