// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import {
  FOOTER_SECTIONS,
  PUBLIC_NAV_LINKS,
  PUBLIC_PAGES,
} from "@/lib/public-pages";

/**
 * Decision 16.20: the institutional pages live at Portuguese slugs. The old
 * English paths only answer with a 308 (next.config.mjs), so a link still
 * pointing at one costs every visitor and crawler an extra round trip and
 * splits the page's ranking between two URLs.
 */
const SRC = join(process.cwd(), "src");
const LEGACY = /["'`(]\/(about|contact|quote)(?=["'`)#?])/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|mdx?)$/.test(name) ? [path] : [];
  });
}

describe("public slugs", () => {
  it("lists the institutional pages under their Portuguese paths", () => {
    const paths = PUBLIC_PAGES.map((page) => page.path);

    expect(paths).toEqual(
      expect.arrayContaining(["/sobre", "/contato", "/orcamento"]),
    );
    expect(
      paths.filter((path) => ["/about", "/contact", "/quote"].includes(path)),
    ).toEqual([]);

    const linked = [
      ...PUBLIC_NAV_LINKS.map((link) => link.href),
      ...FOOTER_SECTIONS.flatMap((section) =>
        section.links.map((link) => link.href),
      ),
    ];
    expect(linked).toEqual(
      expect.arrayContaining(["/sobre", "/contato", "/orcamento"]),
    );
  });

  it("has no internal link left on an old English path", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => LEGACY.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
