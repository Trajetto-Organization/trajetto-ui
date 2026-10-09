// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { React, renderHtml } from "./helpers/render-html";
import { requestDataChains } from "./helpers/request-data-chains";

import * as appPage from "@/app/app-do-motorista/page";
import sitemap from "@/app/sitemap";

import { APP_FAQ, FEATURES, STORY } from "@/components/site/app-page";
import { PHONE_SCREENS } from "@/components/site/phone-mockup";

import { FOOTER_SECTIONS, PUBLIC_PAGES } from "@/lib/public-pages";

vi.mock("@/components/site/site-header", () => ({ SiteHeader: () => null }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string | { src: string }; alt: string }) =>
    React.createElement("img", {
      src: typeof src === "string" ? src : src.src,
      alt,
    }),
}));

/** /app-do-motorista: the driver app page (design: Trajetto App). */
const ORIGIN = "https://www.intrajetto.com";
const PATH = "/app-do-motorista";
const FILE = "src/app/app-do-motorista/page.tsx";

beforeEach(() => {
  vi.stubEnv("METADATA_BASE", ORIGIN);
  vi.stubEnv("NODE_ENV", "development");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const render = () => renderHtml(React.createElement(appPage.default));

function graphNode(
  html: string,
  type: string,
): Record<string, unknown> | undefined {
  return [
    ...html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ]
    .map((match) => JSON.parse(match[1]) as Record<string, unknown>)
    .flatMap(
      (block) =>
        (block["@graph"] as Record<string, unknown>[] | undefined) ?? [block],
    )
    .find((node) => node["@type"] === type);
}

describe(PATH, () => {
  it("owns its canonical and a title that fits a search result", () => {
    const { metadata } = appPage;

    expect(metadata.alternates?.canonical).toBe(PATH);
    expect(`${metadata.title} | Trajetto`.length).toBeLessThanOrEqual(60);

    const description = metadata.description ?? "";
    expect(description.length).toBeGreaterThanOrEqual(70);
    expect(description.length).toBeLessThanOrEqual(160);

    expect(metadata.openGraph).toMatchObject({
      url: PATH,
      siteName: "Trajetto",
      locale: "pt_BR",
    });
  });

  it("renders one h1 inside one main, and every section is labelled", () => {
    const html = render();

    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html.match(/<main[\s>]/g)).toHaveLength(1);
    for (const id of [
      "app-titulo",
      "telas-titulo",
      "offline-titulo",
      "recursos-titulo",
      "faq-titulo",
      "cta-titulo",
    ]) {
      expect(html).toContain(`aria-labelledby="${id}"`);
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("shows every step, feature and question in the server HTML", () => {
    const html = render();

    for (const step of STORY) expect(html).toContain(step.title);
    for (const feature of FEATURES) expect(html).toContain(feature.title);
    for (const item of APP_FAQ) {
      expect(html).toContain(item.question);
      expect(html).toContain(item.answer);
    }
    // No step starts dimmed before the scroll is tracked.
    expect(html).not.toContain("opacity-[.28]");
  });

  it("only uses phone screens the mockup draws", () => {
    for (const step of STORY) expect(PHONE_SCREENS).toContain(step.screen);
  });

  it("starts the offline demo with the signal off, as a real switch", () => {
    const html = render();

    expect(html).toMatch(
      /role="switch"[^>]*aria-checked="false"|aria-checked="false"[^>]*role="switch"/,
    );
    expect(html).toContain("PENDENTE");
  });

  it("describes the Android app to search engines, claiming nothing the page does not show", () => {
    const html = render();
    const app = graphNode(html, "MobileApplication");
    const faqPage = graphNode(html, "FAQPage");

    expect(app).toMatchObject({
      url: `${ORIGIN}${PATH}`,
      operatingSystem: "Android",
      applicationCategory: "BusinessApplication",
    });
    expect(app?.featureList).toEqual(FEATURES.map((feature) => feature.title));
    expect(app).not.toHaveProperty("offers");
    expect(app).not.toHaveProperty("aggregateRating");
    expect(graphNode(html, "WebPage")).toMatchObject({
      url: `${ORIGIN}${PATH}`,
    });
    expect(
      (faqPage?.mainEntity as { name: string }[]).map((item) => item.name),
    ).toEqual(APP_FAQ.map((item) => item.question));
  });

  it("is listed in the sitemap and the footer's Produtos column", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(PUBLIC_PAGES.map((page) => page.path)).toContain(PATH);
    expect(sitemap().map((entry) => entry.url)).toContain(`${ORIGIN}${PATH}`);
    const products = FOOTER_SECTIONS.find(
      (section) => section.title === "Produtos",
    );
    expect(products?.links.map((link) => link.href)).toContain(PATH);
  });

  it("stays a static page with no request data in its import tree", () => {
    const source = readFileSync(resolve(process.cwd(), FILE), "utf8");

    expect(source).not.toMatch(/export const dynamic\s*=/);
    expect(source).not.toMatch(/\bsearchParams\b|next\/headers/);
    expect(requestDataChains(FILE)).toEqual([]);
  });
});
