import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// Puts React in scope for the classic-runtime JSX of the modules below.
import { React, renderHtml } from "./helpers/render-html";

import { MovingArrow } from "@/components/site/arrow-link";

void React;

/**
 * The site's moving arrow: on hover and on keyboard focus of the link that
 * carries `group/arrow`, a forward arrow slides right and a back arrow
 * slides left; with reduced motion, neither moves. The article's "← Blog"
 * had a still arrow, while "Todos os artigos →" on the same page moved.
 */
const classesOf = (html: string) =>
  (/class="([^"]+)"/.exec(html)?.[1] ?? "").split(/\s+/);

describe("MovingArrow", () => {
  it("points forward and slides right by default", () => {
    const classes = classesOf(renderHtml(<MovingArrow />));

    expect(classes).toContain("lucide-arrow-right");
    expect(classes).toContain("group-hover/arrow:translate-x-1");
    expect(classes).toContain("group-focus-visible/arrow:translate-x-1");
    expect(classes).toContain("motion-reduce:!translate-x-0");
  });

  it("points back and slides left when it returns", () => {
    const classes = classesOf(renderHtml(<MovingArrow direction="back" />));

    expect(classes).toContain("lucide-arrow-left");
    expect(classes).toContain("group-hover/arrow:-translate-x-1");
    expect(classes).toContain("group-focus-visible/arrow:-translate-x-1");
    expect(classes).not.toContain("group-hover/arrow:translate-x-1");
    expect(classes).toContain("motion-reduce:!translate-x-0");
  });

  it("stays out of the accessible name", () => {
    expect(renderHtml(<MovingArrow direction="back" />)).toContain(
      'aria-hidden="true"',
    );
  });
});

describe("the article's way back to the blog", () => {
  const page = readFileSync(
    resolve(__dirname, "../../src/app/blog/[slug]/page.tsx"),
    "utf8",
  ).replace(/\r\n/g, "\n");

  it("moves its arrow like every other site link", () => {
    const link =
      /<Link\n\s+href="\/blog"\n\s+className="([^"]+)"\n\s+>\n\s+(<[^\n]+)\n\s+Blog\n/.exec(
        page,
      );

    expect(link, 'o link "Blog" da trilha').not.toBeNull();
    expect(link![1].split(/\s+/)).toContain("group/arrow");
    expect(link![2]).toBe('<MovingArrow direction="back" size={15} />');
  });

  it("has no still arrow left", () => {
    expect(page).not.toMatch(/<ArrowLeft\b/);
  });
});
