// @vitest-environment node
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { React, renderHtml } from "./helpers/render-html";

import { Map as CoverageMap } from "@/components/contact-form/map";
import ContactPage from "@/app/contato/page";

vi.mock("@/components/site/site-header", () => ({ SiteHeader: () => null }));

/**
 * "Onde atendemos" on /contact (PUB-14).
 *
 * It was a Leaflet map with OpenStreetMap tiles whose only job was to show
 * the centre of Brazil: the Leaflet bundle, its CSS and a dozen tile requests
 * for every visitor, each one handing the visitor's IP to a server in the
 * United Kingdom (privacy policy §3 and §13). It is now an illustration drawn
 * on the server, with no JavaScript and no third-party request.
 */
const ROOT = process.cwd();
const SRC = resolve(ROOT, "src");
const EXTENSIONS = [".tsx", ".ts", "/index.tsx", "/index.ts"];

function resolveLocal(from: string, specifier: string): string | null {
  let base: string;

  if (specifier.startsWith("@/")) base = join(SRC, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(from), specifier);
  else return null;

  if (existsSync(base) && statSync(base).isFile())
    return /\.(ts|tsx)$/.test(base) ? base : null;

  for (const extension of EXTENSIONS) {
    if (existsSync(`${base}${extension}`)) return `${base}${extension}`;
  }

  return null;
}

/** Static and dynamic (`import("…")`) specifiers, type-only imports aside. */
function specifiersOf(source: string): string[] {
  const statics = [
    ...source.matchAll(
      /(?:^|\n)\s*(import|export)\s+(type\s+)?(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g,
    ),
  ]
    .filter((match) => !match[2])
    .map((match) => match[3]);
  const dynamics = [
    ...source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g),
  ].map((match) => match[1]);

  return [...statics, ...dynamics];
}

/** Every local file and every package the page can load, through any import. */
function importGraph(entry: string): { files: string[]; packages: string[] } {
  const files = new Set<string>();
  const packages = new Set<string>();

  const visit = (file: string) => {
    if (files.has(file)) return;
    files.add(file);

    for (const specifier of specifiersOf(readFileSync(file, "utf8"))) {
      const local = resolveLocal(file, specifier);

      if (local) visit(local);
      else if (!specifier.startsWith(".") && !specifier.startsWith("@/"))
        packages.add(specifier);
    }
  };

  visit(resolve(ROOT, entry));

  return {
    files: [...files].map((file) => relative(ROOT, file).replace(/\\/g, "/")),
    packages: [...packages],
  };
}

describe("the where-we-serve map, on /contact", () => {
  const graph = importGraph("src/app/contato/page.tsx");

  it("does not load Leaflet by any path", () => {
    expect(
      graph.packages.filter((name) => /^leaflet(\/|$)/.test(name)),
    ).toEqual([]);
  });

  it("does not request map imagery from third parties", () => {
    const offenders = graph.files.filter((file) =>
      /tile\.openstreetmap\.org|basemaps\.cartocdn\.com|\btileLayer\(/.test(
        readFileSync(resolve(ROOT, file), "utf8"),
      ),
    );

    expect(offenders).toEqual([]);
  });

  it("is drawn on the server and ships no JavaScript of its own", () => {
    const entry = "src/components/contact-form/map/index.tsx";
    const source = readFileSync(resolve(ROOT, entry), "utf8");

    expect(source).not.toMatch(/^\s*["']use client["']/);

    // The only client code it reaches is the site Reveal, which every public
    // page already ships: it flips the attribute that starts the motion.
    const clientModules = importGraph(entry).files.filter((file) =>
      /^\s*["']use client["']/.test(readFileSync(resolve(ROOT, file), "utf8")),
    );

    expect(clientModules).toEqual(["src/components/site/reveal.tsx"]);
  });

  it("arrives ready in the HTML: a named illustration and the service details", () => {
    const html = renderHtml(React.createElement(CoverageMap));

    expect(html).not.toMatch(/Carregando o mapa/);
    expect(html).toMatch(/<svg[^>]*role="img"[^>]*aria-labelledby="([^"]+)"/);

    const titleId = /<svg[^>]*aria-labelledby="([^"]+)"/.exec(html)![1];
    expect(html).toMatch(
      new RegExp(`<title id="${titleId}">[^<]*todo o Brasil[^<]*</title>`),
    );

    for (const text of [
      "Atendimento",
      "100% digital",
      "Cobertura",
      "Todo o território nacional",
      "Horário",
    ]) {
      expect(html).toContain(text);
    }

    // No request leaves the page for it: no URL at all in the markup.
    expect(html).not.toMatch(/(?:src|href)="https?:/);
  });

  it("the /contact page renders entirely on the server, with the map and the form", () => {
    const html = renderHtml(React.createElement(ContactPage));

    expect(html).toContain('id="contact-coverage-title"');
    expect(html).toContain('id="contact-privacy-notice"');
    expect(html).not.toMatch(/leaflet/i);
  });

  // The map's own title already said "frotas e entregas"; the line above it
  // still spoke of fleets only (the product has both modules).
  it("the where-we-serve text mentions both modules", () => {
    const html = renderHtml(React.createElement(ContactPage));

    expect(html).toContain(
      "Operação 100% digital, para frotas e entregas em todo o Brasil",
    );
  });
});
