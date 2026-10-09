import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { Lead, SectionHeading } from "@/components/site/primitives";

/**
 * The site's type primitives set size and line-height as separate classes
 * (`text-[clamp(…)]` + `leading-[…]`). Stock tailwind-merge treats a font
 * size as overriding any earlier leading-*, so a caller that changed only the
 * size silently lost the design's line-height. primitives.tsx merges with a
 * local tailwind-merge that keeps it.
 */
(globalThis as { React?: typeof React }).React = React;

function classesOf(element: React.ReactElement): string[] {
  const html = renderToStaticMarkup(element);
  return (/class="([^"]*)"/.exec(html)?.[1] ?? "").split(/\s+/).filter(Boolean);
}

describe("site type primitives", () => {
  it("a heading keeps its line-height when the caller changes only the size", () => {
    const classes = classesOf(
      React.createElement(
        SectionHeading,
        { className: "text-[clamp(34px,4.2vw,56px)]" },
        "Título",
      ),
    );

    expect(classes).toContain("text-[clamp(34px,4.2vw,56px)]");
    expect(classes).not.toContain("text-[clamp(34px,4.4vw,58px)]");
    expect(classes).toContain("leading-[1.02]");
  });

  it("a caller's own leading still wins, and a repeated one is not doubled", () => {
    const overridden = classesOf(
      React.createElement(
        SectionHeading,
        { size: "xl", className: "text-[44px] leading-[1.1]" },
        "Título",
      ),
    );
    expect(overridden.filter((name) => name.startsWith("leading-"))).toEqual([
      "leading-[1.1]",
    ]);

    // Callers that re-add the default (written before the merge was fixed)
    // end up with the same single class.
    const repeated = classesOf(
      React.createElement(
        SectionHeading,
        { className: "text-[clamp(34px,4vw,54px)] leading-[1.02]" },
        "Título",
      ),
    );
    expect(repeated.filter((name) => name.startsWith("leading-"))).toEqual([
      "leading-[1.02]",
    ]);
  });

  it("a lead keeps line-height 1.6 under a size of the caller", () => {
    const classes = classesOf(
      React.createElement(Lead, { className: "text-[19px]" }, "Texto"),
    );

    expect(classes).toContain("text-[19px]");
    expect(classes).not.toContain("text-[17px]");
    expect(classes.filter((name) => name.startsWith("leading-"))).toEqual([
      "leading-[1.6]",
    ]);
  });
});

/**
 * tailwindcss-animate defines `duration-*` and `delay-*` for animations too,
 * so Tailwind finds `duration-[400ms]` ambiguous, warns, and emits nothing:
 * 31 transitions of the redesign ran at the default 150ms that way. The
 * arbitrary property (`[transition-duration:400ms]`) says which one.
 */
describe("arbitrary transition timings", () => {
  const SRC = resolve(process.cwd(), "src");

  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return sources(full);
      return /\.(ts|tsx)$/.test(name) ? [full] : [];
    });
  }

  it("never use the ambiguous duration-[…] / delay-[…] form", () => {
    const offenders = sources(SRC).flatMap((file) =>
      [
        ...readFileSync(file, "utf8").matchAll(
          /(?:^|[\s"'`:])((?:duration|delay)-\[[^\]]+\])/g,
        ),
      ].map((match) => `${relative(SRC, file)}: ${match[1]}`),
    );

    expect(offenders).toEqual([]);
  });
});
