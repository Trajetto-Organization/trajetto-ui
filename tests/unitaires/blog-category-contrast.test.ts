import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { BLOG_CATEGORIES } from "@/content/blog/categories";

import { WHITE, contrast, hexToRgb, hslToRgb } from "./helpers/contrast";

/**
 * A blog category's colour is also the colour of its NAME, in 12px text, on
 * the post cards and on the post's badge — in both themes.
 *
 * Found by tests/a11y/admin-and-public.spec.ts (axe color-contrast on /blog,
 * dark theme): the light-theme hexes sat on the dark card at 2.9–3.3:1
 * ("Gestão de entregas" #d81b60 3.32, "Gestão de frotas" #2563eb 3.18), and
 * the teal of "Operação em campo" was 3.74:1 on the white card. Each category
 * now names a colour per theme, held here to the 4.5:1 of WCAG AA.
 */
const CSS = readFileSync(
  resolve(__dirname, "../../src/app/globals.css"),
  "utf8",
);

/** The dark theme's `--card`, where the cards are drawn. */
function darkCard(): [number, number, number] {
  const block = CSS.slice(
    CSS.indexOf(".dark"),
    CSS.indexOf("}", CSS.indexOf(".dark")),
  );
  const match = /--card:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(block);

  expect(match, "--card não está no tema escuro").not.toBeNull();

  return hslToRgb([Number(match![1]), Number(match![2]), Number(match![3])]);
}

describe("the blog category colours", () => {
  for (const category of Object.values(BLOG_CATEGORIES)) {
    it(`${category.title}: readable on the light and the dark card`, () => {
      const light = contrast(hexToRgb(category.color), WHITE);
      const dark = contrast(hexToRgb(category.darkColor), darkCard());

      expect(light, `tema claro ${light.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(dark, `tema escuro ${dark.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        4.5,
      );
    });
  }
});

/**
 * The public pages paint a category through the `--site-cat-*` tokens and
 * the post's OG image reads `color` from the config. Both come from the
 * design palette; a change to one side alone would show one colour on the
 * page and another in the shared link.
 */
describe("the category colours and the site tokens", () => {
  /** `--site-cat-<slug>` (RGB channels) from the first block that opens with `selector`. */
  function siteToken(selector: string, slug: string): string {
    const start = CSS.search(
      new RegExp(
        `(?:^|\\n)${selector.replace(".", "\\.")}\\s*\\{[^}]*--site-cat-`,
      ),
    );
    expect(start, `bloco ${selector} com --site-cat-*`).toBeGreaterThanOrEqual(
      0,
    );

    const block = CSS.slice(start, CSS.indexOf("}", start));
    const match = new RegExp(
      `--site-cat-${slug}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s*;`,
    ).exec(block);
    expect(match, `--site-cat-${slug} em ${selector}`).not.toBeNull();

    return `#${match!
      .slice(1, 4)
      .map((channel) => Number(channel).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  for (const category of Object.values(BLOG_CATEGORIES)) {
    it(`${category.title}: the same colour on the page and on the share image`, () => {
      expect(category.color.toLowerCase()).toBe(
        siteToken(":root", category.slug),
      );
      expect(category.darkColor.toLowerCase()).toBe(
        siteToken(".dark", category.slug),
      );
    });
  }
});
